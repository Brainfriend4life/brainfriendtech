import { NextResponse } from "next/server";
import { getServiceFeePercent } from "@/lib/service-fee";

export async function GET() {
  try {
    const percentage = await getServiceFeePercent();

    return NextResponse.json({
      success: true,
      percentage,
    });
  } catch (error) {
    console.error("SERVICE FEE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load service fee.",
      },
      { status: 500 }
    );
  }
}