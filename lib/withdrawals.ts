import { prisma } from "@/lib/prisma";

// Withdrawal status flow:
//   PENDING  -> request saved, wallet debited
//   APPROVED -> sent to Paystack, waiting for the result
//   PAID     -> Paystack confirmed the transfer
//   REJECTED -> failed or reversed, wallet refunded

// Transaction.status text. Make these match what your other routes write.
const TX_SUCCESS = "success";
const TX_FAILED = "failed";

export async function completeWithdrawal(reference: string) {
  await prisma.$transaction(async (tx) => {
    const moved = await tx.withdrawal.updateMany({
      where: { reference, status: { in: ["PENDING", "APPROVED"] } },
      data: {
        status: "PAID",
        processedAt: new Date(),
        adminNote: "Paid automatically via Paystack",
      },
    });
    if (moved.count === 0) return;

    await tx.transaction.updateMany({
      where: { reference },
      data: { status: TX_SUCCESS },
    });
  });
}

// Marks the withdrawal rejected and returns the money to the wallet.
// Safe to run twice: the second run finds nothing to change.
export async function failWithdrawal(reference: string) {
  await prisma.$transaction(async (tx) => {
    const w = await tx.withdrawal.findFirst({
      where: { reference },
      select: { id: true, userId: true, amount: true },
    });
    if (!w) return;

    const moved = await tx.withdrawal.updateMany({
      where: { id: w.id, status: { in: ["PENDING", "APPROVED", "PAID"] } },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
        adminNote: "Paystack transfer failed or was reversed. Wallet refunded.",
      },
    });
    if (moved.count === 0) return;

    await tx.user.update({
      where: { id: w.userId },
      data: { walletBalance: { increment: w.amount } },
    });

    await tx.transaction.updateMany({
      where: { reference },
      data: { status: TX_FAILED },
    });
  });
}

export async function handleTransferEvent(event: {
  event: string;
  data?: { reference?: string };
}) {
  const reference = event.data?.reference;
  if (!reference) return;

  if (event.event === "transfer.success") {
    await completeWithdrawal(reference);
  } else if (
    event.event === "transfer.failed" ||
    event.event === "transfer.reversed"
  ) {
    await failWithdrawal(reference);
  }
}
