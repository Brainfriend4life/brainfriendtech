import { prisma } from "@/lib/prisma";

// Paystack Dedicated Virtual Accounts:
// Create customer accounts and credit wallets from successful transfers.

const PAYSTACK_BASE = "https://api.paystack.co";

export class DvaError extends Error {
  needsVerification: boolean;

  constructor(message: string, needsVerification = false) {
    super(message);
    this.name = "DvaError";
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
      ...init.headers,
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

/**
 * Creates or returns the user's dedicated virtual account.
 */
export async function createVirtualAccount(user: AccountUser) {
  const existing = await prisma.paystackVirtualAccount.findUnique({
    where: { userId: user.id },
  });

  if (existing) return existing;

  const { first, last } = splitName(user.fullName);

  // 1. Create or retrieve the Paystack customer.
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

  // 2. Assign the dedicated account.
  const assigned = await paystack("/dedicated_account", {
    method: "POST",
    body: JSON.stringify({
      customer: customerCode,
      preferred_bank: preferredBank(),
    }),
  });

  let account: any = assigned.ok ? assigned.body?.data : null;

  // If an account already exists, retrieve it from the customer record.
  if (!account?.account_number) {
    const customer = await paystack(
      `/customer/${encodeURIComponent(customerCode)}`,
    );

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

  return prisma.paystackVirtualAccount.upsert({
    where: { userId: user.id },
    update: {
      customerCode,
      accountId: account.id ? String(account.id) : undefined,
      accountNumber: String(account.account_number),
      accountName: account.account_name ?? user.fullName,
      bankName: account.bank?.name ?? "Bank",
      bankSlug: account.bank?.slug ?? null,
      assignmentStatus: "SUCCESS",
      status: "ASSIGNED",
      assignedAt: new Date(),
    },
    create: {
      userId: user.id,
      customerCode,
      accountId: account.id ? String(account.id) : null,
      bankName: account.bank?.name ?? "Bank",
      bankSlug: account.bank?.slug ?? null,
      accountName: account.account_name ?? user.fullName,
      accountNumber: String(account.account_number),
      assignmentStatus: "SUCCESS",
      identificationStatus: "SUCCESS",
      status: "ASSIGNED",
      assignedAt: new Date(),
      isTest: isTestKey(),
    },
  });
}

/**
 * Requery a dedicated account for a transfer Paystack has not reported.
 */
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
 * Handles a successful Paystack Dedicated Nuban payment.
 * Call only after verifying the webhook signature.
 */
export async function handleDedicatedAccountEvent(event: any): Promise<{
  handled: boolean;
  credited?: boolean;
  reason?: string;
}> {
  if (event?.event !== "charge.success") {
    return { handled: false };
  }

  const data = event.data ?? {};
  const channel = data.authorization?.channel ?? data.channel;

  if (channel !== "dedicated_nuban") {
    return { handled: false };
  }

  if (data.status !== "success") {
    return {
      handled: true,
      credited: false,
      reason: "payment not successful",
    };
  }

  if (data.domain === "test" && !isTestKey()) {
    return {
      handled: true,
      credited: false,
      reason: "test payment ignored",
    };
  }

  const reference = String(data.reference ?? "").trim();

  if (!reference) {
    return {
      handled: true,
      credited: false,
      reason: "missing payment reference",
    };
  }

  // Find the receiving virtual account.
  const accountNumber = String(
    data.authorization?.receiver_bank_account_number ??
      data.receiver?.account_number ??
      data.dedicated_account?.account_number ??
      "",
  ).trim();

  const customerCode = String(data.customer?.customer_code ?? "").trim();

  const email = String(data.customer?.email ?? "")
    .trim()
    .toLowerCase();

  let virtualAccount = accountNumber
    ? await prisma.paystackVirtualAccount.findFirst({
        where: {
          accountNumber,
          status: "ASSIGNED",
        },
      })
    : null;

  if (!virtualAccount && customerCode) {
    virtualAccount = await prisma.paystackVirtualAccount.findFirst({
      where: { customerCode },
    });
  }

  let userId: string | null = virtualAccount?.userId ?? null;

  // Email fallback for manually created Paystack accounts.
  if (!userId && email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    userId = user?.id ?? null;
  }

  if (!userId) {
    console.error("DVA PAYMENT: no matching Brainfriend customer.", {
      reference,
      accountNumber,
      customerCode,
      email,
    });

    return {
      handled: true,
      credited: false,
      reason: "customer not found",
    };
  }

  // Validate payment amount.
  const grossKobo = Number(data.amount);

  if (!Number.isFinite(grossKobo) || grossKobo <= 0) {
    return {
      handled: true,
      credited: false,
      reason: "invalid amount",
    };
  }

  // Use Paystack's reported fee.
  const reportedFee = Number(data.fees);

  const feeKobo =
    Number.isFinite(reportedFee) && reportedFee >= 0
      ? reportedFee
      : Math.min(Math.round(grossKobo * 0.01), 30000);

  const gross = round2(grossKobo / 100);
  const fee = round2(feeKobo / 100);
  const credit = round2((grossKobo - feeKobo) / 100);

  if (credit <= 0) {
    return {
      handled: true,
      credited: false,
      reason: "payment amount is not greater than fee",
    };
  }

  // Credit the wallet exactly once.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId,
          type: "FUND_WALLET",
          amount: credit,
          description: `Wallet funding by bank transfer (N${gross} sent, N${fee} fee)`,
          status: "SUCCESS",
          reference,
          provider: "PAYSTACK",
          cost: 0,
          profit: 0,
          isTest: data.domain === "test",
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            increment: credit,
          },
        },
      });
    });

    console.log("PAYSTACK DVA WALLET CREDIT SUCCESS", {
      userId,
      reference,
      accountNumber,
      gross,
      fee,
      credited: credit,
    });

    return {
      handled: true,
      credited: true,
    };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return {
        handled: true,
        credited: false,
        reason: "already credited",
      };
    }

    console.error("DVA WALLET CREDIT ERROR:", error);

    // Allow Paystack to retry if the database operation fails.
    throw error;
  }
}
