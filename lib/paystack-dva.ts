import { prisma } from "@/lib/prisma";

// Paystack Dedicated Virtual Accounts: creating a customer's account number
// and crediting their wallet when a bank transfer arrives.

const PAYSTACK_BASE = "https://api.paystack.co";

export class DvaError extends Error {
  needsVerification: boolean;

  constructor(message: string, needsVerification = false) {
    super(message);
    this.needsVerification = needsVerification;
  }
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is missing.");
  }

  return key;
}

const isTestKey = () => secretKey().startsWith("sk_test");

async function paystack(path: string, init: RequestInit = {}) {
  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  return {
    ok: response.ok && body?.status !== false,
    status: response.status,
    body,
  };
}

function preferredBank(): string {
  return (
    process.env.PAYSTACK_DVA_BANK?.trim() ||
    (isTestKey() ? "test-bank" : "wema-bank")
  );
}

function toPaystackPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;

  return `+234${digits}`;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || "Customer";
  const last = parts.length > 1 ? parts.slice(1).join(" ") : first;

  return { first, last };
}

type AccountUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

/** Creates (or returns) the user's dedicated virtual account. */
export async function createVirtualAccount(user: AccountUser) {
  const existing = await prisma.virtualAccount.findUnique({
    where: { userId: user.id },
  });

  if (existing) return existing;

  const { first, last } = splitName(user.fullName);

  // 1. The customer record on Paystack.
  const created = await paystack("/customer", {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      first_name: first,
      last_name: last,
      phone: toPaystackPhone(user.phone),
    }),
  });

  let customerCode: string | null = created.body?.data?.customer_code ?? null;

  if (!customerCode) {
    const found = await paystack(`/customer/${encodeURIComponent(user.email)}`);
    customerCode = found.body?.data?.customer_code ?? null;
  }

  if (!customerCode) {
    console.error("PAYSTACK CUSTOMER ERROR:", created.body);
    throw new DvaError("Unable to set up your account right now.");
  }

  // 2. The account number. If the customer already has one, reuse it.
  const assigned = await paystack("/dedicated_account", {
    method: "POST",
    body: JSON.stringify({
      customer: customerCode,
      preferred_bank: preferredBank(),
    }),
  });

  let account: any = assigned.ok ? assigned.body?.data : null;

  if (!account?.account_number) {
    const customer = await paystack(`/customer/${customerCode}`);
    account = customer.body?.data?.dedicated_account ?? null;
  }

  if (!account?.account_number) {
    const message = String(assigned.body?.message ?? "");

    console.error("PAYSTACK DVA ERROR:", assigned.status, assigned.body);

    throw new DvaError(
      "Unable to create your account number right now.",
      /validat|identif|bvn/i.test(message),
    );
  }

  return prisma.virtualAccount.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      customerCode,
      bankName: account.bank?.name ?? "Bank",
      bankSlug: account.bank?.slug ?? null,
      accountName: account.account_name ?? user.fullName,
      accountNumber: String(account.account_number),
      isTest: isTestKey(),
    },
  });
}

/** Asks Paystack to re-check an account for transfers it has not reported. */
export async function requeryVirtualAccount(account: {
  accountNumber: string;
  bankSlug: string | null;
}) {
  if (!account.bankSlug) return false;

  const date = new Date().toISOString().slice(0, 10);

  const result = await paystack(
    `/dedicated_account/requery?account_number=${encodeURIComponent(
      account.accountNumber,
    )}&provider_slug=${encodeURIComponent(account.bankSlug)}&date=${date}`,
  );

  return result.ok;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Call this from the Paystack webhook with the parsed event, AFTER the
 * signature has been verified. Returns { handled: true } for transfers to a
 * dedicated virtual account (the caller should then respond 200 and stop).
 *
 * The customer is credited the amount sent minus Paystack's fee, once per
 * payment, even if Paystack sends the same event again.
 */
export async function handleDedicatedAccountEvent(event: any): Promise<{
  handled: boolean;
  credited?: boolean;
  reason?: string;
}> {
  if (event?.event !== "charge.success") return { handled: false };

  const data = event.data ?? {};
  const channel = data.authorization?.channel ?? data.channel;

  if (channel !== "dedicated_nuban") return { handled: false };

  // Test payments must never credit a live wallet.
  if (data.domain === "test" && !isTestKey()) {
    return { handled: true, credited: false, reason: "test event ignored" };
  }

  if (data.status && data.status !== "success") {
    return { handled: true, credited: false, reason: "payment not successful" };
  }

  const accountNumber = data.authorization?.receiver_bank_account_number;
  const customerCode = data.customer?.customer_code;
  const email = data.customer?.email;

  let userId: string | null = null;

  if (accountNumber) {
    const account = await prisma.virtualAccount.findUnique({
      where: { accountNumber: String(accountNumber) },
    });
    userId = account?.userId ?? null;
  }

  if (!userId && customerCode) {
    const account = await prisma.virtualAccount.findFirst({
      where: { customerCode: String(customerCode) },
    });
    userId = account?.userId ?? null;
  }

  if (!userId && email) {
    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId) {
    console.error("DVA PAYMENT: no matching customer:", {
      reference: data.reference,
      accountNumber,
    });
    return { handled: true, credited: false, reason: "unknown account" };
  }

  const grossKobo = Number(data.amount);

  if (!Number.isFinite(grossKobo) || grossKobo <= 0) {
    return { handled: true, credited: false, reason: "invalid amount" };
  }

  // Paystack's reported fee; fall back to 1% capped at N300.
  const reportedFee = Number(data.fees);
  const feeKobo =
    Number.isFinite(reportedFee) && reportedFee >= 0
      ? reportedFee
      : Math.min(Math.round(grossKobo * 0.01), 30000);

  const gross = round2(grossKobo / 100);
  const fee = round2(feeKobo / 100);
  const credit = round2((grossKobo - feeKobo) / 100);

  if (credit <= 0 || !data.reference) {
    return { handled: true, credited: false, reason: "nothing to credit" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // The reference is unique, so a repeated webhook cannot credit twice.
      await tx.transaction.create({
        data: {
          userId: userId as string,
          type: "FUND_WALLET",
          amount: credit,
          description: `Wallet funding by bank transfer (N${gross} sent, N${fee} fee)`,
          status: "SUCCESS",
          reference: `DVA-${data.reference}`,
          provider: "PAYSTACK",
          cost: 0,
          profit: 0,
          isTest: data.domain === "test",
        },
      });

      await tx.user.update({
        where: { id: userId as string },
        data: { walletBalance: { increment: credit } },
      });
    });

    return { handled: true, credited: true };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { handled: true, credited: false, reason: "already credited" };
    }

    // Let the webhook answer with an error so Paystack retries it.
    throw error;
  }
}
