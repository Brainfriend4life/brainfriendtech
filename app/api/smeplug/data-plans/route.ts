import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    const formatted = plans.map((plan) => {
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
    console.error("SMEPLUG DATABASE PLANS ERROR:", error?.message || error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load SMEPlug data plans.",
      },
      {
        status: 500,
      },
    );
  }
}
