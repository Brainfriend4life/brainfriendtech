import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PRICE_ENV: Record<string, string> = {
  nin: "AGEVERIFY_NIN_VERIFY_PRICE",
  "nin-phone": "AGEVERIFY_NIN_PHONE_PRICE",
  "nin-demo": "AGEVERIFY_NIN_DEMO_PRICE",
  bvn: "AGEVERIFY_BVN_VERIFY_PRICE",
  "nin-validation": "AGEVERIFY_NIN_VALIDATION_PRICE",
  "nin-validation-v2": "AGEVERIFY_NIN_VALIDATION_V2_PRICE",
  personalization: "AGEVERIFY_PERSONALIZATION_PRICE",
  "ipe-clearance": "AGEVERIFY_IPE_CLEARANCE_PRICE",
  "bvn-crm": "AGEVERIFY_BVN_CRM_PRICE",
  "modification-ipe": "AGEVERIFY_MODIFICATION_IPE_PRICE",
  "bvn-retrieval": "AGEVERIFY_BVN_RETRIEVAL_PRICE",
  "ipe-special": "AGEVERIFY_IPE_SPECIAL_PRICE",
};

export async function GET() {
  const prices: Record<string, number | null> = {};

  for (const [service, variable] of Object.entries(PRICE_ENV)) {
    const raw = process.env[variable];
    const value = Number(raw);

    prices[service] =
      raw !== undefined && raw.trim() !== "" &&
      Number.isFinite(value) && value >= 0
        ? value
        : null;
  }

  return NextResponse.json({ prices });
}
