import { NextResponse } from "next/server";

import {
  getUnavailableSmePlugPlanKeys,
  smePlugPlanKey,
} from "@/lib/smeplug-availability";

// ============================================================
// SMEPLUG — DATA PLANS (GET)
//
// Fetches live plans from SMEPlug's /data/plans endpoint.
//
// IMPORTANT PRICING NOTE (confirmed against live API data):
// SMEPlug's raw plan objects look like:
//   { id, name, dispense_method, input_type, telco_price, price }
//
// `telco_price` is consistently populated and matches the
// "Network Price" column from SMEPlug's dashboard — this is
// the real cost charged against our balance.
//
// `price` (their "Wallet Price") is populated on some plans
// and missing/0 on many others (mostly older "Gifting" plans),
// even though those plans are fully purchasable via SIM dispense.
// Relying on `price` silently drops ~80% of legitimate plans and
// is not reliable enough to use for billing.
//
// So: providerCost = telco_price. Selling price checks the
// SMEPLUG_PRICE_OVERRIDES table first (exact prices you've set
// per plan); anything not listed falls back to our own markup,
// same pattern as NetworkDataSub.
//
// AVAILABILITY NOTE (confirmed):
// SMEPlug's raw plan objects carry NO availability/stock field —
// every plan across every network has exactly the same shape
// (id, name, dispense_method, input_type, telco_price, price),
// with dispense_method always "SIM" and input_type always 0.
// There is nothing to read here.
//
// So availability is INFERRED from real purchase attempts instead
// (see /lib/smeplug-availability.ts): when a purchase against a
// plan fails with a message that looks like a stock-out, that
// plan is flagged unavailable for a while. This route reads those
// flags and returns `isAvailable` per plan so the frontend can
// grey out plans instead of hiding them.
// ============================================================

const SMEPLUG_PLANS_URL = "https://smeplug.ng/api/v1/data/plans";

// Confirmed from SMEPlug's /api/v1/networks endpoint.
// NOTE: Glo is 4, not 3 — this is NOT the usual convention.
const SMEPLUG_NETWORK_NAMES: Record<number, string> = {
  1: "MTN",
  2: "AIRTEL",
  3: "9MOBILE",
  4: "GLO",
};

// 9mobile intentionally excluded per business decision.
const ENABLED_NETWORK_IDS = [1, 2, 4];

// Skip routers, broadband, voice bundles, corporate/enterprise plans.
const EXCLUDED_NAME_PATTERN =
  /router|broadband|fibrex|odu|flexi|talk\s*more|corporate|mbps/i;

const SMEPLUG_MARKUP_PERCENT = Number(
  process.env.SMEPLUG_MARKUP_PERCENT ?? 5
);

// Custom per-plan prices (Airtel, confirmed). Any plan_id NOT
// listed here falls back automatically to the markup formula.
const SMEPLUG_PRICE_OVERRIDES: Record<number, number> = {
  320: 80,
  321: 150,
  322: 300,
  407: 550,
  411: 550,
  448: 600,
  409: 850,
  449: 1100,
  450: 2100,
  325: 3200,
  327: 5200,
  451: 10200,
  284: 70,
  285: 85,
  286: 150,
  287: 150,
  288: 250,
  289: 350,
};

// ============================================================
// HELPERS
// ============================================================

function firstValue(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function extractNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const cleaned = value
      .replace(/₦/g, "")
      .replace(/NGN/gi, "")
      .replace(/,/g, "")
      .trim();

    const number = Number(cleaned);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return fallback;
}

// Extracts "150MB", "1.5GB" etc. from a plan name.
function extractSizeFromName(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?\s?(?:GB|MB|TB))/i);
  return match ? match[1].replace(/\s+/g, "") : "";
}

// Extracts "1 Day", "30 Days", "2 Weeks" etc. from a plan name.
function extractDurationFromName(name: string): string {
  const numericMatch = name.match(
    /(\d+\s?(?:day|days|week|weeks|month|months|year|years))/i
  );

  if (numericMatch) {
    return numericMatch[1].trim();
  }

  // Fallback: adjective form ("Daily", "Weekly", "Monthly", "Yearly")
  // used by many MTN plan names instead of a numeric duration.
  const adjectiveMatch = name.match(/\b(daily|weekly|monthly|yearly)\b/i);

  if (adjectiveMatch) {
    return (
      adjectiveMatch[1].charAt(0).toUpperCase() +
      adjectiveMatch[1].slice(1).toLowerCase()
    );
  }

  return "";
}

// ============================================================
// GET
// ============================================================

export async function GET() {
  try {
    const apiKey = process.env.SMEPLUG_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "SMEPlug API key is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(SMEPLUG_PLANS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    const responseText = await response.text();

    console.log("SMEPLUG DATA PLANS STATUS:", response.status);
    console.log("SMEPLUG DATA PLANS RESPONSE:", responseText);

    let result: any = null;

    try {
      result = responseText.trim() ? JSON.parse(responseText) : null;
    } catch (error) {
      console.error("SMEPLUG DATA PLANS JSON ERROR:", error);
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "SMEPlug returned an invalid plans response.",
        },
        { status: 502 }
      );
    }

    if (!response.ok || result.status === false) {
      return NextResponse.json(
        {
          success: false,
          message:
            result?.msg ||
            result?.message ||
            "Unable to load SMEPlug data plans.",
        },
        { status: 502 }
      );
    }

    const grouped =
      result.data && typeof result.data === "object" ? result.data : {};

    // Plans flagged unavailable from real purchase failures — see
    // /lib/smeplug-availability.ts. Fetched once per request.
    const unavailableKeys = await getUnavailableSmePlugPlanKeys();

    const plans: Array<{
      id: string;
      provider: string;
      networkId: number;
      planId: string | number;
      plan_id: string | number;
      name: string;
      size: string;
      duration: string;
      providerPrice: number;
      sellingPrice: number;
      status: string;
      isAvailable: boolean;
    }> = [];

    for (const networkId of ENABLED_NETWORK_IDS) {
      const rawList = Array.isArray(grouped[String(networkId)])
        ? grouped[String(networkId)]
        : Array.isArray(grouped[networkId])
        ? grouped[networkId]
        : [];

      for (const raw of rawList) {
        const name = String(
          firstValue(raw.name, raw.plan, raw.plan_name, raw.title) ?? ""
        ).trim();

        if (name && EXCLUDED_NAME_PATTERN.test(name)) {
          continue;
        }

        const planId = firstValue(raw.id, raw.plan_id, raw.planId);

        if (planId === null || planId === undefined || planId === "") {
          continue;
        }

        // providerCost: ALWAYS prefer telco_price — it's the
        // consistently-populated real cost. Fall back to other
        // candidates only if telco_price is genuinely absent.
        const providerPrice = extractNumber(
          firstValue(
            raw.telco_price,
            raw.network_price,
            raw.cost,
            raw.price,
            raw.amount
          ),
          0
        );

        if (!(providerPrice > 0)) {
          // No usable cost at all for this plan — skip it rather
          // than risk selling at ₦0 cost basis. (Data integrity
          // skip, unrelated to stock availability.)
          continue;
        }

        // Selling price: check the override table first — any
        // plan_id listed there uses the exact price you set.
        // Everything else falls back to the markup formula.
        const overridePrice = SMEPLUG_PRICE_OVERRIDES[Number(planId)];

        const sellingPrice =
          Number.isFinite(overridePrice) && overridePrice > 0
            ? overridePrice
            : SMEPLUG_MARKUP_PERCENT > 0
            ? Number(
                (
                  providerPrice *
                  (1 + SMEPLUG_MARKUP_PERCENT / 100)
                ).toFixed(2)
              )
            : providerPrice;

        const size = extractSizeFromName(name) || name;
        const duration = extractDurationFromName(name);

        const isAvailable = !unavailableKeys.has(
          smePlugPlanKey(networkId, planId as string | number)
        );

        plans.push({
          id: `SMEPLUG-${networkId}-${planId}`,
          provider: SMEPLUG_NETWORK_NAMES[networkId],
          networkId,
          planId: planId as string | number,
          plan_id: planId as string | number,
          name,
          size,
          duration,
          providerPrice,
          sellingPrice,
          status: isAvailable ? "ACTIVE" : "UNAVAILABLE",
          isAvailable,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } 
  catch (error: any) {
    console.error("SMEPLUG DATA PLANS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load SMEPlug data plans.",
      },
      { status: 500 }
    );
  }
}
