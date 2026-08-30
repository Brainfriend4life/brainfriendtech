import { NextResponse } from "next/server";

const SMEPLUG_PLANS_URL = "https://smeplug.ng/api/v1/data/plans";

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
  process.env.SMEPLUG_MARKUP_PERCENT?? 5
);

// Cache for 30 minutes
let cachedData: Record<string, any[]> | null = null;
let lastFetch = 0;
const CACHE_DURATION = 30 * 60 * 1000;

function firstValue(...values: unknown[]): unknown {
  for (const value of values) {
    if (value!== undefined && value!== null && value!== "") {
      return value;
    }
  }
  return null;
}

function extractNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()!== "") {
    const cleaned = value.replace(/₦/g, "").replace(/NGN/gi, "").replace(/,/g, "").trim();
    const number = Number(cleaned);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return fallback;
}

function extractSizeFromName(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?\s?(?:GB|MB|TB))/i);
  return match? match[1].replace(/\s+/g, "") : "";
}

function extractDurationFromName(name: string): string {
  const numericMatch = name.match(/(\d+\s?(?:day|days|week|weeks|month|months|year|years))/i);
  if (numericMatch) {
    return numericMatch[1].trim();
  }
  const adjectiveMatch = name.match(/\b(daily|weekly|monthly|yearly)\b/i);
  if (adjectiveMatch) {
    return adjectiveMatch[1].charAt(0).toUpperCase() + adjectiveMatch[1].slice(1).toLowerCase();
  }
  return "";
}

async function fetchAndFilterPlans() {
  const apiKey = process.env.SMEPLUG_API_KEY;
  if (!apiKey) {
    throw new Error("SMEPlug API key is not configured.");
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

  const result = await response.json();

  if (!response.ok || result.status === false) {
    throw new Error(result?.msg || result?.message || "Unable to load SMEPlug data plans.");
  }

  const grouped = result.data && typeof result.data === "object"? result.data : {};
  const allPlans: any[] = [];

  for (const networkId of ENABLED_NETWORK_IDS) {
    const rawList = Array.isArray(grouped[String(networkId)])
     ? grouped[String(networkId)]
      : Array.isArray(grouped[networkId])
     ? grouped[networkId]
      : [];

    for (const raw of rawList) {
      const name = String(firstValue(raw.name, raw.plan, raw.plan_name, raw.title)?? "").trim();

      if (name && EXCLUDED_NAME_PATTERN.test(name)) {
        continue;
      }

      const planId = firstValue(raw.id, raw.plan_id, raw.planId);
      if (planId === null || planId === undefined || planId === "") {
        continue;
      }

      // CRITICAL: SMEPLUG "price" = 0 means plan is disabled/unavailable
      const smeplugWalletPrice = extractNumber(raw.price, 0);
      if (smeplugWalletPrice <= 0) {
        continue; // This removes 6.5GB Awoof etc
      }

      const providerPrice = extractNumber(
        firstValue(raw.telco_price, raw.network_price, raw.cost),
        0
      );

      if (!(providerPrice > 0)) {
        continue;
      }

      const sellingPrice =
        SMEPLUG_MARKUP_PERCENT > 0
         ? Number((providerPrice * (1 + SMEPLUG_MARKUP_PERCENT / 100)).toFixed(2))
          : providerPrice;

      const size = extractSizeFromName(name) || name;
      const duration = extractDurationFromName(name);

      allPlans.push({
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
        status: "ACTIVE",
      });
    }
  }

  const groupedByProvider: Record<string, any[]> = {};
  for (const plan of allPlans) {
    if (!groupedByProvider[plan.provider]) {
      groupedByProvider[plan.provider] = [];
    }
    groupedByProvider[plan.provider].push(plan);
  }

  return groupedByProvider;
}

export async function GET() {
  try 
    if (cachedData && Date.now() - lastFetch < CACHE_DURATION) {
      console.log("SMEPLUG PLANS: Returning cached data");
      return NextResponse.json({ success: true, data: cachedData, cached: true });
    }

    console.log("SMEPLUG PLANS: Fetching fresh data");
    const data = await fetchAndFilterPlans();

    cachedData = data;
    lastFetch = Date.now();

    return NextResponse.json({
      success: true,
      data,
      cached: false,
    });
  } catch (error: any) {
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
