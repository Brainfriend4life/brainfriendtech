import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // GET REFERENCE
    // ==========================================

    const { searchParams } =
      new URL(request.url);

    const reference =
      searchParams.get("reference")?.trim();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction reference is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // FIND USER
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
          error: "User account not found.",
        },
        { status: 404 }
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
      // Make sure the transaction belongs
      // to the logged-in user.

      if (existing.userId !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This transaction does not belong to your account.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,

        transaction: {
          id: existing.id,
          amount: Number(existing.amount),
          description:
            existing.description ||
            "Wallet Deposit",
          status: existing.status,
          reference: existing.reference,
          provider: existing.provider,
          createdAt: existing.createdAt,
          isTest: existing.isTest,
        },
      });
    }

    // ==========================================
    // LOCAL TRANSACTION DOES NOT EXIST
    //
    // IMPORTANT:
    // The user may have successfully paid Paystack
    // but closed the page before our webhook or
    // verification endpoint created the transaction.
    //
    // Therefore we now check Paystack directly.
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
          error:
            "Payment verification is not configured.",
        },
        { status: 500 }
      );
    }

    let paystackResponse;

    try {
      paystackResponse =
        await axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(
            reference
          )}`,
          {
            headers: {
              Authorization:
                `Bearer ${secretKey}`,

              "Content-Type":
                "application/json",
            },
          }
        );
    } catch (paystackError: any) {
      console.error(
        "PAYSTACK TRANSACTION STATUS ERROR:",
        paystackError?.response?.data ||
          paystackError?.message ||
          paystackError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "No transaction was found with this reference.",
        },
        { status: 404 }
      );
    }

    const payment =
      paystackResponse.data?.data;

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No transaction was found with this reference.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // VERIFY PAYMENT REFERENCE
    // ==========================================

    const paystackReference =
      String(
        payment.reference || ""
      ).trim();

    if (
      !paystackReference ||
      paystackReference !== reference
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid transaction reference.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VERIFY CUSTOMER EMAIL
    // ==========================================

    const paymentEmail =
      String(
        payment.customer?.email || ""
      )
        .trim()
        .toLowerCase();

    const userEmail =
      user.email
        .trim()
        .toLowerCase();

    if (
      !paymentEmail ||
      paymentEmail !== userEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transaction does not belong to your account.",
        },
        { status: 403 }
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
          error:
            "Invalid payment currency.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VERIFY WALLET FUNDING PURPOSE
    // ==========================================

    const metadata =
      payment.metadata || {};

    if (
      metadata.purpose &&
      metadata.purpose !==
        "wallet_funding"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This transaction is not a wallet funding transaction.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // PAYMENT STATUS
    // ==========================================

    const paymentStatus =
      String(
        payment.status || ""
      ).toLowerCase();

    // ==========================================
    // PAYMENT NOT SUCCESSFUL
    // ==========================================

    if (paymentStatus !== "success") {
      return NextResponse.json({
        success: true,

        transaction: {
          id: "",
          amount:
            Number(payment.amount || 0) /
            100,
          description:
            "Wallet Deposit",
          status:
            payment.status ||
            "pending",
          reference,
          provider: "PAYSTACK",
          createdAt:
            payment.paid_at ||
            payment.created_at ||
            new Date().toISOString(),
          isTest: false,
        },
      });
    }

    // ==========================================
    // GET PAYMENT AMOUNT
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
          error:
            "Invalid payment amount.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // RECOVER PAYMENT
    //
    // Transaction + wallet credit happen inside
    // ONE Prisma transaction.
    //
    // Because reference is UNIQUE, the same
    // Paystack payment cannot be credited twice.
    // ==========================================

    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            // Check again inside the transaction
            // to handle webhook/status races.

            const alreadyExists =
              await tx.transaction.findUnique({
                where: {
                  reference,
                },
              });

            if (alreadyExists) {
              return {
                alreadyProcessed: true,
                transaction:
                  alreadyExists,
              };
            }

            // Create transaction.

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

                  cost: 0,

                  profit: 0,

                  isTest: false,
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
              alreadyProcessed: false,

              transaction,

              updatedUser,
            };
          }
        );

      // ========================================
      // PAYMENT WAS ALREADY PROCESSED
      // ========================================

      if (
        result.alreadyProcessed
      ) {
        return NextResponse.json({
          success: true,

          transaction: {
            id:
              result.transaction.id,

            amount:
              Number(
                result.transaction.amount
              ),

            description:
              result.transaction.description,

            status:
              result.transaction.status,

            reference:
              result.transaction.reference,

            provider:
              result.transaction.provider,

            createdAt:
              result.transaction.createdAt,

            isTest:
              result.transaction.isTest,
          },
        });
      }

      // ========================================
      // RECOVERED + CREDITED
      // ========================================

      console.log(
        "=========================================="
      );

      console.log(
        "PAYSTACK TRANSACTION RECOVERY SUCCESS"
      );

      console.log(
        "USER:",
        user.email
      );

      console.log(
        "AMOUNT:",
        amount
      );

      console.log(
        "REFERENCE:",
        reference
      );

      console.log(
        "=========================================="
      );

      return NextResponse.json({
        success: true,

        recovered: true,

        transaction: {
          id:
            result.transaction.id,

          amount:
            Number(
              result.transaction.amount
            ),

          description:
            result.transaction.description,

          status:
            result.transaction.status,

          reference:
            result.transaction.reference,

          provider:
            result.transaction.provider,

          createdAt:
            result.transaction.createdAt,

          isTest:
            result.transaction.isTest,
        },

        message:
          "Successful payment recovered and wallet credited.",
      });
    } catch (transactionError: any) {
      // ========================================
      // DUPLICATE REFERENCE
      // ========================================

      if (
        transactionError?.code ===
        "P2002"
      ) {
        const recoveredTransaction =
          await prisma.transaction.findUnique({
            where: {
              reference,
            },
          });

        if (
          recoveredTransaction &&
          recoveredTransaction.userId ===
            user.id
        ) {
          return NextResponse.json({
            success: true,

            transaction: {
              id:
                recoveredTransaction.id,

              amount:
                Number(
                  recoveredTransaction.amount
                ),

              description:
                recoveredTransaction.description,

              status:
                recoveredTransaction.status,

              reference:
                recoveredTransaction.reference,

              provider:
                recoveredTransaction.provider,

              createdAt:
                recoveredTransaction.createdAt,

              isTest:
                recoveredTransaction.isTest,
            },
          });
        }
      }

      throw transactionError;
    }
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "TRANSACTION STATUS ERROR:"
    );

    console.error(
      error?.response?.data ||
        error?.message ||
        error
    );

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to check transaction status.",
      },
      { status: 500 }
    );
  }
}