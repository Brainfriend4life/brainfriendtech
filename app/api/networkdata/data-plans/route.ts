import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NETWORKDATASUB_BASE_URL = "https://www.networkdatasub.com/api";

const NETWORKDATASUB_PLANS_URL = `${NETWORKDATASUB_BASE_URL}/data/all-plans`;

function firstValue(...values: unknown[]) {
  return values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function normalizeNetwork(network: any) {
  if (network && typeof network === "object") {
    return String(firstValue(network.code, network.name) ?? "")
      .trim()
      .toUpperCase();
  }

  return String(network ?? "")
    .trim()
    .toUpperCase();
}

function getPlanId(plan: Record<string, any>) {
  /*
   * IMPORTANT:
   *
   * NetworkDataSub has two IDs:
   *
   * id      -> internal NetworkDataSub record ID
   * plan_id -> actual API plan ID used for purchase
   *
   * We MUST use plan_id.
   */

  const value = firstValue(plan.plan_id, plan.planId);

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function getProviderPrice(plan: Record<string, any>) {
  /*
   * Actual NetworkDataSub response:
   *
   * price: {
   *   amount: 110,
   *   formatted: "₦110.0",
   *   currency: "NGN"
   * }
   */

  const priceObject =
    plan.price && typeof plan.price === "object" ? plan.price : null;

  const value = firstValue(
    priceObject?.amount,
    plan.price_amount,
    plan.api_price,
    plan.apiPrice,
    plan.provider_price,
    plan.providerPrice,
  );

  const price = Number(value);

  return Number.isFinite(price) && price > 0 ? price : null;
}

function getName(plan: Record<string, any>) {
  return String(
    firstValue(plan.plan_name, plan.planName, plan.name, plan.title) ?? "",
  ).trim();
}

function getSize(plan: Record<string, any>) {
  return String(
    firstValue(plan.data_size, plan.dataSize, plan.size, plan.data) ?? "",
  ).trim();
}

function getDuration(plan: Record<string, any>) {
  /*
   * Actual response:
   *
   * validity: {
   *   days: 14,
   *   formatted: "14 days"
   * }
   */

  if (plan.validity && typeof plan.validity === "object") {
    const formatted = firstValue(plan.validity.formatted, plan.validity.name);

    if (formatted) {
      return String(formatted).trim();
    }

    const days = Number(plan.validity.days);

    if (Number.isFinite(days) && days > 0) {
      return `${days} days`;
    }
  }

  return String(
    firstValue(plan.duration, plan.validity_period, plan.validityPeriod) ?? "",
  ).trim();
}

function extractPlans(result: any): Record<string, any>[] {
  const candidates = [
    result?.data,
    result?.data?.plans,
    result?.data?.data,
    result?.plans,
    result?.results,
    result,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item) => item && typeof item === "object");
    }
  }

  return [];
}

async function fetchNetworkDataSubPlans(apiKey: string) {
  const response = await fetch(NETWORKDATASUB_PLANS_URL, {
    method: "GET",
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  const responseText = await response.text();

  console.log("NETWORKDATASUB PLANS STATUS:", response.status);

  console.log("NETWORKDATASUB PLANS RESPONSE:", responseText.slice(0, 3000));

  let result: any = null;

  try {
    result = responseText.trim() ? JSON.parse(responseText) : null;
  } catch (error) {
    console.error("NETWORKDATASUB PLANS JSON ERROR:", error);
  }

  if (!result) {
    throw new Error("NetworkDataSub returned an invalid plans response.");
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.msg ||
        result?.error ||
        "Unable to retrieve NetworkDataSub data plans.",
    );
  }

  const plans = extractPlans(result);

  if (plans.length === 0) {
    throw new Error("NetworkDataSub returned no data plans.");
  }

  return plans;
}

async function syncNetworkDataSubPlans(apiKey: string) {
  const providerPlans = await fetchNetworkDataSubPlans(apiKey);

  let received = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const providerPlan of providerPlans) {
    received++;

    const bundleId = getPlanId(providerPlan);

    if (!bundleId) {
      console.warn(
        "NETWORKDATASUB PLAN SKIPPED - INVALID PLAN ID:",
        providerPlan,
      );

      skipped++;
      continue;
    }

    const network = normalizeNetwork(providerPlan.network);

    const name = getName(providerPlan);

    const size = getSize(providerPlan);

    const duration = getDuration(providerPlan);

    const providerPrice = getProviderPrice(providerPlan);

    if (!network || !name || !size || !providerPrice || providerPrice <= 0) {
      console.warn("NETWORKDATASUB PLAN SKIPPED:", {
        bundleId,
        network,
        name,
        size,
        duration,
        providerPrice,
        providerPlan,
      });

      skipped++;
      continue;
    }

    /*
     * Check if this exact provider + plan ID
     * already exists.
     */
    const existingPlan = await prisma.dataPlan.findUnique({
      where: {
        provider_bundleId: {
          provider: "NetworkDataSub",
          bundleId,
        },
      },
      select: {
        id: true,
        sellingPrice: true,
        status: true,
      },
    });

    if (existingPlan) {
      /*
       * DO NOT overwrite:
       *
       * sellingPrice
       * status
       *
       * These belong to Admin → Data Prices.
       */
      await prisma.dataPlan.update({
        where: {
          id: existingPlan.id,
        },
        data: {
          network,
          name,
          size,
          duration,
          providerPrice,
        },
      });

      updated++;
    } else {
      /*
       * New plan.
       *
       * Start selling price at provider price.
       * Admin can change this afterwards.
       */
      await prisma.dataPlan.create({
        data: {
          provider: "NetworkDataSub",
          network,
          bundleId,
          name,
          size,
          duration,
          providerPrice,
          sellingPrice: providerPrice,
          status: "ACTIVE",
        },
      });

      created++;
    }
  }

  return {
    received,
    created,
    updated,
    skipped,
  };
}

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
        { status: 401 },
      );
    }

    // ========================================================
    // API KEY
    // ========================================================

    const apiKey = process.env.NETWORKDATASUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "NetworkDataSub API key is not configured.",
        },
        { status: 500 },
      );
    }

    // ========================================================
    // SYNC LIVE PROVIDER PLANS
    // ========================================================

    const syncResult = await syncNetworkDataSubPlans(apiKey);

    console.log("NETWORKDATASUB PLAN SYNC:", syncResult);

    // ========================================================
    // GET ACTIVE PLANS FROM DATABASE
    // ========================================================

    const plans = await prisma.dataPlan.findMany({
      where: {
        provider: "NetworkDataSub",
        status: "ACTIVE",
      },
      orderBy: [
        {
          network: "asc",
        },
        {
          sellingPrice: "asc",
        },
      ],
      select: {
        id: true,
        provider: true,
        network: true,
        bundleId: true,
        name: true,
        size: true,
        duration: true,
        providerPrice: true,
        sellingPrice: true,
        status: true,
      },
    });

    // ========================================================
    // FORMAT FOR EXISTING CUSTOMER PAGE
    // ========================================================

    const formatted = plans.map((plan) => ({
      id: String(plan.bundleId),

      bundleId: plan.bundleId,

      bundle_id: plan.bundleId,

      provider: plan.network,

      network: plan.network,

      name: plan.name,

      size: plan.size,

      duration: plan.duration,

      providerPrice: plan.providerPrice,

      sellingPrice: plan.sellingPrice,

      status: plan.status,

      planId: plan.bundleId,

      plan_id: plan.bundleId,

      apiPlanId: plan.bundleId,

      api_plan_id: plan.bundleId,

      dataPlanId: plan.bundleId,

      data_plan_id: plan.bundleId,
    }));

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        provider: "NetworkDataSub",
        data: formatted,
        count: formatted.length,
        sync: syncResult,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error: any) {
    console.error(
      "NETWORKDATASUB DATABASE PLANS ERROR:",
      error?.message || error,
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load NetworkDataSub data plans.",
      },
      { status: 500 },
    );
  }
}
