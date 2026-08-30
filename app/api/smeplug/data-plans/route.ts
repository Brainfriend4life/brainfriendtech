import { NextResponse } from "next/server";

const SMEPLUG_PLANS_URL = "https://smeplug.ng/api/v1/data/plans";

const SMEPLUG_NETWORK_NAMES: Record<number, string> = {
 1: "MTN",
 2: "AIRTEL",
  3: "9MOBILE",
 4: "GLO",
};

const ENABLED_NETWORK_IDS = [1, 2, 4];

const SMEPLUG_MARKUP_PERCENT = Number(process.env.SMEPLUG_MARKUP_PERCENT?? 5);

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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()!== "") {
    const cleaned = value.replace(/₦/g, "").replace(/NGN/gi, "").replace(/,/g, "").trim();
    const number = Number(cleaned);
    if (Number.isFinite(number)) return number;
  }
  return fallback;
}

function extractSizeFromName(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?\s?(?:GB|MB|TB))/i);
  return match? match[1].replace(/\s+/g, "") : name;
}

function extractDurationFromName(name: string): string {
  const numericMatch = name.match(/(\d+\s?(?:day|days|week|weeks|month|months|year|years))/i);
  if (numericMatch) return numericMatch[1].trim();
  const adjectiveMatch = name.match(/\b(daily|weekly|monthly|yearly)\b/i);
  if (adjectiveMatch) return adjectiveMatch[1].charAt(0).toUpperCase() + adjectiveMatch[1].slice(1).toLowerCase();
  return "";
}

async function fetchAndFilterPlans() {
  const apiKey = process.env.SMEPLUG_API_KEY;
  if (!apiKey) throw new Error("SMEPlug API key is not configured.");

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

  // HANDLE BOTH result.data AND result.plans
  const sourceData = result.data || result.plans || {};
  const allPlans: any[] = [];

  for (const networkId of ENABLED_NETWORK_IDS) {
    // Handle both "1" and 1 as keys
    const rawList = sourceData[String(networkId)] || sourceData[networkId] || [];
    if (!Array.isArray(rawList)) continue;

    for (const raw of rawList) {
      const name = String(firstValue(raw.name, raw.plan, raw.plan_name, raw.title)?? "").trim();
      if (!name) continue;

      // Skip only routers/broadband
      if (/router|broadband|fibrex|odu/i.test(name)) continue;

      const planId = firstValue(raw.id, raw.plan_id, raw.planId);
      if (!planId) continue;

      // Use whatever price is available. Don't block price=0
      const providerPrice = extractNumber(
        firstValue(raw.telco_price, raw.network_price, raw.cost, raw.price, raw.amount),
        0
      );
      if (providerPrice <= 0) continue; // Only skip if truly 0

      const sellingPrice =
        SMEPLUG_MARKUP_PERCENT > 0
       ? Number((providerPrice * (1 + SMEPLUG_MARKUP_PERCENT / 100)).toFixed(2))
        : providerPrice;

      allPlans.push({
        id: `SMEPLUG-${networkId}-${planId}`,
        provider: SMEPLUG_NETWORK_NAMES[networkId],
        networkId,
        planId,
        plan_id: planId,
        name,
        size: extractSizeFromName(name),
        duration: extractDurationFromName(name),
        providerPrice,
        sellingPrice,
        status: "ACTIVE",
      });
    }
  }

  const groupedByProvider: Record<string, any[]> = {};
  for (const plan of allPlans) {
    if (!groupedByProvider[plan.provider]) groupedByProvider[plan.provider] = [];
    groupedByProvider[plan.provider].push(plan);
  }

  return groupedByProvider;
}

export async function GET() {
  try {
    if (cachedData && Date.now() - lastFetch < CACHE_DURATION) {
      return NextResponse.json({ success: true, data: cachedData, cached: true });
    }

    const data = await fetchAndFilterPlans();
    cachedData = data;
    lastFetch = Date.now();

    return NextResponse.json({ success: true, data, cached: false });
  } 
  catch (error: any) {
    console.error("SMEPLUG DATA PLANS ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Unable to load SMEPlug data plans." },
      { status: 500 }
    );
  }
}
