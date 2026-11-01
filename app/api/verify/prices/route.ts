import { NextResponse } from "next/server";

const PRICE_ENV: Record<string, string> = {
  "nin-regular": "AGEVERIFY_NIN_REGULAR_SLIP_PRICE",
  "nin-standard": "AGEVERIFY_NIN_STANDARD_SLIP_PRICE",
  "nin-premium": "AGEVERIFY_NIN_PREMIUM_SLIP_PRICE",

  "nin-phone-regular": "AGEVERIFY_NIN_PHONE_REGULAR_PRICE",
  "nin-phone-standard": "AGEVERIFY_NIN_PHONE_STANDARD_PRICE",
  "nin-phone-premium": "AGEVERIFY_NIN_PHONE_PREMIUM_PRICE",

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
    const value = Number(process.env[variable]);

    prices[service] = Number.isFinite(value) && value > 0 ? value : null;
  }

  return NextResponse.json(
    { prices },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
