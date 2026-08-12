import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.dataPlan.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [
        {
          provider: "asc",
        },
        {
          sellingPrice: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("DATA PLANS API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load data plans",
      },
      {
        status: 500,
      }
    );
  }
}