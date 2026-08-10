import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// =========================================================
// HELPERS
// =========================================================

function generateReference() {
  return `BIZ-WD-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_BASE_URL =
  "https://api.paystack.co";

// =========================================================
// GET BUSINESS BALANCE + WITHDRAWAL HISTORY
// =========================================================

export async function GET() {
  try {
    // -------------------------------------------------------
    // ADMIN AUTHENTICATION
    // -------------------------------------------------------

    const session =
      await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------------
    // TOTAL PROFIT
    // -------------------------------------------------------

    const profitResult =
      await prisma.transaction.aggregate({
        _sum: {
          profit: true,
        },
        where: {
          status: "SUCCESS",
        },
      });

    const totalProfit =
      profitResult._sum.profit ?? 0;

    // -------------------------------------------------------
    // ALREADY WITHDRAWN
    // -------------------------------------------------------

    const withdrawnResult =
      await prisma.businessWithdrawal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: {
            in: [
              "PROCESSING",
              "SUCCESS",
            ],
          },
        },
      });

    const totalWithdrawn =
      withdrawnResult._sum.amount ?? 0;

    // -------------------------------------------------------
    // PENDING WITHDRAWALS
    // -------------------------------------------------------

    const pendingResult =
      await prisma.businessWithdrawal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PENDING",
        },
      });

    const pendingWithdrawals =
      pendingResult._sum.amount ?? 0;

    // -------------------------------------------------------
    // AVAILABLE BALANCE
    // -------------------------------------------------------

    const availableBalance =
      Math.max(
        totalProfit -
          totalWithdrawn -
          pendingWithdrawals,
        0
      );

    // -------------------------------------------------------
    // WITHDRAWAL HISTORY
    // -------------------------------------------------------

    const withdrawals =
      await prisma.businessWithdrawal.findMany({
        take: 20,
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,

      balance: {
        totalProfit,
        totalWithdrawn,
        pendingWithdrawals,
        availableBalance,
      },

      withdrawals,
    });
  } catch (error) {
    console.error(
      "BUSINESS WITHDRAWAL GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load business withdrawal information.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// CREATE BUSINESS WITHDRAWAL
// =========================================================

export async function POST(
  request: Request
) {
  try {
    // -------------------------------------------------------
    // ADMIN AUTHENTICATION
    // -------------------------------------------------------

    const session =
      await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------------
    // CHECK PAYSTACK CONFIGURATION
    // -------------------------------------------------------

    if (!PAYSTACK_SECRET_KEY) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack is not configured.",
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------
    // READ REQUEST BODY
    // -------------------------------------------------------

    let body: {
      amount?: number;
      accountName?: string;
      accountNumber?: string;
      bankName?: string;
      bankCode?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // NORMALIZE VALUES
    // -------------------------------------------------------

    const amount =
      Number(body.amount);

    const accountName =
      typeof body.accountName === "string"
        ? body.accountName.trim()
        : "";

    const accountNumber =
      typeof body.accountNumber === "string"
        ? body.accountNumber.trim()
        : "";

    const bankName =
      typeof body.bankName === "string"
        ? body.bankName.trim()
        : "";

    const bankCode =
      typeof body.bankCode === "string"
        ? body.bankCode.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    if (!accountName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Account name is required.",
        },
        { status: 400 }
      );
    }

    if (
      !/^\d{10}$/.test(accountNumber)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid 10-digit Nigerian bank account number.",
        },
        { status: 400 }
      );
    }

    if (!bankName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bank name is required.",
        },
        { status: 400 }
      );
    }

    if (!bankCode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bank code is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // GET TOTAL PROFIT
    // -------------------------------------------------------

    const profitResult =
      await prisma.transaction.aggregate({
        _sum: {
          profit: true,
        },
        where: {
          status: "SUCCESS",
        },
      });

    const totalProfit =
      profitResult._sum.profit ?? 0;

    // -------------------------------------------------------
    // GET ALREADY WITHDRAWN
    // -------------------------------------------------------

    const withdrawnResult =
      await prisma.businessWithdrawal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: {
            in: [
              "PROCESSING",
              "SUCCESS",
            ],
          },
        },
      });

    const totalWithdrawn =
      withdrawnResult._sum.amount ?? 0;

    // -------------------------------------------------------
    // GET PENDING
    // -------------------------------------------------------

    const pendingResult =
      await prisma.businessWithdrawal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PENDING",
        },
      });

    const pendingWithdrawals =
      pendingResult._sum.amount ?? 0;

    // -------------------------------------------------------
    // AVAILABLE BALANCE
    // -------------------------------------------------------

    const availableBalance =
      Math.max(
        totalProfit -
          totalWithdrawn -
          pendingWithdrawals,
        0
      );

    console.log(
      "=========================================="
    );

    console.log(
      "BUSINESS WITHDRAWAL REQUEST"
    );

    console.log(
      "TOTAL PROFIT:",
      totalProfit
    );

    console.log(
      "TOTAL WITHDRAWN:",
      totalWithdrawn
    );

    console.log(
      "PENDING:",
      pendingWithdrawals
    );

    console.log(
      "AVAILABLE:",
      availableBalance
    );

    console.log(
      "REQUESTED:",
      amount
    );

    console.log(
      "=========================================="
    );

    // -------------------------------------------------------
    // CHECK BALANCE
    // -------------------------------------------------------

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Insufficient available business balance.",
          availableBalance,
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // GENERATE REFERENCE
    // -------------------------------------------------------

    const reference =
      generateReference();

    // -------------------------------------------------------
    // CREATE PAYSTACK RECIPIENT
    // -------------------------------------------------------

    const recipientResponse =
      await fetch(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            type: "nuban",

            name: accountName,

            account_number:
              accountNumber,

            bank_code:
              bankCode,

            currency: "NGN",
          }),
        }
      );

    const recipientData =
      await recipientResponse.json();

    console.log(
      "PAYSTACK RECIPIENT RESPONSE:",
      recipientData
    );

    // -------------------------------------------------------
    // RECIPIENT CREATION FAILED
    // -------------------------------------------------------

    if (
      !recipientResponse.ok ||
      !recipientData.status ||
      !recipientData.data?.recipient_code
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            recipientData.message ||
            "Unable to create Paystack transfer recipient.",
        },
        { status: 400 }
      );
    }

    const recipientCode =
      recipientData.data.recipient_code;

    // -------------------------------------------------------
    // CREATE PENDING BUSINESS WITHDRAWAL
    // -------------------------------------------------------
    //
    // IMPORTANT:
    // bankCode is intentionally NOT stored here
    // because it does not exist in the Prisma model.
    //
    // It is only used to create the Paystack recipient.
    // -------------------------------------------------------

    const withdrawal =
      await prisma.businessWithdrawal.create({
        data: {
          amount,

          accountName,

          accountNumber,

          bankName,

          recipientCode,

          reference,

          status: "PENDING",

          method: "PAYSTACK",
        },
      });

    // -------------------------------------------------------
    // INITIATE PAYSTACK TRANSFER
    // -------------------------------------------------------

    const transferResponse =
      await fetch(
        `${PAYSTACK_BASE_URL}/transfer`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            source: "balance",

            amount:
              Math.round(amount * 100),

            recipient:
              recipientCode,

            reference,

            reason:
              "Brainfriend Tech business profit withdrawal",

            currency: "NGN",
          }),
        }
      );

    const transferData =
      await transferResponse.json();

    console.log(
      "PAYSTACK TRANSFER RESPONSE:",
      transferData
    );

    // -------------------------------------------------------
    // PAYSTACK TRANSFER FAILED
    // -------------------------------------------------------

    if (
      !transferResponse.ok ||
      !transferData.status
    ) {
      await prisma.businessWithdrawal.update({
        where: {
          id: withdrawal.id,
        },

        data: {
          status: "FAILED",

          adminNote:
            transferData.message ||
            "Paystack transfer failed.",

          processedAt:
            new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,

          error:
            transferData.message ||
            "Paystack transfer failed.",

          reference,
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // PROCESS PAYSTACK RESPONSE
    // -------------------------------------------------------

    const paystackTransfer =
      transferData.data;

    const transferStatus =
      String(
        paystackTransfer?.status || ""
      ).toLowerCase();

    const finalStatus =
      transferStatus === "success"
        ? "SUCCESS"
        : "PROCESSING";

    // -------------------------------------------------------
    // UPDATE WITHDRAWAL
    // -------------------------------------------------------

    const updatedWithdrawal =
      await prisma.businessWithdrawal.update({
        where: {
          id: withdrawal.id,
        },

        data: {
          status: finalStatus,

          transferCode:
            paystackTransfer?.transfer_code ||
            null,

          adminNote:
            transferData.message ||
            null,

          processedAt:
            finalStatus === "SUCCESS"
              ? new Date()
              : null,
        },
      });

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          finalStatus === "SUCCESS"
            ? "Withdrawal completed successfully."
            : "Withdrawal has been sent to Paystack for processing.",

        withdrawal:
          updatedWithdrawal,

        reference,

        transferCode:
          paystackTransfer?.transfer_code ||
          null,

        status: finalStatus,

        availableBalance:
          availableBalance - amount,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "BUSINESS WITHDRAWAL ERROR:"
    );

    console.error(
      error?.response?.data ||
        error
    );

    console.error(
      error?.message
    );

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Failed to process business withdrawal.",
      },
      { status: 500 }
    );
  }
}