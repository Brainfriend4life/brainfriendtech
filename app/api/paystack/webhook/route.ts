
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest
) {
  try {
    /*
     * ==========================================
     * GET RAW REQUEST BODY
     * ==========================================
     */

    const rawBody =
      await req.text();

    /*
     * ==========================================
     * VERIFY PAYSTACK SIGNATURE
     * ==========================================
     */

    const signature =
      req.headers.get(
        "x-paystack-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing Paystack signature.",
        },
        {
          status: 401,
        }
      );
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          process.env.PAYSTACK_SECRET_KEY || ""
        )
        .update(rawBody)
        .digest("hex");

    const signaturesMatch =
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

    if (!signaturesMatch) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Paystack signature.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ==========================================
     * PARSE EVENT
     * ==========================================
     */

    const event =
      JSON.parse(rawBody);

    /*
     * ==========================================
     * ONLY HANDLE SUCCESSFUL CHARGES
     * ==========================================
     */

    if (
      event.event !==
      "charge.success"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Event received.",
      });
    }

    const payment =
      event.data;

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment data missing.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * PAYMENT REFERENCE
     * ==========================================
     */

    const reference =
      String(
        payment.reference || ""
      ).trim();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment reference missing.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * DUPLICATE CHECK
     * ==========================================
     */

    const existing =
      await prisma.transaction.findUnique({
        where: {
          reference,
        },
      });

    if (existing) {
      return NextResponse.json({
        success: true,
        message:
          "Payment already processed.",
      });
    }

    /*
     * ==========================================
     * VERIFY PAYMENT STATUS
     * ==========================================
     */

    if (
      payment.status !==
      "success"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment is not successful.",
      });
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
            "Invalid currency.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * CUSTOMER EMAIL
     * ==========================================
     */

    const email =
      String(
        payment.customer?.email || ""
      )
        .trim()
        .toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer email missing.",
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
          email,
        },
      });

    if (!user) {
      console.error(
        "PAYSTACK WEBHOOK USER NOT FOUND:",
        email
      );

      /*
       * Return 200 so Paystack does not
       * continuously retry a payment for an
       * account that does not exist.
       *
       * You should investigate this case
       * from your logs.
       */

      return NextResponse.json({
        success: true,
        message:
          "User not found.",
      });
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
     * METADATA CHECK
     * ==========================================
     */

    const metadata =
      payment.metadata || {};

    if (
      metadata.purpose &&
      metadata.purpose !==
        "wallet_funding"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment is not a wallet funding transaction.",
      });
    }

    /*
     * ==========================================
     * CREDIT WALLET + RECORD TRANSACTION
     * ==========================================
     */

    try {
      await prisma.$transaction(
        async (tx) => {
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

              reference,
            },
          });

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
       * Duplicate reference means another
       * process already credited this payment.
       */

      if (
        transactionError?.code ===
        "P2002"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Payment already processed.",
        });
      }

      throw transactionError;
    }

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    console.log(
      "=========================================="
    );

    console.log(
      "PAYSTACK WEBHOOK WALLET CREDIT SUCCESS"
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
      message:
        "Wallet credited successfully.",
    });
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "PAYSTACK WEBHOOK ERROR:"
    );

    console.error(
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
          "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}

