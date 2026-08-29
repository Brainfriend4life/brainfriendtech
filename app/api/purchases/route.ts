import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { verifyTransactionPin } from "@/lib/security/verifyTransactionPin";

import {
  getServiceFeePercent,
  calculateServiceFee,
} from "@/lib/service-fee";

// ============================================================
// PROVIDER URLS
// ============================================================

const CHEAPDATAHUB_DATA_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/data/purchase/";

const NETWORKDATASUB_BASE_URL =
  "https://www.networkdatasub.com/api";

const NETWORKDATASUB_PLANS_URL =
  `${NETWORKDATASUB_BASE_URL}/data/all-plans`;

const NETWORKDATASUB_PURCHASE_URL =
  `${NETWORKDATASUB_BASE_URL}/data/purchase`;

// ============================================================
// SMEPLUG
// ============================================================

const SMEPLUG_BASE_URL = "https://smeplug.ng/api/v1";

const SMEPLUG_PLANS_URL = `${SMEPLUG_BASE_URL}/data/plans`;

const SMEPLUG_PURCHASE_URL = `${SMEPLUG_BASE_URL}/data/purchase`;

// Confirmed from SMEPlug's /api/v1/networks endpoint.
// NOTE: Glo is 4, not 3 — this is NOT the usual convention.
const SMEPLUG_NETWORK_NAMES: Record<number, string> = {
  1: "mtn",
  2: "airtel",
  3: "9mobile",
  4: "glo",
};

// 9mobile intentionally excluded per business decision.
const SMEPLUG_ENABLED_NETWORK_IDS = [1, 2, 4];

// Applied only when SMEPlug doesn't return a distinct selling
// price separate from their cost price.
const SMEPLUG_MARKUP_PERCENT = Number(
  process.env.SMEPLUG_MARKUP_PERCENT ?? 5
);

// ============================================================
// SETTINGS
// ============================================================

const REFERRAL_COMMISSION_SETTING_KEY =
  "REFERRAL_COMMISSION_DATA";

const DEFAULT_REFERRAL_COMMISSION_PERCENTAGE = 1;

// ============================================================
// NETWORKDATASUB MARKUP
// ============================================================

const NETWORKDATASUB_MARKUP_PERCENT = Number(
  process.env.NETWORKDATASUB_MARKUP_PERCENT ?? 5
);

// ============================================================
// CHEAPDATAHUB DATA PLANS
// ============================================================

const dataPlans: Record<
  number,
  {
    provider: string;
    size: string;
    duration: string;
    price: number;
    resellerPrice: number;
    apiPrice: number;
  }
> = {
  70: {
    provider: "airtel",
    size: "1GB (Social Bundle)",
    duration: "3 Days",
    price: 350,
    resellerPrice: 330,
    apiPrice: 295,
  },

  13: {
    provider: "airtel",
    size: "500MB",
    duration: "7 Days",
    price: 500,
    resellerPrice: 495,
    apiPrice: 490,
  },

  69: {
    provider: "airtel",
    size: "1.5GB",
    duration: "1 Day",
    price: 530,
    resellerPrice: 520,
    apiPrice: 500,
  },

  66: {
    provider: "airtel",
    size: "1.5GB",
    duration: "2 Days",
    price: 650,
    resellerPrice: 630,
    apiPrice: 599,
  },

  15: {
    provider: "airtel",
    size: "1GB",
    duration: "7 Days",
    price: 1000,
    resellerPrice: 800,
    apiPrice: 800,
  },

  17: {
    provider: "airtel",
    size: "2GB",
    duration: "30 Days",
    price: 1550,
    resellerPrice: 1550,
    apiPrice: 1490,
  },

  52: {
    provider: "airtel",
    size: "5GB",
    duration: "7 Days",
    price: 1599,
    resellerPrice: 1575,
    apiPrice: 1570,
  },

  18: {
    provider: "airtel",
    size: "3GB",
    duration: "30 Days",
    price: 2100,
    resellerPrice: 1999,
    apiPrice: 1960,
  },

  22: {
    provider: "airtel",
    size: "6GB",
    duration: "7 Days",
    price: 2599,
    resellerPrice: 2495,
    apiPrice: 2455,
  },

  19: {
    provider: "airtel",
    size: "4GB",
    duration: "30 Days",
    price: 2650,
    resellerPrice: 2599,
    apiPrice: 2570,
  },

  20: {
    provider: "airtel",
    size: "8GB",
    duration: "30 Days",
    price: 3200,
    resellerPrice: 3100,
    apiPrice: 2999,
  },

  21: {
    provider: "airtel",
    size: "10GB",
    duration: "30 Days",
    price: 4200,
    resellerPrice: 4099,
    apiPrice: 4070,
  },

  42: {
    provider: "glo",
    size: "200MB",
    duration: "1 Day",
    price: 100,
    resellerPrice: 95,
    apiPrice: 92,
  },

  35: {
    provider: "glo",
    size: "500MB",
    duration: "30 Days",
    price: 250,
    resellerPrice: 230,
    apiPrice: 225,
  },

  68: {
    provider: "glo",
    size: "1GB",
    duration: "3 Days",
    price: 350,
    resellerPrice: 300,
    apiPrice: 300,
  },

  36: {
    provider: "glo",
    size: "1GB",
    duration: "30 Days",
    price: 450,
    resellerPrice: 430,
    apiPrice: 425,
  },

  41: {
    provider: "glo",
    size: "1GB",
    duration: "14 Days",
    price: 500,
    resellerPrice: 490,
    apiPrice: 485,
  },

  40: {
    provider: "glo",
    size: "2GB",
    duration: "30 Days",
    price: 900,
    resellerPrice: 850,
    apiPrice: 850,
  },

  37: {
    provider: "glo",
    size: "3GB",
    duration: "30 Days",
    price: 1500,
    resellerPrice: 1300,
    apiPrice: 1300,
  },

  54: {
    provider: "glo",
    size: "5GB",
    duration: "7 Days",
    price: 1800,
    resellerPrice: 1750,
    apiPrice: 1699,
  },

  38: {
    provider: "glo",
    size: "5GB",
    duration: "30 Days",
    price: 2400,
    resellerPrice: 2300,
    apiPrice: 2250,
  },

  39: {
    provider: "glo",
    size: "10GB",
    duration: "30 Days",
    price: 4500,
    resellerPrice: 4399,
    apiPrice: 4390,
  },

  59: {
    provider: "glo",
    size: "20.5GB",
    duration: "30 Days",
    price: 6000,
    resellerPrice: 5500,
    apiPrice: 5300,
  },

  58: {
    provider: "glo",
    size: "107GB",
    duration: "30 Days",
    price: 20000,
    resellerPrice: 19500,
    apiPrice: 19300,
  },

  43: {
    provider: "mtn",
    size: "110MB",
    duration: "1 Day",
    price: 100,
    resellerPrice: 99,
    apiPrice: 99,
  },

  74: {
    provider: "mtn",
    size: "230MB",
    duration: "1 Day",
    price: 250,
    resellerPrice: 230,
    apiPrice: 200,
  },

  76: {
    provider: "mtn",
    size: "500MB",
    duration: "2 Days",
    price: 270,
    resellerPrice: 270,
    apiPrice: 250,
  },

  78: {
    provider: "mtn",
    size: "1GB",
    duration: "1 Day",
    price: 300,
    resellerPrice: 300,
    apiPrice: 270,
  },

  81: {
    provider: "mtn",
    size: "1GB",
    duration: "30 Days",
    price: 350,
    resellerPrice: 350,
    apiPrice: 280,
  },

  44: {
    provider: "mtn",
    size: "500MB",
    duration: "30 Days",
    price: 400,
    resellerPrice: 390,
    apiPrice: 350,
  },

  77: {
    provider: "mtn",
    size: "1GB",
    duration: "2 Days",
    price: 450,
    resellerPrice: 440,
    apiPrice: 399,
  },

  45: {
    provider: "mtn",
    size: "1GB",
    duration: "7 Days",
    price: 499,
    resellerPrice: 450,
    apiPrice: 450,
  },

  46: {
    provider: "mtn",
    size: "1GB",
    duration: "30 Days",
    price: 600,
    resellerPrice: 570,
    apiPrice: 570,
  },

  79: {
    provider: "mtn",
    size: "2.5GB",
    duration: "1 Day",
    price: 650,
    resellerPrice: 650,
    apiPrice: 600,
  },

  47: {
    provider: "mtn",
    size: "2GB",
    duration: "7 Days",
    price: 950,
    resellerPrice: 930,
    apiPrice: 930,
  },

  27: {
    provider: "mtn",
    size: "2.5GB",
    duration: "2 Days",
    price: 1000,
    resellerPrice: 950,
    apiPrice: 900,
  },

  71: {
    provider: "mtn",
    size: "2GB",
    duration: "7 Days",
    price: 1000,
    resellerPrice: 950,
    apiPrice: 900,
  },

  60: {
    provider: "mtn",
    size: "4.5GB",
    duration: "1 Day",
    price: 1100,
    resellerPrice: 1100,
    apiPrice: 1050,
  },

  48: {
    provider: "mtn",
    size: "2GB",
    duration: "30 Days",
    price: 1250,
    resellerPrice: 1199,
    apiPrice: 1150,
  },

  61: {
    provider: "mtn",
    size: "4GB",
    duration: "2 Days",
    price: 1300,
    resellerPrice: 1200,
    apiPrice: 1175,
  },

  82: {
    provider: "mtn",
    size: "5GB",
    duration: "30 Days",
    price: 1500,
    resellerPrice: 1400,
    apiPrice: 1299,
  },

  80: {
    provider: "mtn",
    size: "5GB",
    duration: "14 Days",
    price: 1500,
    resellerPrice: 1400,
    apiPrice: 1299,
  },

  49: {
    provider: "mtn",
    size: "3GB",
    duration: "30 Days",
    price: 1500,
    resellerPrice: 1399,
    apiPrice: 1370,
  },

  50: {
    provider: "mtn",
    size: "5GB",
    duration: "30 Days",
    price: 2300,
    resellerPrice: 2099,
    apiPrice: 2050,
  },

  53: {
    provider: "mtn",
    size: "6GB",
    duration: "7 Days",
    price: 2600,
    resellerPrice: 2500,
    apiPrice: 2495,
  },

  55: {
    provider: "mtn",
    size: "11GB",
    duration: "7 Days",
    price: 3600,
    resellerPrice: 3600,
    apiPrice: 3550,
  },

  33: {
    provider: "mtn",
    size: "7GB",
    duration: "30 Days",
    price: 3800,
    resellerPrice: 3700,
    apiPrice: 3600,
  },

  67: {
    provider: "mtn",
    size: "10GB",
    duration: "30 Days",
    price: 5000,
    resellerPrice: 4900,
    apiPrice: 4800,
  },

  57: {
    provider: "mtn",
    size: "36GB",
    duration: "30 Days",
    price: 11000,
    resellerPrice: 10900,
    apiPrice: 10900,
  },

  51: {
    provider: "mtn",
    size: "75GB",
    duration: "30 Days",
    price: 18500,
    resellerPrice: 17999,
    apiPrice: 17990,
  },
};

// ============================================================
// HELPERS
// ============================================================

function normalizePhone(phone: unknown): string {
  let value = String(phone ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (value.startsWith("+234")) {
    value = "0" + value.slice(4);
  } else if (value.startsWith("234")) {
    value = "0" + value.slice(3);
  }

  return value;
}

function toNumber(value: unknown, fallback = 0): number {
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

function firstValue(...values: unknown[]): unknown {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function extractNumber(
  value: unknown,
  fallback = 0
): number {
  const direct = toNumber(value, NaN);

  if (Number.isFinite(direct)) {
    return direct;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const object =
      value as Record<string, unknown>;

    const nested = firstValue(
      object.value,
      object.amount,
      object.price,
      object.cost,
      object.selling_price,
      object.sellingPrice,
      object.provider_price,
      object.providerPrice,
      object.customer_price,
      object.customerPrice,
      object.retail_price,
      object.retailPrice,
      object.reseller_price,
      object.resellerPrice,
      object.api_price,
      object.apiPrice
    );

    if (nested !== null) {
      return extractNumber(
        nested,
        fallback
      );
    }
  }

  return fallback;
}

function toText(
  value: unknown,
  fallback = ""
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const object =
      value as Record<string, unknown>;

    const nested = firstValue(
      object.name,
      object.title,
      object.label,
      object.value,
      object.text,
      object.duration,
      object.validity,
      object.period,
      object.days
    );

    if (nested !== null) {
      return toText(
        nested,
        fallback
      );
    }
  }

  return fallback;
}

// ============================================================
// FIXED NETWORK PROVIDER NORMALIZER
// ============================================================

function normalizeProvider(
  plan: any
): string {
  const provider = firstValue(
    plan.provider,
    plan.network,
    plan.network_name,
    plan.networkName,
    plan.network_provider,
    plan.operator,
    plan.operator_name,
    plan.operatorName
  );

  if (
    typeof provider === "object" &&
    provider !== null
  ) {
    // IMPORTANT:
    // Explicitly cast the nested object so
    // TypeScript allows property access.
    const providerObject =
      provider as Record<string, unknown>;

    return toText(
      firstValue(
        providerObject.name,
        providerObject.network,
        providerObject.network_name,
        providerObject.networkName,
        providerObject.title,
        providerObject.code
      )
    );
  }

  return toText(provider);
}

function normalizeSize(
  plan: any
): string {
  const size = firstValue(
    plan.size,
    plan.data,
    plan.data_size,
    plan.dataSize,
    plan.bundle_size,
    plan.bundleSize,
    plan.volume,
    plan.capacity,
    plan.data_volume,
    plan.dataVolume
  );

  if (
    typeof size === "object" &&
    size !== null
  ) {
    const object =
      size as Record<string, unknown>;

    const value = firstValue(
      object.value,
      object.size,
      object.data,
      object.volume,
      object.capacity,
      object.name
    );

    const unit = firstValue(
      object.unit,
      object.type
    );

    if (
      value !== null &&
      unit !== null
    ) {
      return `${toText(value)} ${toText(unit)}`;
    }

    if (value !== null) {
      return toText(value);
    }
  }

  return toText(size);
}

function normalizeName(
  plan: any
): string {
  return toText(
    firstValue(
      plan.name,
      plan.plan_name,
      plan.planName,
      plan.title,
      plan.bundle_name,
      plan.bundleName,
      plan.description,
      plan.plan
    )
  );
}

function normalizeDuration(
  value: unknown
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return `${value} Days`;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const object =
      value as Record<string, unknown>;

    const days = firstValue(
      object.days,
      object.day,
      object.duration_days,
      object.durationDays
    );

    if (days !== null) {
      return `${toNumber(days)} Days`;
    }

    const weeks = firstValue(
      object.weeks,
      object.week
    );

    if (weeks !== null) {
      return `${toNumber(weeks)} Weeks`;
    }

    const months = firstValue(
      object.months,
      object.month
    );

    if (months !== null) {
      return `${toNumber(months)} Months`;
    }

    const nestedValue = firstValue(
      object.value,
      object.name,
      object.title,
      object.label,
      object.text
    );

    if (nestedValue !== null) {
      const unit = firstValue(
        object.unit,
        object.type,
        object.period
      );

      if (unit !== null) {
        return `${toText(
          nestedValue
        )} ${toText(unit)}`;
      }

      return toText(nestedValue);
    }
  }

  return "";
}

function normalizeStatus(
  plan: any
): string {
  const status = firstValue(
    plan.status,
    plan.active,
    plan.is_active,
    plan.isActive,
    plan.enabled
  );

  if (typeof status === "boolean") {
    return status
      ? "ACTIVE"
      : "INACTIVE";
  }

  if (
    status === null ||
    status === undefined
  ) {
    return "ACTIVE";
  }

  return toText(
    status,
    "ACTIVE"
  ).toUpperCase();
}

function extractProviderPrice(
  plan: any
): number {
  const candidates = [
    plan.provider_price,
    plan.providerPrice,
    plan.cost,
    plan.cost_price,
    plan.costPrice,
    plan.api_price,
    plan.apiPrice,
    plan.reseller_price,
    plan.resellerPrice,
    plan.wholesale_price,
    plan.wholesalePrice,
    plan.buying_price,
    plan.buyingPrice,
    plan.purchase_price,
    plan.purchasePrice,
    plan.price,
  ];

  for (const candidate of candidates) {
    const value =
      extractNumber(
        candidate,
        NaN
      );

    if (
      Number.isFinite(value) &&
      value > 0
    ) {
      return value;
    }
  }

  const pricingObjects = [
    plan.pricing,
    plan.prices,
    plan.price_data,
    plan.priceData,
    plan.amounts,
  ];

  for (
    const pricing of pricingObjects
  ) {
    if (
      typeof pricing === "object" &&
      pricing !== null
    ) {
      const object =
        pricing as Record<
          string,
          unknown
        >;

      const value = firstValue(
        object.provider_price,
        object.providerPrice,
        object.cost,
        object.cost_price,
        object.costPrice,
        object.api_price,
        object.apiPrice,
        object.reseller_price,
        object.resellerPrice,
        object.wholesale_price,
        object.wholesalePrice,
        object.buying_price,
        object.buyingPrice,
        object.price,
        object.amount
      );

      const number =
        extractNumber(
          value,
          NaN
        );

      if (
        Number.isFinite(number) &&
        number > 0
      ) {
        return number;
      }
    }
  }

  return 0;
}

function extractSellingPrice(
  plan: any,
  providerPrice: number
): number {
  const candidates = [
    plan.selling_price,
    plan.sellingPrice,
    plan.customer_price,
    plan.customerPrice,
    plan.retail_price,
    plan.retailPrice,
    plan.reseller_selling_price,
    plan.resellerSellingPrice,
    plan.amount,
    plan.price,
  ];

  for (const candidate of candidates) {
    const value =
      extractNumber(
        candidate,
        NaN
      );

    if (
      Number.isFinite(value) &&
      value > 0
    ) {
      return value;
    }
  }

  const pricingObjects = [
    plan.pricing,
    plan.prices,
    plan.price_data,
    plan.priceData,
    plan.amounts,
  ];

  for (
    const pricing of pricingObjects
  ) {
    if (
      typeof pricing === "object" &&
      pricing !== null
    ) {
      const object =
        pricing as Record<
          string,
          unknown
        >;

      const value = firstValue(
        object.selling_price,
        object.sellingPrice,
        object.customer_price,
        object.customerPrice,
        object.retail_price,
        object.retailPrice,
        object.price,
        object.amount
      );

      const number =
        extractNumber(
          value,
          NaN
        );

      if (
        Number.isFinite(number) &&
        number > 0
      ) {
        return number;
      }
    }
  }

  return providerPrice;
}

function getNetworkDataSubPlanId(
  plan: any
): number | null {
  const candidates = [
    plan.plan_id,
    plan.planId,
    plan.api_plan_id,
    plan.apiPlanId,
    plan.id,
    plan.bundle_id,
    plan.bundleId,
  ];

  for (const value of candidates) {
    const number =
      toNumber(value, NaN);

    if (
      Number.isInteger(number) &&
      number > 0
    ) {
      return number;
    }
  }

  return null;
}

function matchesNetworkDataSubPlan(
  plan: any,
  requestedId: number
): boolean {
  const ids = [
    plan.plan_id,
    plan.planId,
    plan.api_plan_id,
    plan.apiPlanId,
    plan.id,
    plan.bundle_id,
    plan.bundleId,
  ];

  return ids.some(
    (value) =>
      toNumber(
        value,
        NaN
      ) === requestedId
  );
}

// ============================================================
// SMEPLUG PLAN NORMALIZER / MATCHER
// ============================================================

function getSmePlugPlanId(
  plan: any
): string | number | null {
  const candidates = [
    plan.plan_id,
    plan.planId,
    plan.id,
    plan.variation_id,
    plan.code,
  ];

  for (const value of candidates) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    const numeric = toNumber(value, NaN);

    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return null;
}

function matchesSmePlugPlan(
  plan: any,
  requestedId: number | string
): boolean {
  const ids = [
    plan.plan_id,
    plan.planId,
    plan.id,
    plan.variation_id,
    plan.code,
  ];

  return ids.some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() === String(requestedId).trim()
  );
}

// SMEPlug's raw plan objects have no separate size/duration
// fields — both are embedded in the name string, e.g.
// "150MB - 1 Day [Awoof]" or "Monthly Plan 5000 - Data - 13GB [Gifting]".
function extractSmePlugSizeFromName(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?\s?(?:GB|MB|TB))/i);
  return match ? match[1].replace(/\s+/g, "") : "";
}

function extractSmePlugDurationFromName(name: string): string {
  const match = name.match(
    /(\d+\s?(?:day|days|week|weeks|month|months|year|years))/i
  );
  return match ? match[1].trim() : "";
}

// IMPORTANT: SMEPlug's `price` field (their "Wallet Price") is
// inconsistently populated — many legitimate, purchasable plans
// (dispense_method: "SIM") have price = 0 while telco_price is
// always populated and matches their dashboard's "Network Price"
// column. telco_price is the real, reliable cost to us — always
// prefer it. See /api/smeplug/data-plans/route.ts for the same
// reasoning.
function extractSmePlugProviderPrice(plan: any): number {
  const candidates = [
    plan.telco_price,
    plan.network_price,
    plan.cost,
    plan.price,
    plan.amount,
  ];

  for (const candidate of candidates) {
    const value = extractNumber(candidate, NaN);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

// ============================================================
// REFERRAL COMMISSION
// ============================================================

async function getReferralCommissionPercentage(): Promise<number> {
  try {
    const setting =
      await prisma.systemSetting.findUnique(
        {
          where: {
            key:
              REFERRAL_COMMISSION_SETTING_KEY,
          },
        }
      );

    if (setting) {
      const value =
        Number(setting.value);

      if (
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
      ) {
        return value;
      }
    }
  } catch (error) {
    console.error(
      "DATA REFERRAL COMMISSION SETTING ERROR:",
      error
    );
  }

  return DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;
}

// ============================================================
// PROVIDER SUCCESS
// ============================================================

function isProviderSuccess(
  result: any
): boolean {
  if (result?.success === true) {
    return true;
  }

  const status =
    result?.status ??
    result?.data?.status ??
    result?.data?.transaction?.status;

  const normalized =
    String(
      status ?? ""
    ).toLowerCase();

  return [
    "true",
    "success",
    "successful",
    "completed",
    "complete",
  ].includes(normalized);
}

// ============================================================
// NETWORKDATASUB PLANS
// ============================================================

async function getNetworkDataSubPlans(
  apiKey: string
): Promise<any[]> {
  const response =
    await fetch(
      NETWORKDATASUB_PLANS_URL,
      {
        method: "GET",

        headers: {
          Authorization:
            `Token ${apiKey}`,
          Accept:
            "application/json",
          "Content-Type":
            "application/json",
        },

        cache: "no-store",

        signal:
          AbortSignal.timeout(
            30000
          ),
      }
    );

  const responseText =
    await response.text();

  console.log(
    "NETWORKDATASUB PLANS STATUS:",
    response.status
  );

  console.log(
    "NETWORKDATASUB PLANS RESPONSE:",
    responseText
  );

  let result: any = null;

  try {
    result =
      responseText.trim()
        ? JSON.parse(
            responseText
          )
        : null;
  } catch (error) {
    console.error(
      "NETWORKDATASUB PLANS JSON ERROR:",
      error
    );
  }

  if (!result) {
    throw new Error(
      "NetworkDataSub returned an invalid plans response."
    );
  }

  if (
    !response.ok ||
    result.success === false
  ) {
    throw new Error(
      result.message ||
        result.error ||
        "Unable to retrieve NetworkDataSub data plans."
    );
  }

  const rawPlans =
    Array.isArray(result.data)
      ? result.data
      : Array.isArray(
          result.data?.plans
        )
      ? result.data.plans
      : Array.isArray(
          result.data?.data
        )
      ? result.data.data
      : Array.isArray(
          result.plans
        )
      ? result.plans
      : Array.isArray(
          result.results
        )
      ? result.results
      : Array.isArray(result)
      ? result
      : [];

  console.log(
    "NETWORKDATASUB RAW PLAN COUNT:",
    rawPlans.length
  );

  return rawPlans;
}

// ============================================================
// GET NETWORKDATASUB PLAN
// ============================================================

async function getNetworkDataSubPlan(
  apiKey: string,
  requestedPlanId: number
) {
  const rawPlans =
    await getNetworkDataSubPlans(
      apiKey
    );

  const plan =
    rawPlans.find(
      (item) =>
        matchesNetworkDataSubPlan(
          item,
          requestedPlanId
        )
    );

  if (!plan) {
    return null;
  }

  const provider =
    normalizeProvider(plan);

  const size =
    normalizeSize(plan);

  const name =
    normalizeName(plan);

  const duration =
    normalizeDuration(
      firstValue(
        plan.duration,
        plan.validity,
        plan.validity_period,
        plan.validityPeriod,
        plan.duration_period,
        plan.durationPeriod
      )
    );

  const providerPrice =
    extractProviderPrice(plan);

  let sellingPrice =
    extractSellingPrice(
      plan,
      providerPrice
    );

  // NetworkDataSub currently exposes
  // the same price as provider cost.
  //
  // Apply server-side markup only when
  // there is no distinct selling price.

  if (
    providerPrice > 0 &&
    sellingPrice === providerPrice &&
    NETWORKDATASUB_MARKUP_PERCENT > 0
  ) {
    sellingPrice =
      Number(
        (
          providerPrice *
          (
            1 +
            NETWORKDATASUB_MARKUP_PERCENT /
              100
          )
        ).toFixed(2)
      );
  }

  const networkId =
    toNumber(
      firstValue(
        plan.network_id,
        plan.networkId,
        typeof plan.network ===
          "object" &&
        plan.network !== null
          ? (
              plan.network as Record<
                string,
                unknown
              >
            ).id
          : null
      ),
      0
    );

  const planId =
    getNetworkDataSubPlanId(
      plan
    );

  return {
    raw: plan,

    id: String(
      firstValue(
        plan.id,
        plan.plan_id,
        plan.planId,
        plan.api_plan_id,
        plan.apiPlanId,
        requestedPlanId
      )
    ),

    planId,

    apiPlanId:
      toNumber(
        firstValue(
          plan.api_plan_id,
          plan.apiPlanId
        ),
        0
      ) || null,

    networkId:
      networkId || null,

    provider,

    name,

    size,

    duration,

    providerPrice,

    sellingPrice,

    status:
      normalizeStatus(plan),
  };
}

// ============================================================
// SMEPLUG PLANS
// ============================================================

async function getSmePlugPlans(
  apiKey: string
): Promise<Record<number, any[]>> {
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

  console.log("SMEPLUG PLANS STATUS:", response.status);

  console.log("SMEPLUG PLANS RESPONSE:", responseText);

  let result: any = null;

  try {
    result = responseText.trim() ? JSON.parse(responseText) : null;
  } catch (error) {
    console.error("SMEPLUG PLANS JSON ERROR:", error);
  }

  if (!result) {
    throw new Error(
      "SMEPlug returned an invalid plans response."
    );
  }

  if (!response.ok || result.status === false) {
    throw new Error(
      result.msg ||
        result.message ||
        "Unable to retrieve SMEPlug data plans."
    );
  }

  const grouped =
    result.data && typeof result.data === "object"
      ? result.data
      : {};

  const normalizedGroups: Record<number, any[]> = {};

  for (const key of Object.keys(grouped)) {
    const networkId = Number(key);

    if (!Number.isFinite(networkId)) {
      continue;
    }

    normalizedGroups[networkId] = Array.isArray(
      grouped[key]
    )
      ? grouped[key]
      : [];
  }

  return normalizedGroups;
}

// ============================================================
// GET SMEPLUG PLAN
// ============================================================

async function getSmePlugPlan(
  apiKey: string,
  networkId: number,
  requestedPlanId: number | string
) {
  const grouped = await getSmePlugPlans(apiKey);

  const rawPlans = grouped[networkId] || [];

  const plan = rawPlans.find((item) =>
    matchesSmePlugPlan(item, requestedPlanId)
  );

  if (!plan) {
    return null;
  }

  const name = String(
    firstValue(plan.name, plan.plan, plan.plan_name, plan.title) ?? ""
  ).trim();

  const size = extractSmePlugSizeFromName(name) || name;

  const duration = extractSmePlugDurationFromName(name);

  const providerPrice = extractSmePlugProviderPrice(plan);

  if (!(providerPrice > 0)) {
    return null;
  }

  // We compute our own selling price — SMEPlug's `price` field
  // is not reliable enough to use directly (see note above).
  const sellingPrice =
    SMEPLUG_MARKUP_PERCENT > 0
      ? Number(
          (
            providerPrice *
            (1 + SMEPLUG_MARKUP_PERCENT / 100)
          ).toFixed(2)
        )
      : providerPrice;

  const planId = getSmePlugPlanId(plan);

  return {
    raw: plan,

    id: String(planId ?? requestedPlanId),

    planId,

    networkId,

    provider: SMEPLUG_NETWORK_NAMES[networkId] || "unknown",

    name,

    size,

    duration,

    providerPrice,

    sellingPrice,

    status: normalizeStatus(plan),
  };
}

// ============================================================
// GET USER
// ============================================================

async function getActiveUser(
  userId: string
) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      referredBy: {
        select: {
          id: true,
          fullName: true,
          referralCode: true,
          referralBalance: true,
        },
      },
    },
  });
}

// ============================================================
// CALCULATE PRICING
// ============================================================

async function calculatePurchasePricing({
  basePrice,
  providerCost,
  hasReferrer,
}: {
  basePrice: number;
  providerCost: number;
  hasReferrer: boolean;
}) {
  const serviceFeePercentage =
    await getServiceFeePercent();

  const pricing =
    calculateServiceFee(
      basePrice,
      serviceFeePercentage
    );

  const serviceFee =
    Number(
      pricing.serviceFee.toFixed(2)
    );

  const amount =
    Number(
      pricing.totalAmount.toFixed(2)
    );

  const referralPercentage =
    await getReferralCommissionPercentage();

  const grossProfit =
    Number(
      (
        amount -
        providerCost
      ).toFixed(2)
    );

  let referralCommission = 0;

  if (
    hasReferrer &&
    grossProfit > 0 &&
    referralPercentage > 0
  ) {
    const calculatedCommission =
      Number(
        (
          basePrice *
          (
            referralPercentage /
            100
          )
        ).toFixed(2)
      );

    referralCommission =
      Math.min(
        calculatedCommission,
        grossProfit
      );
  }

  const profit =
    Number(
      (
        grossProfit -
        referralCommission
      ).toFixed(2)
    );

  return {
    serviceFeePercentage,
    serviceFee,
    amount,
    referralPercentage,
    grossProfit,
    referralCommission,
    profit,
  };
}

// ============================================================
// PROCESS NETWORKDATASUB
// ============================================================

async function processNetworkDataSubPurchase(
  userId: string,
  body: any
) {
  const apiKey =
    process.env.NETWORKDATASUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "NetworkDataSub API key is not configured.",
      },
      { status: 500 }
    );
  }

  const rawPlanId =
    body?.data_plan_id ??
    body?.dataPlanId ??
    body?.plan_id ??
    body?.planId ??
    body?.bundle_id ??
    body?.bundleId;

  const dataPlanId =
    Number(rawPlanId);

  if (
    !Number.isInteger(dataPlanId) ||
    dataPlanId <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid NetworkDataSub data plan.",
        receivedPlanId:
          rawPlanId,
      },
      { status: 400 }
    );
  }

  const rawPhoneNumber =
    body?.phone_number ??
    body?.phoneNumber ??
    body?.phone;

  const cleanedPhone =
    normalizePhone(
      rawPhoneNumber
    );

  if (
    !/^0\d{10}$/.test(
      cleanedPhone
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Please enter a valid Nigerian phone number.",
      },
      { status: 400 }
    );
  }

  const user =
    await getActiveUser(
      userId
    );

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message:
          "User not found.",
      },
      { status: 404 }
    );
  }

  if (
    user.status !==
    "ACTIVE"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Your account is not active.",
      },
      { status: 403 }
    );
  }

  const transactionPin =
    body?.transactionPin ??
    body?.transaction_pin;

  if (!transactionPin) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Transaction PIN is required.",
      },
      { status: 400 }
    );
  }

  const pinResult =
    await verifyTransactionPin(
      user.id,
      String(transactionPin)
    );

  if (!pinResult.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          pinResult.message ||
          "Invalid transaction PIN.",
      },
      { status: 403 }
    );
  }

  const plan =
    await getNetworkDataSubPlan(
      apiKey,
      dataPlanId
    );

  if (!plan) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid data plan.",
        receivedPlanId:
          rawPlanId,
      },
      { status: 400 }
    );
  }

  if (
    plan.status !==
      "ACTIVE" &&
    plan.status !==
      "ENABLED"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "This data plan is currently unavailable.",
      },
      { status: 400 }
    );
  }

  const providerCost =
    Number(
      plan.providerPrice
    );

  const basePrice =
    Number(
      plan.sellingPrice
    );

  if (
    !Number.isFinite(
      providerCost
    ) ||
    providerCost <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid NetworkDataSub provider price.",
      },
      { status: 500 }
    );
  }

  if (
    !Number.isFinite(
      basePrice
    ) ||
    basePrice <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid NetworkDataSub selling price.",
      },
      { status: 500 }
    );
  }

  const pricing =
    await calculatePurchasePricing(
      {
        basePrice,
        providerCost,
        hasReferrer:
          Boolean(
            user.referredBy
          ),
      }
    );

  const {
    serviceFeePercentage,
    serviceFee,
    amount,
    referralPercentage,
    grossProfit,
    referralCommission,
    profit,
  } = pricing;

  const walletBalance =
    Number(
      user.walletBalance
    );

  if (
    !Number.isFinite(
      walletBalance
    ) ||
    walletBalance <
      amount
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Insufficient wallet balance.",
        balance:
          walletBalance,
        required:
          amount,
        basePrice,
        serviceFeePercentage,
        serviceFee,
        totalAmount:
          amount,
      },
      { status: 400 }
    );
  }

  const reference =
    `DATA-NDS-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

  const transaction =
    await prisma.transaction.create(
      {
        data: {
          userId:
            user.id,

          type:
            "DATA",

          amount,

          reference,

          status:
            "PENDING",

          provider:
            "NetworkDataSub",

          cost:
            providerCost,

          profit,

          description:
            `${plan.provider.toUpperCase()} ${
              plan.size ||
              plan.name
            } ${
              plan.duration
            } for ${
              cleanedPhone
            }`,
        },
      }
    );

  const providerBody = {
    data_plan_id:
      plan.planId ||
      dataPlanId,

    phone_number:
      cleanedPhone,
  };

  let providerResponse:
    Response;

  try {
    providerResponse =
      await fetch(
        NETWORKDATASUB_PURCHASE_URL,
        {
          method: "POST",

          headers: {
            Authorization:
              `Token ${apiKey}`,

            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "User-Agent":
              "BrainfriendGlobalTech/1.0",
          },

          body:
            JSON.stringify(
              providerBody
            ),

          cache:
            "no-store",

          signal:
            AbortSignal.timeout(
              30000
            ),
        }
      );
  } catch (error: any) {
    await prisma.transaction.update(
      {
        where: {
          id:
            transaction.id,
        },

        data: {
          status:
            "FAILED",
          cost:
            0,
          profit:
            0,
        },
      }
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to connect to NetworkDataSub.",
        error:
          error?.message ||
          "Provider connection failed.",
      },
      { status: 502 }
    );
  }

  const responseText =
    await providerResponse.text();

  let providerResult:
    any = null;

  try {
    providerResult =
      responseText.trim()
        ? JSON.parse(
            responseText
          )
        : null;
  } catch (error) {
    console.error(
      "NETWORKDATASUB JSON ERROR:",
      error
    );
  }

  if (!providerResult) {
    await prisma.transaction.update(
      {
        where: {
          id:
            transaction.id,
        },

        data: {
          status:
            "FAILED",
          cost:
            0,
          profit:
            0,
        },
      }
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "NetworkDataSub returned an invalid response.",
        providerStatus:
          providerResponse.status,
      },
      { status: 502 }
    );
  }

  if (
    !providerResponse.ok ||
    !isProviderSuccess(
      providerResult
    )
  ) {
    await prisma.transaction.update(
      {
        where: {
          id:
            transaction.id,
        },

        data: {
          status:
            "FAILED",
          cost:
            0,
          profit:
            0,
        },
      }
    );

    return NextResponse.json(
      {
        success: false,

        message:
          providerResult?.message ||
          providerResult?.error ||
          "NetworkDataSub data purchase failed.",

        providerStatus:
          providerResponse.status,

        providerResponse:
          providerResult,
      },
      {
        status:
          providerResponse.status >=
            400 &&
          providerResponse.status <=
            599
            ? providerResponse.status
            : 400,
      }
    );
  }

  const providerData =
    providerResult?.data ||
    {};

  const providerReference =
    providerData?.reference ??
    providerData?.transaction_id ??
    providerData?.transactionId ??
    providerResult?.reference ??
    providerResult?.transaction_id ??
    providerResult?.transactionId ??
    null;

  let result: any;

  try {
    result =
      await prisma.$transaction(
        async (tx) => {
          const currentUser =
            await tx.user.findUnique(
              {
                where: {
                  id:
                    user.id,
                },
              }
            );

          if (!currentUser) {
            throw new Error(
              "User not found."
            );
          }

          const currentBalance =
            Number(
              currentUser.walletBalance
            );

          if (
            !Number.isFinite(
              currentBalance
            ) ||
            currentBalance <
              amount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          let businessWallet =
            await tx.businessWallet.findUnique(
              {
                where: {
                  name:
                    "Brainfriend Global Tech",
                },
              }
            );

          if (!businessWallet) {
            businessWallet =
              await tx.businessWallet.create(
                {
                  data: {
                    name:
                      "Brainfriend Global Tech",

                    balance:
                      0,

                    totalRevenue:
                      0,

                    totalCost:
                      0,

                    totalProfit:
                      0,

                    withdrawnProfit:
                      0,

                    availableProfit:
                      0,
                  },
                }
              );
          }

          const newUserBalance =
            Number(
              (
                currentBalance -
                amount
              ).toFixed(2)
            );

          const newBusinessBalance =
            Number(
              (
                Number(
                  businessWallet.balance
                ) +
                profit
              ).toFixed(2)
            );

          const newTotalRevenue =
            Number(
              (
                Number(
                  businessWallet.totalRevenue
                ) +
                amount
              ).toFixed(2)
            );

          const newTotalCost =
            Number(
              (
                Number(
                  businessWallet.totalCost
                ) +
                providerCost
              ).toFixed(2)
            );

          const newTotalProfit =
            Number(
              (
                Number(
                  businessWallet.totalProfit
                ) +
                profit
              ).toFixed(2)
            );

          const newAvailableProfit =
            Number(
              (
                Number(
                  businessWallet.availableProfit
                ) +
                profit
              ).toFixed(2)
            );

          await tx.user.update(
            {
              where: {
                id:
                  user.id,
              },

              data: {
                walletBalance:
                  newUserBalance,
              },
            }
          );

          await tx.businessWallet.update(
            {
              where: {
                id:
                  businessWallet.id,
              },

              data: {
                balance:
                  newBusinessBalance,

                totalRevenue:
                  newTotalRevenue,

                totalCost:
                  newTotalCost,

                totalProfit:
                  newTotalProfit,

                availableProfit:
                  newAvailableProfit,
              },
            }
          );

          await tx.businessRevenue.create(
            {
              data: {
                transactionId:
                  transaction.id,

                type:
                  "DATA",

                provider:
                  "NetworkDataSub",

                amount,

                cost:
                  providerCost,

                profit,

                reference,

                description:
                  `${plan.provider.toUpperCase()} ${
                    plan.size ||
                    plan.name
                  } ${
                    plan.duration
                  } for ${
                    cleanedPhone
                  } + ${
                    serviceFeePercentage
                  }% service fee`,

                businessWalletId:
                  businessWallet.id,
              },
            }
          );

          if (
            user.referredBy &&
            referralCommission >
              0
          ) {
            await tx.user.update(
              {
                where: {
                  id:
                    user.referredBy.id,
                },

                data: {
                  referralBalance:
                    {
                      increment:
                        referralCommission,
                    },
                },
              }
            );

            await tx.referralEarning.create(
              {
                data: {
                  referrerId:
                    user.referredBy.id,

                  referredUserId:
                    user.id,

                  transactionId:
                    transaction.id,

                  amount:
                    referralCommission,

                  percentage:
                    referralPercentage,

                  transactionAmount:
                    basePrice,

                  type:
                    "DATA",

                  status:
                    "SUCCESS",

                  description:
                    `Referral earning from ${
                      user.fullName
                    }'s ${
                      plan.provider.toUpperCase()
                    } ${
                      plan.size ||
                      plan.name
                    } NetworkDataSub data purchase of ₦${basePrice}`,

                  reference:
                    `REF-${reference}`,
                },
              }
            );
          }

          await tx.transaction.update(
            {
              where: {
                id:
                  transaction.id,
              },

              data: {
                status:
                  "SUCCESS",

                cost:
                  providerCost,

                profit,

                description:
                  `${plan.provider.toUpperCase()} ${
                    plan.size ||
                    plan.name
                  } ${
                    plan.duration
                  } for ${
                    cleanedPhone
                  } + ${
                    serviceFeePercentage
                  }% service fee`,
              },
            }
          );

          const updatedUser =
            await tx.user.findUnique(
              {
                where: {
                  id:
                    user.id,
                },

                select: {
                  walletBalance:
                    true,

                  referralBalance:
                    true,
                },
              }
            );

          return {
            walletBalance:
              Number(
                updatedUser?.walletBalance ??
                  0
              ),

            referralBalance:
              Number(
                updatedUser?.referralBalance ??
                  0
              ),

            businessBalance:
              newBusinessBalance,

            grossProfit,

            referralCommission,

            profit,
          };
        },

        {
          maxWait:
            10000,

          timeout:
            30000,
        }
      );
  } catch (error: any) {
    console.error(
      "NETWORKDATASUB LEDGER ERROR:",
      error
    );

    try {
      await prisma.transaction.update(
        {
          where: {
            id:
              transaction.id,
          },

          data: {
            status:
              "FAILED",
          },
        }
      );
    } catch (updateError) {
      console.error(
        "FAILED TO MARK NDS TRANSACTION:",
        updateError
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Data was delivered, but recording the transaction failed. Please contact support with reference " +
          reference,

        reference,

        providerReference,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,

      message:
        providerResult?.message ||
        "Data purchase successful.",

      reference,

      providerReference,

      server:
        "NETWORKDATASUB",

      data_plan_id:
        dataPlanId,

      phone_number:
        cleanedPhone,

      provider:
        plan.provider,

      plan_id:
        plan.planId,

      api_plan_id:
        plan.apiPlanId,

      network_id:
        plan.networkId,

      plan_name:
        plan.name,

      size:
        plan.size,

      duration:
        plan.duration,

      basePrice,

      serviceFeePercentage,

      serviceFee,

      amount,

      providerCost,

      grossProfit,

      referralPercentage,

      referralCommission,

      profit,

      walletBalance:
        result.walletBalance,

      referralBalance:
        result.referralBalance,

      providerResponse:
        providerResult,
    }
  );
}

// ============================================================
// PROCESS SMEPLUG
// ============================================================

async function processSmePlugPurchase(
  userId: string,
  body: any
) {
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

  const rawNetworkId = body?.network_id ?? body?.networkId;

  const networkId = Number(rawNetworkId);

  if (
    !Number.isInteger(networkId) ||
    !SMEPLUG_ENABLED_NETWORK_IDS.includes(networkId)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or unsupported SMEPlug network.",
        receivedNetworkId: rawNetworkId,
      },
      { status: 400 }
    );
  }

  const rawPlanId =
    body?.plan_id ??
    body?.planId ??
    body?.data_plan_id ??
    body?.dataPlanId;

  if (
    rawPlanId === undefined ||
    rawPlanId === null ||
    rawPlanId === ""
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid SMEPlug data plan.",
        receivedPlanId: rawPlanId,
      },
      { status: 400 }
    );
  }

  const rawPhoneNumber =
    body?.phone_number ??
    body?.phoneNumber ??
    body?.phone;

  const cleanedPhone = normalizePhone(rawPhoneNumber);

  if (!/^0\d{10}$/.test(cleanedPhone)) {
    return NextResponse.json(
      {
        success: false,
        message: "Please enter a valid Nigerian phone number.",
      },
      { status: 400 }
    );
  }

  const user = await getActiveUser(userId);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "User not found.",
      },
      { status: 404 }
    );
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      {
        success: false,
        message: "Your account is not active.",
      },
      { status: 403 }
    );
  }

  const transactionPin =
    body?.transactionPin ??
    body?.transaction_pin;

  if (!transactionPin) {
    return NextResponse.json(
      {
        success: false,
        message: "Transaction PIN is required.",
      },
      { status: 400 }
    );
  }

  const pinResult = await verifyTransactionPin(
    user.id,
    String(transactionPin)
  );

  if (!pinResult.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          pinResult.message ||
          "Invalid transaction PIN.",
      },
      { status: 403 }
    );
  }

  const plan = await getSmePlugPlan(
    apiKey,
    networkId,
    rawPlanId
  );

  if (!plan) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid data plan.",
        receivedPlanId: rawPlanId,
      },
      { status: 400 }
    );
  }

  if (
    plan.status !== "ACTIVE" &&
    plan.status !== "ENABLED"
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "This data plan is currently unavailable.",
      },
      { status: 400 }
    );
  }

  const providerCost = Number(plan.providerPrice);

  const basePrice = Number(plan.sellingPrice);

  if (
    !Number.isFinite(providerCost) ||
    providerCost <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid SMEPlug provider price.",
      },
      { status: 500 }
    );
  }

  if (
    !Number.isFinite(basePrice) ||
    basePrice <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid SMEPlug selling price.",
      },
      { status: 500 }
    );
  }

  const pricing = await calculatePurchasePricing({
    basePrice,
    providerCost,
    hasReferrer: Boolean(user.referredBy),
  });

  const {
    serviceFeePercentage,
    serviceFee,
    amount,
    referralPercentage,
    grossProfit,
    referralCommission,
    profit,
  } = pricing;

  const walletBalance = Number(user.walletBalance);

  if (
    !Number.isFinite(walletBalance) ||
    walletBalance < amount
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Insufficient wallet balance.",
        balance: walletBalance,
        required: amount,
        basePrice,
        serviceFeePercentage,
        serviceFee,
        totalAmount: amount,
      },
      { status: 400 }
    );
  }

  const reference =
    `DATA-SMP-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,

      type: "DATA",

      amount,

      reference,

      status: "PENDING",

      provider: "SMEPlug",

      cost: providerCost,

      profit,

      description: `${plan.provider.toUpperCase()} ${
        plan.size || plan.name
      } ${plan.duration} for ${cleanedPhone}`,
    },
  });

  const providerBody = {
    network_id: networkId,

    plan_id: plan.planId ?? rawPlanId,

    phone: cleanedPhone,
  };

  let providerResponse: Response;

  try {
    providerResponse = await fetch(
      SMEPLUG_PURCHASE_URL,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,

          "Content-Type": "application/json",

          Accept: "application/json",
        },

        body: JSON.stringify(providerBody),

        cache: "no-store",

        signal: AbortSignal.timeout(30000),
      }
    );
  } catch (error: any) {
    await prisma.transaction.update({
      where: { id: transaction.id },

      data: {
        status: "FAILED",
        cost: 0,
        profit: 0,
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: "Unable to connect to SMEPlug.",
        error:
          error?.message ||
          "Provider connection failed.",
      },
      { status: 502 }
    );
  }

  const responseText = await providerResponse.text();

  let providerResult: any = null;

  try {
    providerResult = responseText.trim()
      ? JSON.parse(responseText)
      : null;
  } catch (error) {
    console.error("SMEPLUG JSON ERROR:", error);
  }

  if (!providerResult) {
    await prisma.transaction.update({
      where: { id: transaction.id },

      data: {
        status: "FAILED",
        cost: 0,
        profit: 0,
      },
    });

    return NextResponse.json(
      {
        success: false,
        message: "SMEPlug returned an invalid response.",
        providerStatus: providerResponse.status,
      },
      { status: 502 }
    );
  }

  if (
    !providerResponse.ok ||
    !isProviderSuccess(providerResult)
  ) {
    await prisma.transaction.update({
      where: { id: transaction.id },

      data: {
        status: "FAILED",
        cost: 0,
        profit: 0,
      },
    });

    return NextResponse.json(
      {
        success: false,

        message:
          providerResult?.msg ||
          providerResult?.message ||
          providerResult?.error ||
          "SMEPlug data purchase failed.",

        providerStatus: providerResponse.status,

        providerResponse: providerResult,
      },
      {
        status:
          providerResponse.status >= 400 &&
          providerResponse.status <= 599
            ? providerResponse.status
            : 400,
      }
    );
  }

  const providerData = providerResult?.data || {};

  const providerReference =
    providerData?.reference ??
    providerData?.transaction_id ??
    providerData?.transactionId ??
    providerResult?.reference ??
    null;

  let result: any;

  try {
    result = await prisma.$transaction(
      async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        if (!currentUser) {
          throw new Error("User not found.");
        }

        const currentBalance = Number(
          currentUser.walletBalance
        );

        if (
          !Number.isFinite(currentBalance) ||
          currentBalance < amount
        ) {
          throw new Error(
            "Insufficient wallet balance."
          );
        }

        let businessWallet =
          await tx.businessWallet.findUnique({
            where: { name: "Brainfriend Global Tech" },
          });

        if (!businessWallet) {
          businessWallet =
            await tx.businessWallet.create({
              data: {
                name: "Brainfriend Global Tech",
                balance: 0,
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                withdrawnProfit: 0,
                availableProfit: 0,
              },
            });
        }

        const newUserBalance = Number(
          (currentBalance - amount).toFixed(2)
        );

        const newBusinessBalance = Number(
          (
            Number(businessWallet.balance) + profit
          ).toFixed(2)
        );

        const newTotalRevenue = Number(
          (
            Number(businessWallet.totalRevenue) +
            amount
          ).toFixed(2)
        );

        const newTotalCost = Number(
          (
            Number(businessWallet.totalCost) +
            providerCost
          ).toFixed(2)
        );

        const newTotalProfit = Number(
          (
            Number(businessWallet.totalProfit) +
            profit
          ).toFixed(2)
        );

        const newAvailableProfit = Number(
          (
            Number(
              businessWallet.availableProfit
            ) + profit
          ).toFixed(2)
        );

        await tx.user.update({
          where: { id: user.id },

          data: { walletBalance: newUserBalance },
        });

        await tx.businessWallet.update({
          where: { id: businessWallet.id },

          data: {
            balance: newBusinessBalance,
            totalRevenue: newTotalRevenue,
            totalCost: newTotalCost,
            totalProfit: newTotalProfit,
            availableProfit: newAvailableProfit,
          },
        });

        await tx.businessRevenue.create({
          data: {
            transactionId: transaction.id,

            type: "DATA",

            provider: "SMEPlug",

            amount,

            cost: providerCost,

            profit,

            reference,

            description: `${plan.provider.toUpperCase()} ${
              plan.size || plan.name
            } ${plan.duration} for ${cleanedPhone} + ${serviceFeePercentage}% service fee`,

            businessWalletId: businessWallet.id,
          },
        });

        if (
          user.referredBy &&
          referralCommission > 0
        ) {
          await tx.user.update({
            where: { id: user.referredBy.id },

            data: {
              referralBalance: {
                increment: referralCommission,
              },
            },
          });

          await tx.referralEarning.create({
            data: {
              referrerId: user.referredBy.id,

              referredUserId: user.id,

              transactionId: transaction.id,

              amount: referralCommission,

              percentage: referralPercentage,

              transactionAmount: basePrice,

              type: "DATA",

              status: "SUCCESS",

              description: `Referral earning from ${
                user.fullName
              }'s ${plan.provider.toUpperCase()} ${
                plan.size || plan.name
              } SMEPlug data purchase of ₦${basePrice}`,

              reference: `REF-${reference}`,
            },
          });
        }

        await tx.transaction.update({
          where: { id: transaction.id },

          data: {
            status: "SUCCESS",

            cost: providerCost,

            profit,

            description: `${plan.provider.toUpperCase()} ${
              plan.size || plan.name
            } ${plan.duration} for ${cleanedPhone} + ${serviceFeePercentage}% service fee`,
          },
        });

        const updatedUser = await tx.user.findUnique({
          where: { id: user.id },

          select: {
            walletBalance: true,
            referralBalance: true,
          },
        });

        return {
          walletBalance: Number(
            updatedUser?.walletBalance ?? 0
          ),

          referralBalance: Number(
            updatedUser?.referralBalance ?? 0
          ),

          businessBalance: newBusinessBalance,

          grossProfit,

          referralCommission,

          profit,
        };
      },

      {
        maxWait: 10000,

        timeout: 30000,
      }
    );
  } catch (error: any) {
    console.error("SMEPLUG LEDGER ERROR:", error);

    try {
      await prisma.transaction.update({
        where: { id: transaction.id },

        data: { status: "FAILED" },
      });
    } catch (updateError) {
      console.error(
        "FAILED TO MARK SMEPLUG TRANSACTION:",
        updateError
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Data was delivered, but recording the transaction failed. Please contact support with reference " +
          reference,

        reference,

        providerReference,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,

    message:
      providerData?.msg ||
      providerResult?.msg ||
      "Data purchase successful.",

    reference,

    providerReference,

    server: "SMEPLUG",

    network_id: networkId,

    plan_id: rawPlanId,

    phone_number: cleanedPhone,

    provider: plan.provider,

    plan_name: plan.name,

    size: plan.size,

    duration: plan.duration,

    basePrice,

    serviceFeePercentage,

    serviceFee,

    amount,

    providerCost,

    grossProfit,

    referralPercentage,

    referralCommission,

    profit,

    walletBalance: result.walletBalance,

    referralBalance: result.referralBalance,

    providerResponse: providerResult,
  });
}

// ============================================================
// POST
// ============================================================

export async function POST(
  request: NextRequest
) {
  let transactionId:
    | string
    | null = null;

  try {
    // ========================================================
    // AUTH
    // ========================================================

    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        { status: 401 }
      );
    }

    // ========================================================
    // BODY
    // ========================================================

    const body =
      await request.json();

    const requestedServer =
      String(
        body?.server || ""
      )
        .trim()
        .toUpperCase();

    // ========================================================
    // NETWORKDATASUB
    // ========================================================

    if (
      requestedServer ===
        "NETWORKDATASUB" ||
      requestedServer ===
        "NETWORK_DATA_SUB" ||
      requestedServer ===
        "NDS"
    ) {
      try {
        return await processNetworkDataSubPurchase(
          session.user.id,
          body
        );
      } catch (error: any) {
        console.error(
          "NETWORKDATASUB PURCHASE ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,

            message:
              error instanceof
                Error
                ? error.message
                : "NetworkDataSub purchase failed.",
          },
          { status: 500 }
        );
      }
    }

    // ========================================================
    // SMEPLUG
    // ========================================================

    if (
      requestedServer === "SMEPLUG" ||
      requestedServer === "SME_PLUG" ||
      requestedServer === "SMP"
    ) {
      try {
        return await processSmePlugPurchase(
          session.user.id,
          body
        );
      } catch (error: any) {
        console.error(
          "SMEPLUG PURCHASE ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,

            message:
              error instanceof Error
                ? error.message
                : "SMEPlug purchase failed.",
          },
          { status: 500 }
        );
      }
    }

    // ========================================================
    // CHEAPDATAHUB
    // ========================================================

    const rawBundleId =
      body?.bundle_id ??
      body?.bundleId ??
      body?.plan_id ??
      body?.planId ??
      body?.dataPlanId;

    const rawPhoneNumber =
      body?.phone_number ??
      body?.phoneNumber ??
      body?.phone;

    const bundleId =
      Number(rawBundleId);

    if (
      !Number.isInteger(
        bundleId
      ) ||
      !dataPlans[bundleId]
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid data plan.",
          receivedBundleId:
            rawBundleId,
        },
        { status: 400 }
      );
    }

    const plan =
      dataPlans[bundleId];

    const cleanedPhone =
      normalizePhone(
        rawPhoneNumber
      );

    if (
      !/^0\d{10}$/.test(
        cleanedPhone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid Nigerian phone number.",
        },
        { status: 400 }
      );
    }

    const user =
      await getActiveUser(
        session.user.id
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User not found.",
        },
        { status: 404 }
      );
    }

    if (
      user.status !==
      "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is not active.",
        },
        { status: 403 }
      );
    }

    const transactionPin =
      body?.transactionPin ??
      body?.transaction_pin;

    if (!transactionPin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Transaction PIN is required.",
        },
        { status: 400 }
      );
    }

    const pinResult =
      await verifyTransactionPin(
        user.id,
        String(
          transactionPin
        )
      );

    if (!pinResult.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            pinResult.message ||
            "Invalid transaction PIN.",
        },
        { status: 403 }
      );
    }

    const apiKey =
      process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // SERVER-SIDE PRICING
    // ========================================================

    const basePrice =
      Number(
        plan.resellerPrice
      );

    const providerCost =
      Number(
        plan.apiPrice
      );

    if (
      !Number.isFinite(
        basePrice
      ) ||
      basePrice <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid reseller price.",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isFinite(
        providerCost
      ) ||
      providerCost < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid provider price.",
        },
        { status: 500 }
      );
    }

    const pricing =
      await calculatePurchasePricing(
        {
          basePrice,
          providerCost,
          hasReferrer:
            Boolean(
              user.referredBy
            ),
        }
      );

    const {
      serviceFeePercentage,
      serviceFee,
      amount,
      referralPercentage,
      grossProfit,
      referralCommission,
      profit,
    } = pricing;

    const walletBalance =
      Number(
        user.walletBalance
      );

    if (
      !Number.isFinite(
        walletBalance
      ) ||
      walletBalance <
        amount
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Insufficient wallet balance.",

          balance:
            walletBalance,

          required:
            amount,

          basePrice,

          serviceFeePercentage,

          serviceFee,

          totalAmount:
            amount,
        },
        { status: 400 }
      );
    }

    const reference =
      `DATA-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    const transaction =
      await prisma.transaction.create(
        {
          data: {
            userId:
              user.id,

            type:
              "DATA",

            amount,

            reference,

            status:
              "PENDING",

            provider:
              "CheapDataHub",

            cost:
              providerCost,

            profit,

            description:
              `${plan.provider.toUpperCase()} ${
                plan.size
              } ${
                plan.duration
              } for ${
                cleanedPhone
              }`,
          },
        }
      );

    transactionId =
      transaction.id;

    // ========================================================
    // PROVIDER REQUEST
    // ========================================================

    const providerBody = {
      bundle_id:
        bundleId,

      phone_number:
        cleanedPhone,
    };

    let providerResponse:
      Response;

    try {
      providerResponse =
        await fetch(
          CHEAPDATAHUB_DATA_URL,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${apiKey}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                providerBody
              ),

            cache:
              "no-store",

            signal:
              AbortSignal.timeout(
                30000
              ),
          }
        );
    } catch (error: any) {
      await prisma.transaction.update(
        {
          where: {
            id:
              transaction.id,
          },

          data: {
            status:
              "FAILED",

            cost:
              0,

            profit:
              0,
          },
        }
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Unable to connect to CheapDataHub.",

          error:
            error?.message,
        },
        { status: 502 }
      );
    }

    const responseText =
      await providerResponse.text();

    let providerResult:
      any = null;

    try {
      providerResult =
        responseText.trim()
          ? JSON.parse(
              responseText
            )
          : null;
    } catch (error) {
      console.error(
        "CHEAPDATAHUB JSON ERROR:",
        error
      );
    }

    if (!providerResult) {
      await prisma.transaction.update(
        {
          where: {
            id:
              transaction.id,
          },

          data: {
            status:
              "FAILED",

            cost:
              0,

            profit:
              0,
          },
        }
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "CheapDataHub returned an invalid response.",

          providerStatus:
            providerResponse.status,
        },
        { status: 502 }
      );
    }

    if (
      !providerResponse.ok ||
      !isProviderSuccess(
        providerResult
      )
    ) {
      await prisma.transaction.update(
        {
          where: {
            id:
              transaction.id,
          },

          data: {
            status:
              "FAILED",

            cost:
              0,

            profit:
              0,
          },
        }
      );

      return NextResponse.json(
        {
          success: false,

          message:
            providerResult?.message ||
            providerResult?.error ||
            "Data purchase failed.",

          providerStatus:
            providerResponse.status,

          providerResponse:
            providerResult,
        },
        {
          status:
            providerResponse.status >=
              400 &&
            providerResponse.status <=
              599
              ? providerResponse.status
              : 400,
        }
      );
    }

    const providerReference =
      providerResult?.reference ??
      providerResult?.transaction_id ??
      providerResult?.transactionId ??
      null;

    // ========================================================
    // ATOMIC LEDGER
    // ========================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          const currentUser =
            await tx.user.findUnique(
              {
                where: {
                  id:
                    user.id,
                },
              }
            );

          if (!currentUser) {
            throw new Error(
              "User not found."
            );
          }

          const currentBalance =
            Number(
              currentUser.walletBalance
            );

          if (
            !Number.isFinite(
              currentBalance
            ) ||
            currentBalance <
              amount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          let businessWallet =
            await tx.businessWallet.findUnique(
              {
                where: {
                  name:
                    "Brainfriend Global Tech",
                },
              }
            );

          if (!businessWallet) {
            businessWallet =
              await tx.businessWallet.create(
                {
                  data: {
                    name:
                      "Brainfriend Global Tech",

                    balance:
                      0,

                    totalRevenue:
                      0,

                    totalCost:
                      0,

                    totalProfit:
                      0,

                    withdrawnProfit:
                      0,

                    availableProfit:
                      0,
                  },
                }
              );
          }

          const newUserBalance =
            Number(
              (
                currentBalance -
                amount
              ).toFixed(2)
            );

          const newBusinessBalance =
            Number(
              (
                Number(
                  businessWallet.balance
                ) +
                profit
              ).toFixed(2)
            );

          const newTotalRevenue =
            Number(
              (
                Number(
                  businessWallet.totalRevenue
                ) +
                amount
              ).toFixed(2)
            );

          const newTotalCost =
            Number(
              (
                Number(
                  businessWallet.totalCost
                ) +
                providerCost
              ).toFixed(2)
            );

          const newTotalProfit =
            Number(
              (
                Number(
                  businessWallet.totalProfit
                ) +
                profit
              ).toFixed(2)
            );

          const newAvailableProfit =
            Number(
              (
                Number(
                  businessWallet.availableProfit
                ) +
                profit
              ).toFixed(2)
            );

          await tx.user.update(
            {
              where: {
                id:
                  user.id,
              },

              data: {
                walletBalance:
                  newUserBalance,
              },
            }
          );

          await tx.businessWallet.update(
            {
              where: {
                id:
                  businessWallet.id,
              },

              data: {
                balance:
                  newBusinessBalance,

                totalRevenue:
                  newTotalRevenue,

                totalCost:
                  newTotalCost,

                totalProfit:
                  newTotalProfit,

                availableProfit:
                  newAvailableProfit,
              },
            }
          );

          await tx.businessRevenue.create(
            {
              data: {
                transactionId:
                  transaction.id,

                type:
                  "DATA",

                provider:
                  "CheapDataHub",

                amount,

                cost:
                  providerCost,

                profit,

                reference,

                description:
                  `${plan.provider.toUpperCase()} ${
                    plan.size
                  } ${
                    plan.duration
                  } for ${
                    cleanedPhone
                  } + ${
                    serviceFeePercentage
                  }% service fee`,

                businessWalletId:
                  businessWallet.id,
              },
            }
          );

          if (
            user.referredBy &&
            referralCommission >
              0
          ) {
            await tx.user.update(
              {
                where: {
                  id:
                    user.referredBy.id,
                },

                data: {
                  referralBalance:
                    {
                      increment:
                        referralCommission,
                    },
                },
              }
            );

            await tx.referralEarning.create(
              {
                data: {
                  referrerId:
                    user.referredBy.id,

                  referredUserId:
                    user.id,

                  transactionId:
                    transaction.id,

                  amount:
                    referralCommission,

                  percentage:
                    referralPercentage,

                  transactionAmount:
                    basePrice,

                  type:
                    "DATA",

                  status:
                    "SUCCESS",

                  description:
                    `Referral earning from ${
                      user.fullName
                    }'s ${
                      plan.provider.toUpperCase()
                    } ${
                      plan.size
                    } data purchase of ₦${basePrice}`,

                  reference:
                    `REF-${reference}`,
                },
              }
            );
          }

          await tx.transaction.update(
            {
              where: {
                id:
                  transaction.id,
              },

              data: {
                status:
                  "SUCCESS",

                cost:
                  providerCost,

                profit,

                description:
                  `${plan.provider.toUpperCase()} ${
                    plan.size
                  } ${
                    plan.duration
                  } for ${
                    cleanedPhone
                  } + ${
                    serviceFeePercentage
                  }% service fee`,
              },
            }
          );

          const updatedUser =
            await tx.user.findUnique(
              {
                where: {
                  id:
                    user.id,
                },

                select: {
                  walletBalance:
                    true,

                  referralBalance:
                    true,
                },
              }
            );

          return {
            walletBalance:
              Number(
                updatedUser?.walletBalance ??
                  0
              ),

            referralBalance:
              Number(
                updatedUser?.referralBalance ??
                  0
              ),

            businessBalance:
              newBusinessBalance,

            grossProfit,

            referralCommission,

            profit,
          };
        },

        {
          maxWait:
            10000,

          timeout:
            30000,
        }
      );

    return NextResponse.json(
      {
        success:
          true,

        message:
          providerResult?.message ||
          "Data purchase successful.",

        reference,

        providerReference,

        server:
          "CHEAPDATAHUB",

        bundle_id:
          bundleId,

        phone_number:
          cleanedPhone,

        provider:
          plan.provider,

        size:
          plan.size,

        duration:
          plan.duration,

        basePrice,

        serviceFeePercentage,

        serviceFee,

        amount,

        providerCost,

        grossProfit:
          result.grossProfit,

        referralPercentage,

        referralCommission:
          result.referralCommission,

        profit:
          result.profit,

        walletBalance:
          result.walletBalance,

        referralBalance:
          result.referralBalance,

        providerResponse:
          providerResult,
      }
    );
  } catch (error: any) {
    console.error(
      "DATA PURCHASE ERROR:",
      error
    );

    if (transactionId) {
      try {
        const transaction =
          await prisma.transaction.findUnique(
            {
              where: {
                id:
                  transactionId,
              },
            }
          );

        if (
          transaction &&
          transaction.status ===
            "PENDING"
        ) {
          await prisma.transaction.update(
            {
              where: {
                id:
                  transactionId,
              },

              data: {
                status:
                  "FAILED",

                cost:
                  0,

                profit:
                  0,
              },
            }
          );
        }
      } catch (updateError) {
        console.error(
          "FAILED TO UPDATE DATA TRANSACTION:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success:
          false,

        message:
          error?.message ||
          "Data purchase failed.",
      },
      { status: 500 }
    );
  }
}