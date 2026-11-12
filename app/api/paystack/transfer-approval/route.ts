import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecipient } from "@/lib/paystack";
import { USER_PAYS_FEE, transferFee } from "@/lib/transfer-fee";

// app/api/paystack/transfer-approval/route.ts
//
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

    // Temporary: remove once you've confirmed the real payload shape
    console.log("APPROVAL BODY:", JSON.stringify(body));

    const reference: string =
      [body?.reference, body?.transfer_reference, body?.data?.reference].find(
        (v) => typeof v === "string" && v,
      ) ?? "";
    const amountKobo = Number(body?.amount);
    const recipient = body?.recipient;

    if (!Number.isFinite(amountKobo) || amountKobo <= 0 || recipient == null) {
      return reject("malformed payload", { body });
    }

    if (body?.source && body.source !== "balance") {
      return reject("unexpected source", { reference });
    }

    if (body?.currency && body.currency !== "NGN") {
      return reject("unexpected currency", { reference });
    }

    // Destination account number, whether `recipient` is an object, a code or an id
    let acctNo = "";
    if (typeof recipient === "object") {
      acctNo = recipient?.details?.account_number ?? "";
      if (!acctNo) {
        const code = recipient?.recipient_code ?? recipient?.id;
        if (code != null) {
          acctNo = (await fetchRecipient(String(code))).details.account_number;
        }
      }
    } else {
      acctNo = (await fetchRecipient(String(recipient))).details.account_number;
    }

    if (!acctNo) {
      return reject("could not resolve destination account", { reference });
    }

    // ---------- Customer withdrawals ----------
    const candidates = await prisma.withdrawal.findMany({
      where: reference
        ? { reference }
        : { accountNumber: acctNo, status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { amount: true, accountNumber: true, status: true },
    });

    const withdrawal = candidates.find((w) => {
      const fee = USER_PAYS_FEE ? transferFee(w.amount) : 0;
      return (
        (w.status === "PENDING" || w.status === "APPROVED") &&
        Math.round((w.amount - fee) * 100) === amountKobo &&
        w.accountNumber === acctNo
      );
    });

    if (withdrawal) return approve();

    // ---------- Admin business wallet withdrawals ----------
    const business = await prisma.businessWithdrawal.findFirst({
      where: reference
        ? { OR: [{ reference }, { paystackReference: reference }] }
        : {
            accountNumber: acctNo,
            status: { in: ["PENDING", "PROCESSING"] },
          },
      orderBy: { createdAt: "desc" },
      select: {
        amount: true,
        accountNumber: true,
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

      if (business.accountNumber !== acctNo) {
        return reject("business destination mismatch", { reference });
      }

      return approve();
    }

    // Not one of our withdrawals: someone else is trying to send your money
    return reject("no matching withdrawal", { reference, amountKobo, acctNo });
  } catch (error) {
    // Fail closed: if anything goes wrong, the transfer is NOT approved
    console.error("TRANSFER APPROVAL ERROR:", error);
    return NextResponse.json({}, { status: 400 });
  }
}
