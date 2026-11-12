import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { failWithdrawal } from "@/lib/withdrawals";

// Your Paystack webhook route (the one that currently only handles business withdrawals)

const BUSINESS_WALLET_NAME = "Brainfriend Global Tech";

const SUCCESS_EVENTS = ["transfer.success"];
const FAIL_EVENTS = ["transfer.failed", "transfer.rejected"];
const REVERSE_EVENTS = ["transfer.reversed"];
const SUPPORTED_EVENTS = [...SUCCESS_EVENTS, ...FAIL_EVENTS, ...REVERSE_EVENTS];

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  try {
    // ---------- Raw body + signature ----------
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is missing.");
      return json(
        { success: false, message: "Paystack configuration is missing." },
        500,
      );
    }

    if (!signature) {
      return json(
        { success: false, message: "Missing Paystack signature." },
        401,
      );
    }

    const expected = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");
    const receivedBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");

    if (
      receivedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(receivedBuf, expectedBuf)
    ) {
      return json(
        { success: false, message: "Invalid Paystack signature." },
        401,
      );
    }

    // ---------- Parse ----------
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ success: false, message: "Invalid webhook payload." }, 400);
    }

    if (!SUPPORTED_EVENTS.includes(event.event)) {
      return json({ success: true, message: "Event ignored." });
    }

    const transfer = event.data;
    if (!transfer) {
      return json(
        { success: false, message: "Transfer data is missing." },
        400,
      );
    }

    const reference = String(transfer.reference || "").trim();
    if (!reference) {
      console.error("PAYSTACK TRANSFER WEBHOOK: Missing reference.");
      return json(
        { success: false, message: "Transfer reference is missing." },
        400,
      );
    }

    const isSuccess = SUCCESS_EVENTS.includes(event.event);
    const isFail = FAIL_EVENTS.includes(event.event);
    const isReverse = REVERSE_EVENTS.includes(event.event);

    // =====================================================
    // 1) CUSTOMER WITHDRAWALS  (reference starts with wd_)
    // =====================================================
    const customerWithdrawal = await prisma.withdrawal.findFirst({
      where: { reference },
      select: { id: true, status: true },
    });

    if (customerWithdrawal) {
      const status = customerWithdrawal.status;

      if (isSuccess) {
        // Only move forward from PENDING/APPROVED. Replays do nothing.
        const updated = await prisma.withdrawal.updateMany({
          where: { reference, status: { in: ["PENDING", "APPROVED"] } },
          data: {
            status: "PAID",
            adminNote: "Paystack confirmed the transfer.",
          },
        });

        if (updated.count > 0) {
          await prisma.transaction.updateMany({
            where: { reference },
            data: { status: "success" },
          });
        }

        return json({
          success: true,
          message: "Customer withdrawal marked as paid.",
        });
      }

      if (isFail || isReverse) {
        // Refund the wallet. failWithdrawal must be idempotent (only refund once).
        if (
          status === "PENDING" ||
          status === "APPROVED" ||
          status === "PAID"
        ) {
          await failWithdrawal(reference);
          console.log("CUSTOMER WITHDRAWAL REFUNDED:", reference, event.event);
        }
        return json({
          success: true,
          message: "Customer withdrawal refunded.",
        });
      }
    }

    // =====================================================
    // 2) BUSINESS WITHDRAWALS
    // =====================================================
    const withdrawal = await prisma.businessWithdrawal.findUnique({
      where: { reference },
    });

    if (!withdrawal) {
      // Return 200 so Paystack doesn't keep retrying a reference that isn't ours
      console.error(
        "PAYSTACK TRANSFER WEBHOOK: Withdrawal not found:",
        reference,
      );
      return json({ success: true, message: "Withdrawal not found." });
    }

    // Idempotency
    if (isSuccess && withdrawal.status === "SUCCESS") {
      return json({ success: true, message: "Transfer already processed." });
    }
    if (isFail && withdrawal.status === "FAILED") {
      return json({
        success: true,
        message: "Failed transfer already processed.",
      });
    }
    if (isReverse && withdrawal.status === "REVERSED") {
      return json({
        success: true,
        message: "Reversed transfer already processed.",
      });
    }

    // ---------- Business: success ----------
    if (isSuccess) {
      const amount = Number(transfer.amount) / 100;

      if (!Number.isFinite(amount) || amount <= 0) {
        console.error("Invalid successful transfer amount:", transfer.amount);
        return json(
          { success: false, message: "Invalid transfer amount." },
          400,
        );
      }

      await prisma.$transaction(async (tx) => {
        const current = await tx.businessWithdrawal.findUnique({
          where: { id: withdrawal.id },
        });
        if (!current) throw new Error("Business withdrawal no longer exists.");
        if (current.status === "SUCCESS") return;

        const wallet = await tx.businessWallet.findUnique({
          where: { name: BUSINESS_WALLET_NAME },
        });
        if (!wallet) throw new Error("Business wallet not found.");

        // Deduct only after Paystack confirms success
        if (wallet.availableProfit < amount) {
          throw new Error("Available business profit is insufficient.");
        }

        await tx.businessWallet.update({
          where: { id: wallet.id },
          data: {
            availableProfit: { decrement: amount },
            withdrawnProfit: { increment: amount },
            balance: { decrement: amount },
          },
        });

        await tx.businessWithdrawal.update({
          where: { id: current.id },
          data: {
            status: "SUCCESS",
            transferCode: transfer.transfer_code || current.transferCode,
            processedAt: new Date(),
            adminNote:
              "Paystack confirmed the business withdrawal successfully.",
          },
        });
      });

      console.log("BUSINESS WITHDRAWAL SUCCESS:", reference, amount);
      return json({
        success: true,
        message: "Business withdrawal marked as successful.",
      });
    }

    // ---------- Business: failed / rejected ----------
    if (isFail) {
      await prisma.businessWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "FAILED",
          transferCode: transfer.transfer_code || withdrawal.transferCode,
          processedAt: new Date(),
          adminNote:
            transfer.reason ||
            transfer.message ||
            "Paystack reported that the transfer failed.",
        },
      });

      // No wallet change: the profit was never deducted
      console.log("BUSINESS WITHDRAWAL FAILED:", reference);
      return json({
        success: true,
        message: "Business withdrawal marked as failed.",
      });
    }

    // ---------- Business: reversed ----------
    if (isReverse) {
      const amount = Number(transfer.amount) / 100;

      await prisma.$transaction(async (tx) => {
        const current = await tx.businessWithdrawal.findUnique({
          where: { id: withdrawal.id },
        });
        if (!current) throw new Error("Business withdrawal not found.");

        // Only restore profit if it had been deducted (i.e. marked SUCCESS)
        if (current.status === "SUCCESS") {
          const wallet = await tx.businessWallet.findUnique({
            where: { name: BUSINESS_WALLET_NAME },
          });
          if (!wallet) throw new Error("Business wallet not found.");

          await tx.businessWallet.update({
            where: { id: wallet.id },
            data: {
              availableProfit: { increment: amount },
              withdrawnProfit: { decrement: amount },
              balance: { increment: amount },
            },
          });
        }

        await tx.businessWithdrawal.update({
          where: { id: current.id },
          data: {
            status: "REVERSED",
            transferCode: transfer.transfer_code || current.transferCode,
            processedAt: new Date(),
            adminNote: "Paystack reversed the business withdrawal.",
          },
        });
      });

      console.log("BUSINESS WITHDRAWAL REVERSED:", reference);
      return json({
        success: true,
        message: "Business withdrawal marked as reversed.",
      });
    }

    return json({ success: true, message: "Transfer event processed." });
  } catch (error: any) {
    console.error(
      "PAYSTACK TRANSFER WEBHOOK ERROR:",
      error?.response?.data || error?.message || error,
    );
    return json(
      { success: false, message: "Transfer webhook processing failed." },
      500,
    );
  }
}
