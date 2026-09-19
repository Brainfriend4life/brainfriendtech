import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SMEPLUG_BASE_URL = "https://smeplug.ng/api/v1";
const SMEPLUG_PLANS_URL = `${SMEPLUG_BASE_URL}/data/plans`;

const NETWORK_NAMES: Record<number, string> = {
  1: "MTN",
  2: "AIRTEL",
  3: "9MOBILE",
  4: "GLO",
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/**
 * SMEPlug can return:
 *
 * telco_price: 500
 * price: 485
 *
 * or:
 *
 * telco_price: 0
 * price: 250
 *
 * We use telco_price when it is available.
 * Otherwise we fall back to price.
 */
function getProviderPrice(plan: any): number | null {
  const telcoPrice = toNumber(plan?.telco_price);

  if (telcoPrice !== null && telcoPrice > 0) {
    return telcoPrice;
  }

  const price = toNumber(plan?.price);

  if (price !== null && price > 0) {
    return price;
  }

  return null;
}

function getPlanName(plan: any): string {
  return String(plan?.name ?? "").trim();
}

/**
 * Extract the main data size from the plan name.
 *
 * Examples:
 * 100MB Share -> 100MB
 * 1GB Share - Monthly -> 1GB
 * 2.5GB Daily -> 2.5GB
 * 750MB + Free 1hr -> 750MB
 */
function getSize(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)/i);

  if (!match) {
    return name;
  }

  return `${match[1]}${match[2].toUpperCase()}`;
}

/**
 * Extract a readable duration from the plan name.
 */
function getDuration(name: string): string {
  const lower = name.toLowerCase();

  if (
    lower.includes("365 days") ||
    lower.includes("365-day") ||
    lower.includes("yearly")
  ) {
    return "365 days";
  }

  if (
    lower.includes("180 days") ||
    lower.includes("180-day") ||
    lower.includes("6 months")
  ) {
    return "180 days";
  }

  if (
    lower.includes("90 days") ||
    lower.includes("90-day") ||
    lower.includes("3 months") ||
    lower.includes("3-month")
  ) {
    return "90 days";
  }

  if (
    lower.includes("60 days") ||
    lower.includes("60-day") ||
    lower.includes("2 months") ||
    lower.includes("2-month")
  ) {
    return "60 days";
  }

  if (
    lower.includes("30 days") ||
    lower.includes("30-day") ||
    lower.includes("monthly") ||
    lower.includes("month")
  ) {
    return "30 days";
  }

  if (
    lower.includes("14 days") ||
    lower.includes("14-day") ||
    lower.includes("2 weeks") ||
    lower.includes("2-week")
  ) {
    return "14 days";
  }

  if (
    lower.includes("7 days") ||
    lower.includes("7-day") ||
    lower.includes("weekly") ||
    lower.includes("week")
  ) {
    return "7 days";
  }

  if (lower.includes("3 days") || lower.includes("3-day")) {
    return "3 days";
  }

  if (lower.includes("2 days") || lower.includes("2-day")) {
    return "2 days";
  }

  if (
    lower.includes("1 day") ||
    lower.includes("1-day") ||
    lower.includes("daily")
  ) {
    return "1 day";
  }

  return "";
}

export async function GET() {
  try {
    const apiKey = process.env.SMEPLUG_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "SMEPLUG_API_KEY is not configured.",
        },
        { status: 500 },
      );
    }

    /*
     * ---------------------------------------------------------
     * 1. FETCH PLANS FROM SMEPLUG
     * ---------------------------------------------------------
     */

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
      return NextResponse.json(
        {
          success: false,
          error: "SMEPlug returned an invalid plans response.",
        },
        { status: 502 },
      );
    }

    if (!response.ok || result.status === false) {
      return NextResponse.json(
        {
          success: false,
          error:
            result?.message ||
            result?.msg ||
            "Unable to retrieve SMEPlug data plans.",
        },
        { status: response.status },
      );
    }

    /*
     * ---------------------------------------------------------
     * 2. GET GROUPED PLANS
     *
     * SMEPlug returns:
     *
     * data:
     *   "1": MTN plans
     *   "2": Airtel plans
     *   "3": 9mobile plans
     *   "4": Glo plans
     * ---------------------------------------------------------
     */

    const grouped =
      result?.data && typeof result.data === "object" ? result.data : {};

    let totalReceived = 0;
    let totalSynced = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    /*
     * ---------------------------------------------------------
     * 3. LOOP THROUGH EACH NETWORK
     * ---------------------------------------------------------
     */

    for (const [networkKey, networkPlans] of Object.entries(grouped)) {
      const networkId = Number(networkKey);

      if (!Number.isInteger(networkId)) {
        continue;
      }

      const network = NETWORK_NAMES[networkId];

      if (!network) {
        console.warn("SMEPLUG UNKNOWN NETWORK ID:", networkId);

        continue;
      }

      if (!Array.isArray(networkPlans)) {
        console.warn("SMEPLUG INVALID NETWORK PLANS:", {
          networkId,
          network,
        });

        continue;
      }

      /*
       * -------------------------------------------------------
       * 4. PROCESS EACH PLAN
       * -------------------------------------------------------
       */

      for (const plan of networkPlans as any[]) {
        totalReceived++;

        const bundleId = Number(
          plan?.id ??
            plan?.plan_id ??
            plan?.planId ??
            plan?.variation_id ??
            plan?.variationId,
        );

        const name = getPlanName(plan);

        const size = getSize(name);

        const duration = getDuration(name);

        /*
         * IMPORTANT:
         *
         * telco_price can be 0 while price contains
         * the usable provider price.
         */
        const providerPrice = getProviderPrice(plan);

        /*
         * -----------------------------------------------------
         * 5. VALIDATE PLAN
         * -----------------------------------------------------
         */

        if (
          !Number.isInteger(bundleId) ||
          bundleId <= 0 ||
          !name ||
          providerPrice === null ||
          providerPrice <= 0
        ) {
          skipped++;

          console.log("SMEPLUG PLAN SKIPPED - INVALID DATA:", {
            networkId,
            network,
            bundleId,
            name,
            size,
            duration,
            telco_price: plan?.telco_price,
            price: plan?.price,
            providerPrice,
            providerPlan: plan,
          });

          continue;
        }

        /*
         * -----------------------------------------------------
         * 6. CHECK IF PLAN ALREADY EXISTS
         * -----------------------------------------------------
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

        /*
         * -----------------------------------------------------
         * 7. UPDATE EXISTING PLAN
         *
         * IMPORTANT:
         * Do NOT touch sellingPrice.
         * Do NOT touch status.
         *
         * Those are controlled by your admin dashboard.
         * -----------------------------------------------------
         */

        if (existingPlan) {
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
          totalSynced++;

          continue;
        }

        /*
         * -----------------------------------------------------
         * 8. CREATE NEW PLAN
         *
         * New plans start with providerPrice as sellingPrice.
         * Admin can change the selling price afterwards.
         * -----------------------------------------------------
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
        totalSynced++;
      }
    }

    /*
     * ---------------------------------------------------------
     * 9. LOAD ACTIVE SMEPLUG PLANS FROM DATABASE
     *
     * This confirms that the customer endpoint is reading
     * the same database records that the admin manages.
     * ---------------------------------------------------------
     */

    const activePlans = await prisma.dataPlan.findMany({
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

    /*
     * ---------------------------------------------------------
     * 10. FORMAT CUSTOMER PLANS
     * ---------------------------------------------------------
     */

    const formattedPlans = activePlans.map((plan) => {
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

      return {
        id: `SMEPLUG-${networkId ?? "UNKNOWN"}-${plan.bundleId}`,

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

        isAvailable: true,
      };
    });

    /*
     * ---------------------------------------------------------
     * 11. RETURN RESULT
     * ---------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        provider: "SMEPlug",

        message: "SMEPlug data plans synchronized successfully.",

        totalReceived,

        totalSynced,

        created,

        updated,

        skipped,

        count: formattedPlans.length,

        data: formattedPlans,
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error: any) {
    console.error("SMEPLUG SYNC ERROR:", error?.message || error);

    return NextResponse.json(
      {
        success: false,

        error: error?.message || "Unable to synchronize SMEPlug data plans.",
      },
      {
        status: 500,
      },
    );
  } finally {
    await prisma.$disconnect();
  }
}
