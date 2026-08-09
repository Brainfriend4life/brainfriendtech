
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    /*
     * ==========================================
     * AUTHENTICATION
     * ==========================================
     */

    const session =
      await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ==========================================
     * GET REFERENCE
     * ==========================================
     */

    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment reference is required.",
        },
        {
          status: 400,
        }
      );
    }

    const cleanReference =
      String(reference).trim();

    /*
     * ==========================================
     * CHECK IF ALREADY CREDITED
     * ==========================================
     */

    const existing =
      await prisma.transaction.findUnique({
        where: {
          reference: cleanReference,
        },
      });

    if (existing) {
      /*
       * Only treat an existing successful
       * wallet transaction as already credited.
       */

      if (
        existing.type ===
          "FUND_WALLET" &&
        existing.status === "SUCCESS"
      ) {
        return NextResponse.json({
          success: true,
          alreadyCredited: true,
          message:
            "Payment has already been credited.",
        });
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "This payment reference has already been used.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * VERIFY WITH PAYSTACK
     * ==========================================
     */

    const verify =
      await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          cleanReference
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

    const payment =
      verify.data?.data;

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Paystack response.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * PAYMENT STATUS
     * ==========================================
     */

    if (payment.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment was not successful.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * VERIFY CURRENCY
     * ==========================================
     */

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
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * FIND USER
     * ==========================================
     */

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
          message: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ==========================================
     * VERIFY PAYSTACK CUSTOMER
     * ==========================================
     */

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
            "Payment does not belong to this account.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * ==========================================
     * PAYMENT AMOUNT
     * ==========================================
     */

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
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * VERIFY METADATA
     * ==========================================
     */

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
          message:
            "Invalid payment purpose.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * CREDIT WALLET ATOMICALLY
     * ==========================================
     *
     * If the transaction creation fails,
     * the wallet update is rolled back.
     *
     * If another request already used the
     * reference, the unique constraint prevents
     * duplicate crediting.
     */

    try {
      await prisma.$transaction(
        async (tx) => {
          /*
           * Create transaction first.
           */

          await tx.transaction.create({
            data: {
              userId: user.id,

              type:
                "FUND_WALLET",

              provider:
                "PAYSTACK",

              amount,

              description:
                `Wallet funding of ₦${amount.toLocaleString(
                  "en-NG",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`,

              status:
                "SUCCESS",

              reference:
                cleanReference,
            },
          });

          /*
           * Credit wallet.
           */

          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              walletBalance: {
                increment: amount,
              },
            },
          });
        }
      );
    } catch (transactionError: any) {
      /*
       * Prisma P2002 means the unique
       * transaction reference already exists.
       */

      if (
        transactionError?.code ===
        "P2002"
      ) {
        return NextResponse.json({
          success: true,
          alreadyCredited: true,
          message:
            "Payment has already been credited.",
        });
      }

      throw transactionError;
    }

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    return NextResponse.json({
      success: true,

      alreadyCredited: false,

      message:
        "Wallet funded successfully.",

      amount,

      reference:
        cleanReference,
    });
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

    return NextResponse.json(
      {
        success: false,

        message:
          error?.response?.data
            ?.message ||
          "Payment verification failed.",
      },
      {
        status: 500,
      }
    );
  }
}

