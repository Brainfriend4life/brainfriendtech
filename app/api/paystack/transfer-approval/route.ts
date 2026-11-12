import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchRecipient } from "@/lib/paystack";
import { USER_PAYS_FEE, transferFee } from "@/lib/transfer-fee";

// app/api/paystack/transfer-approval/route.ts
//
// IMPORTANT: this route only READS. It never changes balances or statuses.
// Anyone can call a public URL, so it must have no side effects.
//
// Paystack sends this shape:
// {
//   event: "transferrequest.approval-required",
//   data: {
//     details: { body: { source, amount, recipient, reference, reason } },
//     transfers: [{ amount, reference, currency, source, recipient: {...} }]
//   }
// }

function reject(why: string, ctx?: unknown) {
  console.warn("TRANSFER APPROVAL REJECTED:", why, ctx ?? "");
  return NextResponse.json({}, { status: 400 });
}

function approve() {
  return NextResponse.json({}, { status: 200 });
}

type Item = {
  reference: string;
  amountKobo: number;
  source?: string;
  currency?: string;
  recipient: any;
};

// Pull the transfer(s) out of the payload, whatever the nesting
function extractItems(body: any): Item[] {
  const data = body?.data ?? body;

  let raw: any[] = [];
  if (Array.isArray(data?.transfers) && data.transfers.length > 0) {
    raw = data.transfers;
  } else if (data?.details?.body) {
    raw = [data.details.body];
  } else if (data) {
    raw = [data]; // old flat shape
  }

  return raw.map((t) => ({
    reference: typeof t?.reference === "string" ? t.reference.trim() : "",
    amountKobo: Number(t?.amount),
    source: t?.source,
    currency: t?.currency,
    recipient: t?.recipient,
  }));
}

// Destination account number, whether recipient is an object or a code
async function resolveAccountNumber(recipient: any): Promise<string> {
  if (recipient && typeof recipient === "object") {
    const direct =
      recipient?.details?.account_number ?? recipient?.recipientAccount;
    if (direct) return String(direct);

    const code =
      recipient?.recipient_code ?? recipient?.recipientCode ?? recipient?.id;
    if (code != null) {
      return (await fetchRecipient(String(code))).details.account_number;
    }
    return "";
  }

  if (recipient != null) {
    return (await fetchRecipient(String(recipient))).details.account_number;
  }
  return "";
}

async function verifyItem(item: Item): Promise<string | null> {
  const { reference, amountKobo } = item;

  if (!reference) return "missing reference";
  if (!Number.isFinite(amountKobo) || amountKobo <= 0) return "bad amount";
  if (item.recipient == null) return "missing recipient";
  if (item.source && item.source !== "balance") return "unexpected source";
  if (item.currency && item.currency !== "NGN") return "unexpected currency";

  const acctNo = await resolveAccountNumber(item.recipient);
  if (!acctNo) return "could not resolve destination account";

  // ---------- Customer withdrawals ----------
  const withdrawal = await prisma.withdrawal.findFirst({
    where: { reference },
    select: { amount: true, accountNumber: true, status: true },
  });

  if (withdrawal) {
    if (withdrawal.status !== "PENDING" && withdrawal.status !== "APPROVED") {
      return "withdrawal already finished";
    }

    const fee = USER_PAYS_FEE ? transferFee(withdrawal.amount) : 0;
    const expectedKobo = Math.round((withdrawal.amount - fee) * 100);

    if (amountKobo !== expectedKobo) {
      return `amount mismatch (got ${amountKobo}, expected ${expectedKobo})`;
    }
    if (withdrawal.accountNumber !== acctNo) {
      return "destination account mismatch";
    }
    return null;
  }

  // ---------- Admin business wallet withdrawals ----------
  const business = await prisma.businessWithdrawal.findFirst({
    where: { OR: [{ reference }, { paystackReference: reference }] },
    select: { amount: true, accountNumber: true, status: true },
  });

  if (business) {
    if (business.status !== "PENDING" && business.status !== "PROCESSING") {
      return "business withdrawal already finished";
    }
    if (amountKobo !== Math.round(business.amount * 100)) {
      return "business amount mismatch";
    }
    if (business.accountNumber !== acctNo) {
      return "business destination mismatch";
    }
    return null;
  }

  // Not one of ours: someone else is trying to send your money
  return "unknown reference";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = extractItems(body);

    if (items.length === 0) {
      return reject("no transfers in payload", { event: body?.event });
    }

    // Every transfer in the request must be one of ours and match exactly
    for (const item of items) {
      const problem = await verifyItem(item);
      if (problem) {
        return reject(problem, { reference: item.reference });
      }
    }

    return approve();
  } catch (error) {
    // Fail closed: if anything goes wrong, the transfer is NOT approved
    console.error("TRANSFER APPROVAL ERROR:", error);
    return NextResponse.json({}, { status: 400 });
  }
}
