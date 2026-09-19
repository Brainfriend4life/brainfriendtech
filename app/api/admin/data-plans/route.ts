import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

// GET DATA PLANS
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);

    const provider = searchParams.get("provider");
    const network = searchParams.get("network");
    const search = searchParams.get("search");

    const where: any = {};

    if (provider && provider !== "ALL") {
      where.provider = provider;
    }

    if (network && network !== "ALL") {
      where.network = network;
    }

    if (search?.trim()) {
      const query = search.trim();

      const searchConditions: any[] = [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          size: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          duration: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          provider: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          network: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];

      const numericQuery = Number(query);

      if (Number.isInteger(numericQuery)) {
        searchConditions.push({
          bundleId: numericQuery,
        });
      }

      where.OR = searchConditions;
    }

    const plans = await prisma.dataPlan.findMany({
      where,
      orderBy: [
        {
          provider: "asc",
        },
        {
          network: "asc",
        },
        {
          sellingPrice: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("ADMIN DATA PLANS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load data plans.",
      },
      { status: 500 },
    );
  }
}

// CREATE / UPDATE DATA PLAN
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const {
      id,
      provider,
      network,
      bundleId,
      name,
      size,
      duration,
      providerPrice,
      sellingPrice,
      status,
    } = body;

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider is required.",
        },
        { status: 400 },
      );
    }

    if (!network) {
      return NextResponse.json(
        {
          success: false,
          message: "Network is required.",
        },
        { status: 400 },
      );
    }

    if (!name || !size || !duration) {
      return NextResponse.json(
        {
          success: false,
          message: "Plan name, size and duration are required.",
        },
        { status: 400 },
      );
    }

    const parsedBundleId = Number(bundleId);
    const parsedProviderPrice = Number(providerPrice);
    const parsedSellingPrice = Number(sellingPrice);

    if (!Number.isInteger(parsedBundleId) || parsedBundleId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid bundle ID.",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(parsedProviderPrice) || parsedProviderPrice < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid provider price.",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid selling price.",
        },
        { status: 400 },
      );
    }

    const normalizedProvider = String(provider).trim();
    const normalizedNetwork = String(network).trim().toUpperCase();

    const normalizedStatus = status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    const belowCost = parsedSellingPrice < parsedProviderPrice;

    let plan;

    if (id) {
      // Make sure the plan exists.
      const existingPlan = await prisma.dataPlan.findUnique({
        where: {
          id: String(id),
        },
      });

      if (!existingPlan) {
        return NextResponse.json(
          {
            success: false,
            message: "Data plan not found.",
          },
          { status: 404 },
        );
      }

      // Prevent changing the provider/network/bundle combination
      // into a duplicate record.
      const duplicate = await prisma.dataPlan.findFirst({
        where: {
          provider: normalizedProvider,
          bundleId: parsedBundleId,
          NOT: {
            id: String(id),
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Another data plan already uses this provider and bundle ID.",
          },
          { status: 409 },
        );
      }

      plan = await prisma.dataPlan.update({
        where: {
          id: String(id),
        },
        data: {
          provider: normalizedProvider,
          network: normalizedNetwork,
          bundleId: parsedBundleId,
          name: String(name).trim(),
          size: String(size).trim(),
          duration: String(duration).trim(),
          providerPrice: parsedProviderPrice,
          sellingPrice: parsedSellingPrice,
          status: normalizedStatus,
        },
      });
    } else {
      plan = await prisma.dataPlan.upsert({
        where: {
          provider_bundleId: {
            provider: normalizedProvider,
            bundleId: parsedBundleId,
          },
        },
        update: {
          network: normalizedNetwork,
          name: String(name).trim(),
          size: String(size).trim(),
          duration: String(duration).trim(),
          providerPrice: parsedProviderPrice,
          sellingPrice: parsedSellingPrice,
          status: normalizedStatus,
        },
        create: {
          provider: normalizedProvider,
          network: normalizedNetwork,
          bundleId: parsedBundleId,
          name: String(name).trim(),
          size: String(size).trim(),
          duration: String(duration).trim(),
          providerPrice: parsedProviderPrice,
          sellingPrice: parsedSellingPrice,
          status: normalizedStatus,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: belowCost
        ? "Data plan saved. Warning: selling price is below provider cost."
        : "Data plan saved successfully.",
      warning: belowCost,
      plan,
    });
  } catch (error: any) {
    console.error("ADMIN DATA PLAN SAVE ERROR:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message:
            "A data plan with this provider and bundle ID already exists.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to save data plan.",
      },
      { status: 500 },
    );
  }
}

// PATCH — UPDATE ONLY PRICE / STATUS
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Data plan ID is required.",
        },
        { status: 400 },
      );
    }

    const existingPlan = await prisma.dataPlan.findUnique({
      where: {
        id,
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        {
          success: false,
          message: "Data plan not found.",
        },
        { status: 404 },
      );
    }

    const data: any = {};

    if (body.sellingPrice !== undefined) {
      const sellingPrice = Number(body.sellingPrice);

      if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid selling price.",
          },
          { status: 400 },
        );
      }

      data.sellingPrice = sellingPrice;
    }

    if (body.status !== undefined) {
      data.status = body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Nothing to update.",
        },
        { status: 400 },
      );
    }

    const plan = await prisma.dataPlan.update({
      where: {
        id,
      },
      data,
    });

    const belowCost = Number(plan.sellingPrice) < Number(plan.providerPrice);

    return NextResponse.json({
      success: true,
      message: belowCost
        ? "Data plan updated. Warning: selling price is below provider cost."
        : "Data plan updated successfully.",
      warning: belowCost,
      plan,
    });
  } catch (error: any) {
    console.error("ADMIN DATA PLAN PATCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update data plan.",
      },
      { status: 500 },
    );
  }
}
