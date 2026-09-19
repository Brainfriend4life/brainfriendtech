import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  getUnavailableSmePlugPlanKeys,
  smePlugPlanKey,
} from "@/lib/smeplug-availability";

const SMEPLUG_BASE_URL = "https://smeplug.ng/api/v1";
const SMEPLUG_PLANS_URL = `${SMEPLUG_BASE_URL}/data/plans`;

const SMEPLUG_NETWORK_NAMES: Record<number, string> = {
  1: "MTN",
  2: "AIRTEL",
  3: "9MOBILE",
  4: "GLO",
};

function firstValue(...values: unknown[]) {
  return values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );
}

function normalizeNetworkId(value: unknown) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePlanId(plan: Record<string, any>) {
  const value = firstValue(
    plan.plan_id,
    plan.planId,
    plan.id,
    plan.variation_id,
    plan.variationId,
    plan.code,
  );

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeProviderPrice(plan: Record<string, any>) {
  const value = firstValue(
    plan.telco_price,
    plan.telcoPrice,
    plan.provider_price,
    plan.providerPrice,
    plan.api_price,
    plan.apiPrice,
    plan.cost,
    plan.price,
    plan.amount,
  );

  const price = Number(value);

  return Number.isFinite(price) && price > 0 ? price : null;
}

function normalizeName(plan: Record<string, any>) {
  return String(
    firstValue(
      plan.name,
      plan.plan_name,
      plan.planName,
      plan.title,
      plan.description,
    ) ?? "",
  ).trim();
}

function normalizeSize(plan: Record<string, any>, name: string) {
  const directSize = firstValue(
    plan.size,
    plan.data,
    plan.data_size,
    plan.dataSize,
    plan.volume,
    plan.bundle,
  );

  if (directSize) {
    return String(directSize).trim();
  }

  /*
   * SMEPlug commonly places the bundle size inside
   * the plan name, so keep the name as a fallback.
   */
  return name;
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

function extractGroupedPlans(result: any) {
  const grouped =
    result?.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data)
      ? result.data
      : {};

  const normalizedGroups: Record<number, any[]> = {};

  for (const key of Object.keys(grouped)) {
    const networkId = Number(key);

    if (!Number.isInteger(networkId)) {
      continue;
    }

    normalizedGroups[networkId] = Array.isArray(grouped[key])
      ? grouped[key].filter((item) => item && typeof item === "object")
      : [];
  }

  return normalizedGroups;
}

async function fetchSmePlugPlans(apiKey: string) {
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

  console.log("SMEPLUG PLANS RESPONSE:", responseText.slice(0, 3000));

  let result: any = null;

  try {
    result = responseText.trim() ? JSON.parse(responseText) : null;
  } catch (error) {
    console.error("SMEPLUG PLANS JSON ERROR:", error);
  }

  if (!result) {
    throw new Error("SMEPlug returned an invalid plans response.");
  }

  if (!response.ok || result.status === false) {
    throw new Error(
      result?.msg ||
        result?.message ||
        result?.error ||
        "Unable to retrieve SMEPlug data plans.",
    );
  }

  const grouped = extractGroupedPlans(result);

  const totalPlans = Object.values(grouped).reduce(
    (total, plans) => total + plans.length,
    0,
  );

  if (totalPlans === 0) {
    throw new Error("SMEPlug returned no data plans.");
  }

  return grouped;
}

async function syncSmePlugPlans(apiKey: string) {
  const grouped = await fetchSmePlugPlans(apiKey);

  let received = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [networkIdString, providerPlans] of Object.entries(grouped)) {
    const networkId = Number(networkIdString);

    const network = SMEPLUG_NETWORK_NAMES[networkId];

    /*
     * Your existing purchase route only enables
     * MTN, Airtel and GLO.
     *
     * We still understand 9MOBILE here so the
     * database remains compatible if you enable it
     * later.
     */
    if (!network) {
      skipped += providerPlans.length;
      continue;
    }

    for (const providerPlan of providerPlans) {
      received++;

      const bundleId = normalizePlanId(providerPlan);

      if (!bundleId) {
        console.warn("SMEPLUG PLAN SKIPPED - INVALID ID:", providerPlan);

        skipped++;
        continue;
      }

      const name = normalizeName(providerPlan);

      const size = normalizeSize(providerPlan, name);

      const duration = normalizeDuration(providerPlan);

      const providerPrice = normalizeProviderPrice(providerPlan);

      if (!name || !providerPrice || providerPrice <= 0) {
        console.warn("SMEPLUG PLAN SKIPPED - INVALID DATA:", {
          networkId,
          bundleId,
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
       * IMPORTANT:
       *
       * DataPlan currently has:
       *
       * @@unique([provider, bundleId])
       *
       * So the provider plan ID must be unique
       * within SMEPlug.
       */
      const existingPlan = await prisma.dataPlan.findUnique({
        where: {
          provider_bundleId: {
            provider: "SMEPlug",
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
         * NEVER overwrite:
         *
         * - sellingPrice
         * - status
         *
         * Those are controlled from:
         *
         * Admin → Data Prices
         *
         * We only refresh provider information.
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
         * New plan:
         *
         * Start selling price at provider price.
         * Admin can change it afterwards.
         */
        await prisma.dataPlan.create({
          data: {
            provider: "SMEPlug",
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
  }

  return {
    received,
    created,
    updated,
    skipped,
  };
}

export async function GET() {
  try {
    // ========================================================
    // API KEY
    // ========================================================

    const apiKey = process.env.SMEPLUG_API_KEY;

    if (!apiKey) {
      console.error("SMEPLUG_API_KEY is not configured.");

      return NextResponse.json(
        {
          success: false,
          message: "SMEPlug API key is not configured.",
        },
        { status: 500 },
      );
    }

    // ========================================================
    // SYNC SMEPLUG PLANS INTO DATABASE
    // ========================================================

    const syncResult = await syncSmePlugPlans(apiKey);

    console.log("SMEPLUG PLAN SYNC:", syncResult);

    // ========================================================
    // GET UNAVAILABLE PLANS
    // ========================================================

    const unavailableKeys = await getUnavailableSmePlugPlanKeys();

    // ========================================================
    // GET ACTIVE PLANS FROM DATABASE
    // ========================================================

    const plans = await prisma.dataPlan.findMany({
      where: {
        provider: "SMEPlug",
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
    // FORMAT FOR EXISTING CUSTOMER DATA PAGE
    // ========================================================

    const formatted = plans
      .map((plan) => {
        const networkId =
          plan.network === "MTN"
            ? 1
            : plan.network === "AIRTEL"
              ? 2
              : plan.network === "9MOBILE"
                ? 3
                : plan.network === "GLO"
                  ? 4
                  : null;

        if (!networkId) {
          return null;
        }

        const unavailableKey = smePlugPlanKey(networkId, plan.bundleId);

        const isAvailable = !unavailableKeys.has(unavailableKey);

        return {
          id: `SMEPLUG-${networkId}-${plan.bundleId}`,

          provider: plan.network,
          network: plan.network,

          networkId,

          planId: plan.bundleId,
          plan_id: plan.bundleId,

          bundleId: plan.bundleId,
          bundle_id: plan.bundleId,

          name: plan.name,
          size: plan.size,
          duration: plan.duration,

          providerPrice: plan.providerPrice,
          sellingPrice: plan.sellingPrice,

          status: plan.status,

          isAvailable,
        };
      })
      .filter(Boolean);

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        provider: "SMEPlug",
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
      "SMEPLUG DATABASE DATA PLANS ERROR:",
      error?.message || error,
    );

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load SMEPlug data plans.",
      },
      { status: 500 },
    );
  }
}
