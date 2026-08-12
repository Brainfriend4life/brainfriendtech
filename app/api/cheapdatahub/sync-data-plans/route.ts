import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const apiKey = process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "CHEAPDATAHUB_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://www.cheapdatahub.ng/api/v1/resellers/data/plans/",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      return NextResponse.json(
        {
          success: false,
          error: "CheapDataHub returned a non-JSON response.",
          status: response.status,
          responsePreview: text.slice(0, 500),
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            result?.message ||
            result?.error ||
            "CheapDataHub failed to return data plans.",
        },
        { status: response.status }
      );
    }

    const plans = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (plans.length === 0) {
      return NextResponse.json({
        success: false,
        error: "CheapDataHub returned no data plans.",
        raw: result,
      });
    }

    let synced = 0;

    for (const plan of plans) {
      const bundleId = Number(plan.id);

      if (!bundleId) continue;

      const provider = String(plan.provider || "").toUpperCase();

      const size = String(plan.size || "");

      const duration = String(plan.duration || "");

      const providerPrice = Number(
        plan.api_price ??
          plan.apiPrice ??
          plan.price ??
          plan.provider_price ??
          0
      );

      if (!provider || !size || !providerPrice) {
        continue;
      }

      const name = `${provider} ${size}`;

      await prisma.dataPlan.upsert({
        where: {
          bundleId,
        },

        update: {
          provider,
          name,
          size,
          duration,
          providerPrice,
          updatedAt: new Date(),
        },

        create: {
          provider,
          bundleId,
          name,
          size,
          duration,
          providerPrice,

          // Initial customer price.
          // Admin can change this later.
          sellingPrice: providerPrice,

          status: "ACTIVE",
        },
      });

      synced++;
    }

    return NextResponse.json({
      success: true,
      message: "CheapDataHub data plans synchronized successfully.",
      totalReceived: plans.length,
      totalSynced: synced,
    });
  } catch (error) {
    console.error("CHEAPDATAHUB SYNC ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to synchronize CheapDataHub data plans.",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}