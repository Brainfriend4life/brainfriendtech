import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // GET RAW BODY
    // ==========================================

    const rawBody = await req.text();

    // ==========================================
    // VERIFY PAYSTACK SIGNATURE
    // ==========================================

    const signature = req.headers.get("x-paystack-signature");

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is missing.");

      return NextResponse.json(
        {
          success: false,
          message: "Paystack configuration is missing.",
        },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing Paystack signature.",
        },
        { status: 401 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    const receivedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(
      expectedSignature,
      "utf8"
    );

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Paystack signature.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // PARSE EVENT
    // ==========================================

    let event: any;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid webhook payload.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // ONLY HANDLE TRANSFER EVENTS
    // ==========================================

    const supportedEvents = [
      "transfer.success",
      "transfer.failed",
      "transfer.reversed",
    ];

    if (!supportedEvents.includes(event.event)) {
      return NextResponse.json({
        success: true,
        message: "Event ignored.",
      });
    }

    const transfer = event.data;

    if (!transfer) {
      return NextResponse.json(
        {
          success: false,
          message: "Transfer data is missing.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // GET REFERENCE
    // ==========================================

    const reference = String(
      transfer.reference || ""
    ).trim();

    if (!reference) {
      console.error(
        "PAYSTACK TRANSFER WEBHOOK: Missing reference."
      );

      return NextResponse.json(
        {
          success: false,
          message: "Transfer reference is missing.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // FIND BUSINESS WITHDRAWAL
    // ==========================================

    const withdrawal =
      await prisma.businessWithdrawal.findUnique({
        where: {
          reference,
        },
      });

    if (!withdrawal) {
      console.error(
        "PAYSTACK TRANSFER WEBHOOK: Withdrawal not found:",
        reference
      );

      /*
       * Return 200 so Paystack doesn't repeatedly retry
       * a transfer belonging to another system/reference.
       */
      return NextResponse.json({
        success: true,
        message: "Withdrawal not found.",
      });
    }

    // ==========================================
    // IDEMPOTENCY
    // ==========================================
    //
    // If the webhook was already processed,
    // don't modify the wallet again.
    //

    if (
      withdrawal.status === "SUCCESS" &&
      event.event === "transfer.success"
    ) {
      return NextResponse.json({
        success: true,
        message: "Transfer already processed.",
      });
    }

    if (
      withdrawal.status === "FAILED" &&
      event.event === "transfer.failed"
    ) {
      return NextResponse.json({
        success: true,
        message: "Failed transfer already processed.",
      });
    }

    if (
      withdrawal.status === "REVERSED" &&
      event.event === "transfer.reversed"
    ) {
      return NextResponse.json({
        success: true,
        message: "Reversed transfer already processed.",
      });
    }

    // ==========================================
    // TRANSFER SUCCESS
    // ==========================================

    if (event.event === "transfer.success") {
      const amount =
        Number(transfer.amount) / 100;

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        console.error(
          "Invalid successful transfer amount:",
          transfer.amount
        );

        return NextResponse.json(
          {
            success: false,
            message: "Invalid transfer amount.",
          },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        const currentWithdrawal =
          await tx.businessWithdrawal.findUnique({
            where: {
              id: withdrawal.id,
            },
          });

        if (!currentWithdrawal) {
          throw new Error(
            "Business withdrawal no longer exists."
          );
        }

        // Already completed.
        if (
          currentWithdrawal.status === "SUCCESS"
        ) {
          return;
        }

        const wallet =
          await tx.businessWallet.findUnique({
            where: {
              name: "Brainfriend Tech",
            },
          });

        if (!wallet) {
          throw new Error(
            "Business wallet not found."
          );
        }

        /*
         * IMPORTANT:
         *
         * We only deduct the business wallet here,
         * after Paystack confirms success.
         */

        if (
          wallet.availableProfit < amount
        ) {
          throw new Error(
            "Available business profit is insufficient."
          );
        }

        await tx.businessWallet.update({
          where: {
            id: wallet.id,
          },

          data: {
            availableProfit: {
              decrement: amount,
            },

            withdrawnProfit: {
              increment: amount,
            },

            balance: {
              decrement: amount,
            },
          },
        });

        await tx.businessWithdrawal.update({
          where: {
            id: currentWithdrawal.id,
          },

          data: {
            status: "SUCCESS",

            transferCode:
              transfer.transfer_code ||
              currentWithdrawal.transferCode,

            processedAt: new Date(),

            adminNote:
              "Paystack confirmed the business withdrawal successfully.",
          },
        });
      });

      console.log(
        "=========================================="
      );

      console.log(
        "BUSINESS WITHDRAWAL SUCCESS"
      );

      console.log("REFERENCE:", reference);

      console.log("AMOUNT:", amount);

      console.log(
        "TRANSFER CODE:",
        transfer.transfer_code
      );

      console.log(
        "=========================================="
      );

      return NextResponse.json({
        success: true,
        message:
          "Business withdrawal marked as successful.",
      });
    }

    // ==========================================
    // TRANSFER FAILED
    // ==========================================

    if (event.event === "transfer.failed") {
      await prisma.businessWithdrawal.update({
        where: {
          id: withdrawal.id,
        },

        data: {
          status: "FAILED",

          transferCode:
            transfer.transfer_code ||
            withdrawal.transferCode,

          processedAt: new Date(),

          adminNote:
            transfer.reason ||
            transfer.message ||
            "Paystack reported that the transfer failed.",
        },
      });

      console.log(
        "BUSINESS WITHDRAWAL FAILED:",
        reference
      );

      /*
       * Notice:
       *
       * We DON'T deduct availableProfit here.
       *
       * Because the transfer failed.
       */

      return NextResponse.json({
        success: true,
        message:
          "Business withdrawal marked as failed.",
      });
    }

    // ==========================================
    // TRANSFER REVERSED
    // ==========================================

    if (event.event === "transfer.reversed") {
      const amount =
        Number(transfer.amount) / 100;

      await prisma.$transaction(async (tx) => {
        const currentWithdrawal =
          await tx.businessWithdrawal.findUnique({
            where: {
              id: withdrawal.id,
            },
          });

        if (!currentWithdrawal) {
          throw new Error(
            "Business withdrawal not found."
          );
        }

        /*
         * Only restore the profit if the withdrawal
         * had previously been marked successful.
         */

        if (
          currentWithdrawal.status === "SUCCESS"
        ) {
          const wallet =
            await tx.businessWallet.findUnique({
              where: {
                name: "Brainfriend Tech",
              },
            });

          if (!wallet) {
            throw new Error(
              "Business wallet not found."
            );
          }

          await tx.businessWallet.update({
            where: {
              id: wallet.id,
            },

            data: {
              availableProfit: {
                increment: amount,
              },

              withdrawnProfit: {
                decrement: amount,
              },

              balance: {
                increment: amount,
              },
            },
          });
        }

        await tx.businessWithdrawal.update({
          where: {
            id: currentWithdrawal.id,
          },

          data: {
            status: "REVERSED",

            transferCode:
              transfer.transfer_code ||
              currentWithdrawal.transferCode,

            processedAt: new Date(),

            adminNote:
              "Paystack reversed the business withdrawal.",
          },
        });
      });

      console.log(
        "BUSINESS WITHDRAWAL REVERSED:",
        reference
      );

      return NextResponse.json({
        success: true,
        message:
          "Business withdrawal marked as reversed.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Transfer event processed.",
    });
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "PAYSTACK TRANSFER WEBHOOK ERROR:"
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
          "Transfer webhook processing failed.",
      },
      { status: 500 }
    );
  }
}