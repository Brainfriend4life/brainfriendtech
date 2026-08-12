import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // AUTHENTICATION
    // ==========================================

    const session =
      await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // GET REFERENCE
    // ==========================================

    const body = await req.json();

    const reference =
      typeof body?.reference === "string"
        ? body.reference.trim()
        : "";

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment reference is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // CHECK LOCAL DATABASE FIRST
    // ==========================================

    const existing =
      await prisma.transaction.findUnique({
        where: {
          reference,
        },
      });

    if (existing) {
      if (
        existing.type === "FUND_WALLET" &&
        existing.status === "SUCCESS"
      ) {
        return NextResponse.json({
          success: true,
          alreadyCredited: true,
          amount: existing.amount,
          reference,
          message:
            "Payment has already been credited to your wallet.",
        });
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "This payment reference has already been used.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VERIFY DIRECTLY WITH PAYSTACK
    // ==========================================

    const secretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Paystack configuration is missing.",
        },
        { status: 500 }
      );
    }

    const verifyResponse =
      await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          reference
        )}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type":
              "application/json",
          },
        }
      );

    const payment =
      verifyResponse.data?.data;

    // ==========================================
    // PAYSTACK RESPONSE
    // ==========================================

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paystack did not return transaction details.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // PAYMENT STATUS
    // ==========================================

    if (payment.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          message:
            `Payment status is ${payment.status || "unknown"}.`,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VERIFY CURRENCY
    // ==========================================

    if (
      String(payment.currency).toUpperCase() !==
      "NGN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment currency.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // FIND LOGGED-IN USER
    // ==========================================

    const user =
      await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // VERIFY PAYSTACK CUSTOMER EMAIL
    // ==========================================

    const paymentEmail =
      String(
        payment.customer?.email || ""
      )
        .trim()
        .toLowerCase();

    const userEmail =
      session.user.email
        .trim()
        .toLowerCase();

    if (
      !paymentEmail ||
      paymentEmail !== userEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This payment does not belong to the currently logged-in account.",
        },
        { status: 403 }
      );
    }

    // ==========================================
    // GET AMOUNT FROM PAYSTACK
    // ==========================================

    const amount =
      Number(payment.amount) / 100;

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment amount.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VERIFY METADATA
    // ==========================================

    const metadata =
      payment.metadata || {};

    if (
      metadata.purpose &&
      metadata.purpose !== "wallet_funding"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment purpose.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // CREDIT WALLET ATOMICALLY
    // ==========================================

    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            // Check again inside transaction
            // to prevent duplicate crediting.

            const alreadyExists =
              await tx.transaction.findUnique({
                where: {
                  reference,
                },
              });

            if (alreadyExists) {
              if (
                alreadyExists.type ===
                  "FUND_WALLET" &&
                alreadyExists.status ===
                  "SUCCESS"
              ) {
                return {
                  alreadyCredited: true,
                  transaction:
                    alreadyExists,
                };
              }

              throw new Error(
                "Payment reference has already been used."
              );
            }

            // Create transaction record.

            const transaction =
              await tx.transaction.create({
                data: {
                  userId: user.id,

                  type: "FUND_WALLET",

                  amount,

                  description:
                    `Wallet funding of ₦${amount.toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}`,

                  status: "SUCCESS",

                  reference,

                  provider: "PAYSTACK",
                },
              });

            // Credit wallet.

            const updatedUser =
              await tx.user.update({
                where: {
                  id: user.id,
                },

                data: {
                  walletBalance: {
                    increment: amount,
                  },
                },

                select: {
                  id: true,
                  walletBalance: true,
                },
              });

            return {
              alreadyCredited: false,
              transaction,
              updatedUser,
            };
          }
        );

      // ==========================================
      // ALREADY CREDITED
      // ==========================================

      if (result.alreadyCredited) {
        return NextResponse.json({
          success: true,
          alreadyCredited: true,
          amount,
          reference,
          message:
            "Payment has already been credited to your wallet.",
        });
      }

      // ==========================================
      // SUCCESS
      // ==========================================

      return NextResponse.json({
        success: true,
        alreadyCredited: false,
        amount,
        reference,

        message:
          "Payment verified and wallet funded successfully.",

        walletBalance:
          result.updatedUser?.walletBalance ??
          undefined,
      });
    } catch (transactionError: any) {
      // Prisma unique constraint

      if (
        transactionError?.code === "P2002"
      ) {
        return NextResponse.json({
          success: true,
          alreadyCredited: true,
          reference,
          message:
            "Payment has already been credited to your wallet.",
        });
      }

      throw transactionError;
    }
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "PAYSTACK VERIFY ERROR:"
    );

    console.error(
      error?.response?.data ||
        error?.message ||
        error
    );

    console.error(
      "=========================================="
    );

    const paystackMessage =
      error?.response?.data?.message;

    return NextResponse.json(
      {
        success: false,

        message:
          paystackMessage ||
          "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}