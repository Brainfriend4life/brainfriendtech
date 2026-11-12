const BASE = "https://api.paystack.co";

// Thrown when Paystack answered and said no (safe to refund the user).
export class PaystackError extends Error {}

async function paystackRaw(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.status) {
    throw new PaystackError(json?.message || `Paystack error (${res.status})`);
  }
  return json;
}

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const json = await paystackRaw(path, init);
  return json.data as T;
}

export type PaystackBank = { name: string; code: string };

let bankCache: { at: number; banks: PaystackBank[] } | null = null;

export async function listBanks(): Promise<PaystackBank[]> {
  if (bankCache && Date.now() - bankCache.at < 6 * 60 * 60 * 1000) {
    return bankCache.banks;
  }

  const seen = new Map<string, PaystackBank>();
  let next: string | null = null;

  for (let i = 0; i < 10; i++) {
    const qs = new URLSearchParams({
      country: "nigeria",
      currency: "NGN",
      use_cursor: "true",
      perPage: "100",
    });
    if (next) qs.set("next", next);

    const json = await paystackRaw(`/bank?${qs.toString()}`);
    for (const b of json.data as PaystackBank[]) {
      if (!seen.has(b.code)) seen.set(b.code, { name: b.name, code: b.code });
    }

    next = json.meta?.next ?? null;
    if (!next) break;
  }

  const banks = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  bankCache = { at: Date.now(), banks };
  return banks;
}

export function resolveAccount(accountNumber: string, bankCode: string) {
  const qs = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode,
  });
  return paystack<{ account_number: string; account_name: string }>(
    `/bank/resolve?${qs.toString()}`,
  );
}

export function createRecipient(p: {
  name: string;
  accountNumber: string;
  bankCode: string;
}) {
  return paystack<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: p.name,
      account_number: p.accountNumber,
      bank_code: p.bankCode,
      currency: "NGN",
    }),
  });
}

export function initiateTransfer(p: {
  amountNaira: number;
  recipient: string;
  reference: string;
  reason: string;
}) {
  return paystack<{ status: string; transfer_code: string }>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(p.amountNaira * 100), // Paystack uses kobo
      recipient: p.recipient,
      reference: p.reference,
      reason: p.reason,
    }),
  });
}
