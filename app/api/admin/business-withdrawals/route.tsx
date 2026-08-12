import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";
import crypto from "crypto";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // ADMIN AUTHENTICATION
    // ==========================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 }
      );
    }

    if (admin.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin account is not active.",
        },
        { status: 403 }
      );
    }

    // ==========================================
    // GET REQUEST BODY
    // ==========================================

    const body = await req.json();

    const amount = Number(body?.amount);

    const accountName =
      typeof body?.accountName === "string"
        ? body.accountName.trim()
        : "";

    const accountNumber =
      typeof body?.accountNumber === "string"
        ? body.accountNumber.trim()
        : "";

    const bankName =
      typeof body?.bankName === "string"
        ? body.bankName.trim()
        : "";

    const bankCode =
      typeof body?.bankCode === "string"
        ? body.bankCode.trim()
        : "";

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    if (!accountName) {
      return NextResponse.json(
        {
          success: false,
          message: "Account name is required.",
        },
        { status: 400 }
      );
    }

    if (!accountNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Account number is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          success: false,
          message: "Account number must contain 10 digits.",
        },
        { status: 400 }
      );
    }

    if (!bankName) {
      return NextResponse.json(
        {
          success: false,
          message: "Bank name is required.",
        },
        { status: 400 }
      );
    }

    if (!bankCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Bank code is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // PAYSTACK SECRET
    // ==========================================

    const secretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Paystack configuration is missing.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // GET BUSINESS WALLET
    // ==========================================

    const businessWallet =
      await prisma.businessWallet.findUnique({
        where: {
          name: "Brainfriend Tech",
        },
      });

    if (!businessWallet) {
      return NextResponse.json(
        {
          success: false,
          message: "Business wallet not found.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // CHECK AVAILABLE PROFIT
    // ==========================================

    if (
      amount >
      businessWallet.availableProfit
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Insufficient available profit. ` +
            `Available: ₦${businessWallet.availableProfit.toLocaleString(
              "en-NG"
            )}.`,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // PREVENT MULTIPLE PROCESSING WITH SAME
    // AMOUNT WHILE A TRANSFER IS PROCESSING
    // ==========================================

    const existingProcessing =
      await prisma.businessWithdrawal.findFirst({
        where: {
          status: "PROCESSING",
        },
      });

    if (existingProcessing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "There is already a business withdrawal being processed.",
          withdrawal: {
            id: existingProcessing.id,
            amount: existingProcessing.amount,
            reference:
              existingProcessing.reference,
            status:
              existingProcessing.status,
          },
        },
        { status: 409 }
      );
    }

    // ==========================================
    // GENERATE UNIQUE REFERENCE
    // ==========================================

    const reference =
      `BF-BW-${Date.now()}-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;

    // ==========================================
    // CREATE PAYSTACK TRANSFER RECIPIENT
    // ==========================================

    let recipientCode: string;

    try {
      const recipientResponse =
        await axios.post(
          "https://api.paystack.co/transferrecipient",
          {
            type: "nuban",
            name: accountName,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: "NGN",
          },
          {
            headers: {
              Authorization:
                `Bearer ${secretKey}`,
              "Content-Type":
                "application/json",
            },
          }
        );

      recipientCode =
        recipientResponse.data?.data?.recipient_code;

      if (!recipientCode) {
        throw new Error(
          "Paystack did not return a recipient code."
        );
      }
    } catch (error: any) {
      console.error(
        "PAYSTACK RECIPIENT ERROR:",
        error?.response?.data ||
          error?.message ||
          error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error?.response?.data?.message ||
            "Failed to create Paystack recipient.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // CREATE WITHDRAWAL RECORD
    // ==========================================
    //
    // IMPORTANT:
    //
    // WE DO NOT DEDUCT BUSINESS WALLET HERE.
    //
    // The actual accounting happens only after
    // Paystack sends transfer.success.
    //

    const withdrawal =
      await prisma.businessWithdrawal.create({
        data: {
          amount,

          accountName,

          accountNumber,

          bankName,

          recipientCode,

          reference,

          status: "PROCESSING",

          method: "PAYSTACK",

          adminNote:
            "Paystack transfer initiated. Waiting for transfer confirmation.",
        },
      });

    // ==========================================
    // INITIATE PAYSTACK TRANSFER
    // ==========================================

    try {
      const transferResponse =
        await axios.post(
          "https://api.paystack.co/transfer",
          {
            source: "balance",

            amount: Math.round(amount * 100),

            recipient: recipientCode,

            reason:
              `Brainfriend Tech profit withdrawal - ${reference}`,
          },
          {
            headers: {
              Authorization:
                `Bearer ${secretKey}`,
              "Content-Type":
                "application/json",
            },
          }
        );

      const transfer =
        transferResponse.data?.data;

      const transferCode =
        transfer?.transfer_code || null;

      // ==========================================
      // UPDATE WITH TRANSFER CODE
      // ==========================================

      const updatedWithdrawal =
        await prisma.businessWithdrawal.update({
          where: {
            id: withdrawal.id,
          },

          data: {
            transferCode,

            adminNote:
              transfer?.status
                ? `Paystack transfer initiated. Paystack status: ${transfer.status}.`
                : "Paystack transfer initiated. Waiting for confirmation.",
          },
        });

      // ==========================================
      // IMPORTANT
      // ==========================================
      //
      // NO BUSINESS WALLET ACCOUNTING HERE.
      //
      // The webhook will do:
      //
      // availableProfit -= amount
      // withdrawnProfit += amount
      // balance -= amount
      //
      // only when transfer.success arrives.
      //

      return NextResponse.json({
        success: true,

        message:
          "Business withdrawal initiated successfully. Waiting for Paystack confirmation.",

        withdrawal: {
          id: updatedWithdrawal.id,

          amount:
            updatedWithdrawal.amount,

          accountName:
            updatedWithdrawal.accountName,

          accountNumber:
            updatedWithdrawal.accountNumber,

          bankName:
            updatedWithdrawal.bankName,

          reference:
            updatedWithdrawal.reference,

          transferCode:
            updatedWithdrawal.transferCode,

          status:
            updatedWithdrawal.status,
        },

        businessWallet: {
          availableProfit:
            businessWallet.availableProfit,

          withdrawnProfit:
            businessWallet.withdrawnProfit,

          balance:
            businessWallet.balance,
        },
      });
    } catch (error: any) {
      console.error(
        "PAYSTACK TRANSFER ERROR:",
        error?.response?.data ||
          error?.message ||
          error
      );

      // ==========================================
      // MARK WITHDRAWAL FAILED
      // ==========================================

      await prisma.businessWithdrawal.update({
        where: {
          id: withdrawal.id,
        },

        data: {
          status: "FAILED",

          processedAt: new Date(),

          adminNote:
            error?.response?.data?.message ||
            error?.message ||
            "Paystack transfer failed.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            error?.response?.data?.message ||
            "Paystack transfer failed.",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error(
      "BUSINESS WITHDRAWAL ERROR:",
      error?.response?.data ||
        error?.message ||
        error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to process business withdrawal.",
      },
      { status: 500 }
    );
  }
}