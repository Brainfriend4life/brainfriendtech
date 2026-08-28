import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const NETWORKDATASUB_BASE_URL = "https://networkdatasub.com/api";

// ============================================================
// MARKUP
//
// Must match NETWORKDATASUB_MARKUP_PERCENT in
// app/api/data/purchase/route.ts exactly, so the price shown in
// this listing (dropdown, Plan Details) matches what the
// purchase route will actually charge. If you change one, change
// both — or better, move this into a shared constants file.
// ============================================================

const NETWORKDATASUB_MARKUP_PERCENT = Number(
  process.env.NETWORKDATASUB_MARKUP_PERCENT ?? 5
);

type NormalizedPlan = {
  id: string;
  provider: string;

  bundleId: number;
  planId: number | null;
  apiPlanId: number | null;
  networkId: number | null;

  name: string;
  size: string;
  duration: string;

  providerPrice: number;
  sellingPrice: number;

  status: string;

  raw?: unknown;
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

// ============================================================
// NUMBER
// ============================================================

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

    const parsed = Number(cleaned);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

// ============================================================
// DEEP PRICE SEARCH
// ============================================================

function findPriceInObject(value: unknown, depth = 0): number {
  if (depth > 5) {
    return 0;
  }

  const direct = toNumber(value, NaN);

  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return 0;
  }

  const object = value as Record<string, unknown>;

  const preferredKeys = [
    "selling_price",
    "sellingPrice",

    "customer_price",
    "customerPrice",

    "retail_price",
    "retailPrice",

    "reseller_selling_price",
    "resellerSellingPrice",

    "provider_price",
    "providerPrice",

    "api_price",
    "apiPrice",

    "cost_price",
    "costPrice",

    "purchase_price",
    "purchasePrice",

    "buying_price",
    "buyingPrice",

    "wholesale_price",
    "wholesalePrice",

    "amount",
    "price",
    "cost",
    "value",
  ];

  // Check known price keys first.
  for (const key of preferredKeys) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      const number = findPriceInObject(object[key], depth + 1);

      if (Number.isFinite(number) && number > 0) {
        return number;
      }
    }
  }

  // Then inspect nested objects.
  for (const nested of Object.values(object)) {
    if (typeof nested === "object" && nested !== null) {
      const number = findPriceInObject(nested, depth + 1);

      if (Number.isFinite(number) && number > 0) {
        return number;
      }
    }
  }

  return 0;
}

// ============================================================
// PROVIDER PRICE
// ============================================================

function extractProviderPrice(plan: any): number {
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

    plan.amount,

    plan.pricing,
    plan.prices,
    plan.price_data,
    plan.priceData,
    plan.amounts,
  ];

  for (const candidate of candidates) {
    const value = findPriceInObject(candidate);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

// ============================================================
// SELLING PRICE
// ============================================================

function extractSellingPrice(plan: any, providerPrice: number): number {
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

    plan.pricing,
    plan.prices,
    plan.price_data,
    plan.priceData,
    plan.amounts,
  ];

  for (const candidate of candidates) {
    const value = findPriceInObject(candidate);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return providerPrice;
}

// ============================================================
// TEXT
// ============================================================

function toText(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;

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
      return toText(nested, fallback);
    }
  }

  return fallback;
}

// ============================================================
// DURATION
// ============================================================

function normalizeDuration(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return `${value} Days`;
  }

  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;

    const days = firstValue(
      object.days,
      object.day,
      object.duration_days,
      object.durationDays
    );

    if (days !== null) {
      return `${toNumber(days)} Days`;
    }

    const weeks = firstValue(object.weeks, object.week);

    if (weeks !== null) {
      return `${toNumber(weeks)} Weeks`;
    }

    const months = firstValue(object.months, object.month);

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
      const unit = firstValue(object.unit, object.type, object.period);

      if (unit !== null) {
        return `${toText(nestedValue)} ${toText(unit)}`;
      }

      return toText(nestedValue);
    }
  }

  return "";
}

// ============================================================
// PROVIDER
// ============================================================

function normalizeProvider(plan: any): string {
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

  if (typeof provider === "object" && provider !== null) {
    return toText(
      firstValue(
        provider.name,
        provider.network,
        provider.network_name,
        provider.networkName,
        provider.title,
        provider.code
      )
    );
  }

  return toText(provider);
}

// ============================================================
// SIZE
// ============================================================

function normalizeSize(plan: any): string {
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

  if (typeof size === "object" && size !== null) {
    const object = size as Record<string, unknown>;

    const value = firstValue(
      object.value,
      object.size,
      object.data,
      object.volume,
      object.capacity,
      object.name
    );

    const unit = firstValue(object.unit, object.type);

    if (value !== null && unit !== null) {
      return `${toText(value)} ${toText(unit)}`;
    }

    if (value !== null) {
      return toText(value);
    }
  }

  return toText(size);
}

// ============================================================
// NAME
// ============================================================

function normalizeName(plan: any): string {
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

// ============================================================
// STATUS
// ============================================================

function normalizeStatus(plan: any): string {
  const status = firstValue(
    plan.status,
    plan.active,
    plan.is_active,
    plan.isActive,
    plan.enabled
  );

  if (typeof status === "boolean") {
    return status ? "ACTIVE" : "INACTIVE";
  }

  if (status === null || status === undefined) {
    return "ACTIVE";
  }

  return toText(status, "ACTIVE").toUpperCase();
}

// ============================================================
// GET
// ============================================================

export async function GET(_request: NextRequest) {
  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // API KEY
    // ========================================================

    const apiKey = process.env.NETWORKDATASUB_API_KEY;

    if (!apiKey) {
      console.error("NETWORKDATASUB_API_KEY is missing.");

      return NextResponse.json(
        {
          success: false,
          message: "NetworkDataSub API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // FETCH PLANS
    // ========================================================

    const response = await fetch(`${NETWORKDATASUB_BASE_URL}/data/all-plans`, {
      method: "GET",

      headers: {
        Authorization: `Token ${apiKey}`,

        Accept: "application/json",

        "Content-Type": "application/json",
      },

      cache: "no-store",

      signal: AbortSignal.timeout(30000),
    });

    // ========================================================
    // READ RESPONSE
    // ========================================================

    const responseText = await response.text();

    console.log("======================================");

    console.log("NETWORKDATASUB DATA PLANS STATUS:", response.status);

    console.log("NETWORKDATASUB DATA PLANS RESPONSE:", responseText);

    console.log("======================================");

    // ========================================================
    // PARSE RESPONSE
    // ========================================================

    let result: any = null;

    try {
      result = responseText.trim() ? JSON.parse(responseText) : null;
    } catch (error) {
      console.error("NETWORKDATASUB JSON PARSE ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "NetworkDataSub returned invalid JSON.",
        },
        {
          status: 502,
        }
      );
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "NetworkDataSub returned an empty response.",
        },
        {
          status: 502,
        }
      );
    }

    // ========================================================
    // PROVIDER ERROR
    // ========================================================

    if (!response.ok || result.success === false) {
      return NextResponse.json(
        {
          success: false,

          message:
            result.message ||
            result.error ||
            "Unable to retrieve NetworkDataSub data plans.",

          providerStatus: response.status,

          providerResponse: result,
        },
        {
          status:
            response.status >= 400 && response.status <= 599
              ? response.status
              : 502,
        }
      );
    }

    // ========================================================
    // FIND RAW PLANS
    // ========================================================

    const rawPlans = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.plans)
      ? result.data.plans
      : Array.isArray(result.data?.data)
      ? result.data.data
      : Array.isArray(result.plans)
      ? result.plans
      : Array.isArray(result.results)
      ? result.results
      : Array.isArray(result)
      ? result
      : [];

    console.log("NETWORKDATASUB RAW PLAN COUNT:", rawPlans.length);

    // ========================================================
    // NORMALIZE PLANS
    // ========================================================

    const plans: NormalizedPlan[] = rawPlans
      .map((plan: any, index: number) => {
        // ------------------------------------------------
        // DATABASE ID
        // ------------------------------------------------

        const rawId = firstValue(
          plan.id,
          plan.bundle_id,
          plan.bundleId,
          plan.plan_id,
          plan.planId,
          plan.api_plan_id,
          plan.apiPlanId
        );

        // ------------------------------------------------
        // BUNDLE ID
        // ------------------------------------------------

        const rawBundleId = firstValue(plan.bundle_id, plan.bundleId);

        // ------------------------------------------------
        // PLAN ID
        // ------------------------------------------------

        const rawPlanId = firstValue(plan.plan_id, plan.planId);

        const planId =
          rawPlanId !== null && Number.isFinite(toNumber(rawPlanId, NaN))
            ? toNumber(rawPlanId, 0)
            : null;

        // ------------------------------------------------
        // API PLAN ID
        //
        // Per NetworkDataSub's own docs (Purchase Data endpoint):
        // "data_plan_id ... can be api_plan_id or plan_id" — these
        // are interchangeable aliases for the same purchase ID, not
        // two distinct concepts. When the provider doesn't send a
        // literal api_plan_id/apiPlanId field, fall back to planId
        // (then bundleId) instead of leaving this null, since a
        // usable ID already exists.
        // ------------------------------------------------

        const rawApiPlanId = firstValue(plan.api_plan_id, plan.apiPlanId);

        const parsedApiPlanId =
          rawApiPlanId !== null && Number.isFinite(toNumber(rawApiPlanId, NaN))
            ? toNumber(rawApiPlanId, 0)
            : null;

        // ------------------------------------------------
        // BUNDLE ID FALLBACK
        //
        // Based on the response you showed:
        //
        // id = 212
        // bundleId = 240
        // planId = 240
        //
        // The purchase ID we want to preserve is 240.
        // ------------------------------------------------

        const bundleId =
          rawBundleId !== null
            ? toNumber(rawBundleId, 0)
            : planId !== null
            ? planId
            : parsedApiPlanId !== null
            ? parsedApiPlanId
            : 0;

        const apiPlanId =
          parsedApiPlanId !== null
            ? parsedApiPlanId
            : planId !== null
            ? planId
            : bundleId > 0
            ? bundleId
            : null;

        // ------------------------------------------------
        // NETWORK ID
        // ------------------------------------------------

        const rawNetworkId = firstValue(
          plan.network_id,
          plan.networkId,

          typeof plan.network === "object" ? plan.network?.id : null
        );

        const networkId =
          rawNetworkId !== null && Number.isFinite(toNumber(rawNetworkId, NaN))
            ? toNumber(rawNetworkId, 0)
            : null;

        // ------------------------------------------------
        // BASIC INFORMATION
        // ------------------------------------------------

        const provider = normalizeProvider(plan);

        const name = normalizeName(plan);

        const size = normalizeSize(plan);

        const duration = normalizeDuration(
          firstValue(
            plan.duration,
            plan.validity,
            plan.validity_period,
            plan.validityPeriod,
            plan.duration_period,
            plan.durationPeriod
          )
        );

        const status = normalizeStatus(plan);

        // ------------------------------------------------
        // PRICES
        // ------------------------------------------------

        const providerPrice = extractProviderPrice(plan);

        let sellingPrice = extractSellingPrice(plan, providerPrice);

        // ------------------------------------------------
        // MARKUP FIX
        //
        // NetworkDataSub's /data/all-plans response only exposes
        // ONE price field per plan — extractSellingPrice() has
        // nothing distinct to find, so it falls back to
        // providerPrice, and sellingPrice ends up identical (e.g.
        // MTN SME 500MB: 360 / 360 — zero margin).
        //
        // Apply the same markup used in the purchase route so this
        // listing shows the price customers will actually be
        // charged (before the service fee, which is added
        // separately at checkout).
        // ------------------------------------------------

        if (
          providerPrice > 0 &&
          sellingPrice === providerPrice &&
          NETWORKDATASUB_MARKUP_PERCENT > 0
        ) {
          sellingPrice = Number(
            (providerPrice * (1 + NETWORKDATASUB_MARKUP_PERCENT / 100)).toFixed(2)
          );
        }

        // ------------------------------------------------
        // FRONTEND ID
        // ------------------------------------------------

        const finalId = rawId !== null ? String(rawId) : `networkdatasub-${index}`;

        // ------------------------------------------------
        // DEBUG
        // ------------------------------------------------

        if (index < 10) {
          console.log("NETWORKDATASUB NORMALIZED PLAN:", {
            finalId,

            provider,

            bundleId,

            planId,

            apiPlanId,

            networkId,

            name,

            size,

            duration,

            providerPrice,

            sellingPrice,

            status,
          });
        }

        return {
          id: finalId,

          provider,

          bundleId,

          planId,

          apiPlanId,

          networkId,

          name,

          size,

          duration,

          providerPrice,

          sellingPrice,

          status,

          raw: plan,
        };
      })
      .filter(
        (plan: NormalizedPlan) =>
          plan.bundleId > 0 && plan.provider !== "" && plan.name !== ""
      );

    // ========================================================
    // PRICE SUMMARY
    // ========================================================

    const plansWithPrices = plans.filter((plan) => plan.providerPrice > 0).length;

    const plansWithoutPrices = plans.filter(
      (plan) => plan.providerPrice <= 0
    ).length;

    console.log("======================================");

    console.log("NETWORKDATASUB PRICE SUMMARY:", {
      totalPlans: plans.length,

      plansWithPrices,

      plansWithoutPrices,
    });

    console.log("======================================");

    // ========================================================
    // SUCCESS
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        provider: "NetworkDataSub",

        data: plans,

        count: plans.length,

        priceSummary: {
          plansWithPrices,

          plansWithoutPrices,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("======================================");

    console.error("NETWORKDATASUB DATA PLANS ERROR:", error?.message || error);

    console.error(error?.stack || "");

    console.error("======================================");

    return NextResponse.json(
      {
        success: false,

        message: error?.message || "Unable to load NetworkDataSub data plans.",
      },
      {
        status: 500,
      }
    );
  }
}