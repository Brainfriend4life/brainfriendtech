import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { failWithdrawal } from "@/lib/withdrawals";

// Save as: lib/transfer-webhook.ts
// Called from /api/paystack/webhook for every event that starts with "transfer."
// The signature is already verified by the caller.

const BUSINESS_WALLET_NAME = "Brainfriend Global Tech";

const SUCCESS_EVENTS = ["transfer.success"];
const FAIL_EVENTS = ["transfer.failed", "transfer.rejected"];
const REVERSE_EVENTS = ["transfer.reversed"];

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function handleTransferEvent(event: any) {
  const transfer = event?.data;
  const eventName: string = event?.event;

  if (!transfer) {
    return json({ success: false, message: "Transfer data is missing." }, 400);
  }

  const reference = String(transfer.reference || "").trim();
  if (!reference) {
    console.error("TRANSFER WEBHOOK: missing reference.");
    return json(
      { success: false, message: "Transfer reference is missing." },
      400,
    );
  }

  const isSuccess = SUCCESS_EVENTS.includes(eventName);
  const isFail = FAIL_EVENTS.includes(eventName);
  const isReverse = REVERSE_EVENTS.includes(eventName);

  if (!isSuccess && !isFail && !isReverse) {
    return json({ success: true, message: "Event ignored." });
  }

  console.log("TRANSFER WEBHOOK:", eventName, reference);

  // =====================================================
  // 1) CUSTOMER WITHDRAWALS
  // =====================================================
  const customerWithdrawal = await prisma.withdrawal.findFirst({
    where: { reference },
    select: { id: true, status: true },
  });

  if (customerWithdrawal) {
    if (isSuccess) {
      await prisma.withdrawal.updateMany({
        where: { reference, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "PAID", adminNote: "Paystack confirmed the transfer." },
      });

      // Always sync the transaction row (also on retries).
      // Matches either "pending" or "PENDING" in case your app uses both.
      await prisma.transaction.updateMany({
        where: { reference, status: { in: ["pending", "PENDING"] } },
        data: { status: "SUCCESS" },
      });

      return json({
        success: true,
        message: "Customer withdrawal marked as paid.",
      });
    }

    // failed / rejected / reversed: refund the wallet.
    // failWithdrawal must be idempotent (refund only once).
    const s = customerWithdrawal.status;
    if (s === "PENDING" || s === "APPROVED" || s === "PAID") {
      await failWithdrawal(reference);
      console.log("CUSTOMER WITHDRAWAL REFUNDED:", reference, eventName);
    }
    return json({ success: true, message: "Customer withdrawal refunded." });
  }

  // =====================================================
  // 2) BUSINESS WITHDRAWALS
  // =====================================================
  const withdrawal = await prisma.businessWithdrawal.findUnique({
    where: { reference },
  });

  if (!withdrawal) {
    // Return 200 so Paystack doesn't keep retrying a reference that isn't ours
    console.error("TRANSFER WEBHOOK: withdrawal not found:", reference);
    return json({ success: true, message: "Withdrawal not found." });
  }

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
      return json({ success: false, message: "Invalid transfer amount." }, 400);
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
          adminNote: "Paystack confirmed the business withdrawal successfully.",
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

    console.log("BUSINESS WITHDRAWAL FAILED:", reference);
    return json({
      success: true,
      message: "Business withdrawal marked as failed.",
    });
  }

  // ---------- Business: reversed ----------
  const amount = Number(transfer.amount) / 100;

  await prisma.$transaction(async (tx) => {
    const current = await tx.businessWithdrawal.findUnique({
      where: { id: withdrawal.id },
    });
    if (!current) throw new Error("Business withdrawal not found.");

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
