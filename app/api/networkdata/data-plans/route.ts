import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        {
          status: 401,
        },
      );
    }

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

      isAvailable: true,
    }));

    return NextResponse.json(
      {
        success: true,
        provider: "NetworkDataSub",
        count: formatted.length,
        data: formatted,
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
        message: "Unable to load NetworkDataSub data plans.",
      },
      {
        status: 500,
      },
    );
  }
}
