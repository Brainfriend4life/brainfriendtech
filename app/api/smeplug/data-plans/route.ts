import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // ========================================================
    // GET ACTIVE SMEPLUG PLANS FROM DATABASE
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

    const formatted = plans.map((plan) => {
      /*
       * SMEPlug purchase requests require network_id.
       *
       * Your DataPlan table currently stores the network name,
       * so map the network name back to SMEPlug's network ID.
       */

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

    return NextResponse.json(
      {
        success: true,
        provider: "SMEPlug",
        data: formatted,
        count: formatted.length,
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
