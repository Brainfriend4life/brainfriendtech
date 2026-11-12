import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecipient } from "@/lib/paystack";
import { USER_PAYS_FEE, transferFee } from "@/lib/transfer-fee";

// IMPORTANT: this route only READS. It never changes balances or statuses.
// Anyone can call a public URL, so it must have no side effects.

function reject(why: string, ctx?: unknown) {
  console.warn("TRANSFER APPROVAL REJECTED:", why, ctx ?? "");
  return NextResponse.json({}, { status: 400 });
}

function approve() {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const reference = typeof body?.reference === "string" ? body.reference : "";
    const amountKobo = Number(body?.amount);
    const recipient = body?.recipient;

    if (
      !reference ||
      !Number.isFinite(amountKobo) ||
      amountKobo <= 0 ||
      recipient == null
    ) {
      return reject("malformed payload", { reference });
    }

    if (body?.source && body.source !== "balance") {
      return reject("unexpected source", { reference });
    }

    if (body?.currency && body.currency !== "NGN") {
      return reject("unexpected currency", { reference });
    }

    // ---------- Customer withdrawals ----------
    const withdrawal = await prisma.withdrawal.findFirst({
      where: { reference },
      select: { amount: true, accountNumber: true, status: true },
    });

    if (withdrawal) {
      if (withdrawal.status !== "PENDING" && withdrawal.status !== "APPROVED") {
        return reject("withdrawal already finished", { reference });
      }

      const fee = USER_PAYS_FEE ? transferFee(withdrawal.amount) : 0;
      const expectedKobo = Math.round((withdrawal.amount - fee) * 100);

      if (amountKobo !== expectedKobo) {
        return reject("amount mismatch", {
          reference,
          amountKobo,
          expectedKobo,
        });
      }

      const found = await fetchRecipient(recipient);
      if (found.details.account_number !== withdrawal.accountNumber) {
        return reject("destination account mismatch", { reference });
      }

      return approve();
    }

    // ---------- Admin business wallet withdrawals ----------
    const business = await prisma.businessWithdrawal.findFirst({
      where: { OR: [{ reference }, { paystackReference: reference }] },
      select: {
        amount: true,
        accountNumber: true,
        recipientCode: true,
        status: true,
      },
    });

    if (business) {
      if (business.status !== "PENDING" && business.status !== "PROCESSING") {
        return reject("business withdrawal already finished", { reference });
      }

      if (amountKobo !== Math.round(business.amount * 100)) {
        return reject("business amount mismatch", { reference, amountKobo });
      }

      const codeMatches =
        typeof recipient === "string" && business.recipientCode === recipient;

      if (!codeMatches) {
        const found = await fetchRecipient(recipient);
        if (found.details.account_number !== business.accountNumber) {
          return reject("business destination mismatch", { reference });
        }
      }

      return approve();
    }

    // Not one of our withdrawals: someone else is trying to send your money
    return reject("unknown reference", { reference });
  } catch (error) {
    // Fail closed: if anything goes wrong, the transfer is NOT approved
    console.error("TRANSFER APPROVAL ERROR:", error);
    return NextResponse.json({}, { status: 400 });
  }
}
