import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: SERVICE_FEE_SETTING_KEY,
      },
      select: {
        value: true,
      },
    });

    console.log("SERVICE FEE DATABASE SETTING:", setting);

    // If setting does not exist
    if (!setting) {
      return NextResponse.json(
        {
          success: false,
          message: "SERVICE_FEE_PERCENT setting was not found.",
          percentage: null,
          serviceFeePercentage: null,
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    const percentage = Number(setting.value);

    // Validate percentage
    if (
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      console.error(
        "INVALID SERVICE FEE VALUE:",
        setting.value
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid service fee percentage in database.",
          percentage: null,
          serviceFeePercentage: null,
        },
        {
          status: 500,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    console.log(
      "CURRENT ADMIN SERVICE FEE:",
      `${percentage}%`
    );

    return NextResponse.json(
      {
        success: true,
        percentage: percentage,
        serviceFeePercentage: percentage,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("SERVICE FEE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load service fee.",
        percentage: null,
        serviceFeePercentage: null,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}