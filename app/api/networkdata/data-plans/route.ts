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

function normalizeNetwork(value: unknown) {
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;

    value = firstValue(
      object.name,
      object.network,
      object.network_name,
      object.networkName,
      object.title,
    );
  }

  const network = String(value ?? "")
    .trim()
    .toUpperCase();

  if (network.includes("MTN")) return "MTN";
  if (network.includes("AIRTEL")) return "AIRTEL";
  if (network.includes("9MOBILE") || network.includes("9 MOBILE")) {
    return "9MOBILE";
  }
  if (network.includes("GLO")) return "GLO";

  return network;
}

function normalizeSize(plan: Record<string, any>) {
  return String(
    firstValue(
      plan.size,
      plan.data,
      plan.data_size,
      plan.dataSize,
      plan.bundle,
      plan.volume,
      plan.name,
    ) ?? "",
  ).trim();
}

function normalizeName(plan: Record<string, any>) {
  return String(
    firstValue(
      plan.name,
      plan.plan_name,
      plan.planName,
      plan.title,
      plan.description,
      plan.bundle_name,
    ) ?? "",
  ).trim();
}

function normalizeDuration(plan: Record<string, any>) {
  return String(
    firstValue(
      plan.duration,
      plan.validity,
      plan.validity_period,
      plan.validityPeriod,
      plan.duration_period,
      plan.durationPeriod,
    ) ?? "",
  ).trim();
}

function getPlanId(plan: Record<string, any>) {
  const value = firstValue(
    plan.plan_id,
    plan.planId,
    plan.api_plan_id,
    plan.apiPlanId,
    plan.bundle_id,
    plan.bundleId,
    plan.id,
  );

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function getProviderPrice(plan: Record<string, any>) {
  const value = firstValue(
    plan.api_price,
    plan.apiPrice,
    plan.provider_price,
    plan.providerPrice,
    plan.cost,
    plan.price,
    plan.amount,
    plan.selling_price,
    plan.sellingPrice,
  );

  const price = Number(value);

  return Number.isFinite(price) && price > 0 ? price : null;
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

  console.log("NETWORKDATASUB PLANS RESPONSE:", responseText.slice(0, 2000));

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

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const providerPlan of providerPlans) {
    const bundleId = getPlanId(providerPlan);

    if (!bundleId) {
      skipped++;
      continue;
    }

    const network = normalizeNetwork(
      firstValue(
        providerPlan.network,
        providerPlan.provider,
        providerPlan.network_name,
        providerPlan.networkName,
        providerPlan.telco,
        providerPlan.network_id,
      ),
    );

    const name = normalizeName(providerPlan);
    const size = normalizeSize(providerPlan);
    const duration = normalizeDuration(providerPlan);
    const providerPrice = getProviderPrice(providerPlan);

    if (!network || !name || !providerPrice || providerPrice <= 0) {
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
       * IMPORTANT:
       *
       * Do NOT overwrite sellingPrice or status.
       *
       * These are controlled by your Admin → Data Prices page.
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
          updatedAt: new Date(),
        },
      });

      updated++;
    } else {
      /*
       * First time this provider plan enters the database.
       *
       * For now, provider price is used as the initial
       * selling price. Admin can then change it from
       * Admin → Data Prices.
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
    received: providerPlans.length,
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
      console.error("NETWORKDATASUB_API_KEY is not configured.");

      return NextResponse.json(
        {
          success: false,
          message: "NetworkDataSub API key is not configured.",
        },
        { status: 500 },
      );
    }

    // ========================================================
    // SYNC PROVIDER PLANS INTO DATABASE
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
