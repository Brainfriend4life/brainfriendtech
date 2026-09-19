import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.dataPlan.findMany({
      where: {
        provider: "CheapDataHub",
        status: "ACTIVE",
      },
      orderBy: [{ network: "asc" }, { sellingPrice: "asc" }],
      select: {
        id: true,
        bundleId: true,
        provider: true,
        network: true,
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
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("CheapDataHub data plans error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load data plans",
      },
      { status: 500 },
    );
  }
}
