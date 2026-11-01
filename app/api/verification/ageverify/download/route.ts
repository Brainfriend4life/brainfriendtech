import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

// Separate document purchases are retired: the slip now comes with the
// verification itself and is downloaded from the verification history
// (/api/verification/ageverify/file/<id>).

const DOWNLOADS: Record<string, { title: string; priceEnv: string }> = {
  "nin-standard-slip": {
    title: "NIN Standard Slip",
    priceEnv: "AGEVERIFY_NIN_STANDARD_SLIP_PRICE",
  },
  "nin-premium-slip": {
    title: "NIN Premium Slip",
    priceEnv: "AGEVERIFY_NIN_PREMIUM_SLIP_PRICE",
  },
  "nin-long-slip": {
    title: "NIN Long Slip",
    priceEnv: "AGEVERIFY_NIN_LONG_SLIP_PRICE",
  },
  "nin-datapage": {
    title: "NIN Datapage",
    priceEnv: "AGEVERIFY_NIN_DATAPAGE_PRICE",
  },
};

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Separate document purchases are no longer available. Your document is included with your verification and can be downloaded from your verification history.",
    },
    { status: 410 },
  );
}

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const prices: Record<string, number | null> = {};

    for (const [slug, service] of Object.entries(DOWNLOADS)) {
      const value = Number(process.env[service.priceEnv]);
      prices[slug] = Number.isFinite(value) && value > 0 ? value : null;
    }

    const verificationPrice = Number(process.env.AGEVERIFY_NIN_VERIFY_PRICE);
    prices["nin-verification"] =
      Number.isFinite(verificationPrice) && verificationPrice > 0
        ? verificationPrice
        : null;

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("DOCUMENT PRICE ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load document prices." },
      { status: 500 },
    );
  }
}
