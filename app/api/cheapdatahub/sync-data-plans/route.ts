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
        { status: 500 },
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
      },
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
        { status: response.status },
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
        { status: response.status },
      );
    }

    const plans = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    if (plans.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "CheapDataHub returned no data plans.",
          raw: result,
        },
        { status: 502 },
      );
    }

    let synced = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const plan of plans) {
      const bundleId = Number(plan.id);

      if (!Number.isInteger(bundleId) || bundleId <= 0) {
        skipped++;
        continue;
      }

      const network = String(plan.provider || "")
        .trim()
        .toUpperCase();

      const size = String(plan.size || "").trim();

      const duration = String(plan.duration || "").trim();

      const providerPrice = Number(
        plan.api_price ??
          plan.apiPrice ??
          plan.price ??
          plan.provider_price ??
          0,
      );

      if (
        !network ||
        !size ||
        !Number.isFinite(providerPrice) ||
        providerPrice <= 0
      ) {
        skipped++;
        continue;
      }

      const name = `${network} ${size}`;

      const existingPlan = await prisma.dataPlan.findUnique({
        where: {
          provider_bundleId: {
            provider: "CheapDataHub",
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
         * Do NOT update sellingPrice here.
         * Do NOT update status here.
         *
         * Those values are controlled by the admin.
         *
         * This allows:
         * - Admin price changes to remain intact.
         * - Admin-deactivated plans to remain deactivated.
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
         * New plans get the provider price as their
         * initial selling price.
         *
         * Admin can change it later.
         */
        await prisma.dataPlan.create({
          data: {
            provider: "CheapDataHub",
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

      synced++;
    }

    return NextResponse.json({
      success: true,
      message: "CheapDataHub data plans synchronized successfully.",
      totalReceived: plans.length,
      totalSynced: synced,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    console.error("CHEAPDATAHUB SYNC ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to synchronize CheapDataHub data plans.",
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
