import { NextResponse } from "next/server";

// Paystack's own list of Nigerian banks (including fintech banks such as
// Kuda, OPay, Moniepoint and PalmPay), cached for a day. The bank code must
// come from this list for identity verification to work.

type PaystackBank = {
  name?: string;
  code?: string;
  active?: boolean;
  is_deleted?: boolean | null;
  type?: string;
};

export async function GET() {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    return NextResponse.json(
      { success: false, message: "Not configured." },
      { status: 500 },
    );
  }

  try {
    const all: PaystackBank[] = [];
    let next: string | null = null;

    for (let page = 0; page < 6; page += 1) {
      const url = new URL("https://api.paystack.co/bank");
      url.searchParams.set("country", "nigeria");
      url.searchParams.set("perPage", "100");
      url.searchParams.set("use_cursor", "true");
      if (next) url.searchParams.set("next", next);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${secret}` },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(15000),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !Array.isArray(body?.data)) break;

      all.push(...body.data);
      next = body?.meta?.next ?? null;

      if (!next) break;
    }

    const seen = new Set<string>();

    const banks = all
      .filter(
        (bank) =>
          bank.name &&
          bank.code &&
          bank.active !== false &&
          !bank.is_deleted &&
          (!bank.type || bank.type === "nuban"),
      )
      .filter((bank) => {
        if (seen.has(bank.code as string)) return false;
        seen.add(bank.code as string);
        return true;
      })
      .map((bank) => ({ name: bank.name as string, code: bank.code as string }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (banks.length === 0) {
      return NextResponse.json(
        { success: false, message: "Unable to load banks." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, banks });
  } catch (error) {
    console.error("PAYSTACK BANKS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load banks." },
      { status: 502 },
    );
  }
}