import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const SETTING_KEY = "referral_percentage";
const DEFAULT_PERCENTAGE = 5;

async function checkAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  if (session.user.role !== "ADMIN") {
    return null;
  }

  return session;
}

/**
 * GET /api/referral/settings
 *
 * Returns the current referral percentage.
 */
export async function GET() {
  try {
    const session = await checkAdmin();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: SETTING_KEY,
      },
    });

    const percentage = setting
      ? Number(setting.value)
      : DEFAULT_PERCENTAGE;

    return NextResponse.json({
      success: true,
      percentage,
    });
  } catch (error) {
    console.error(
      "GET REFERRAL SETTINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load referral settings",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/referral/settings
 *
 * Updates the referral percentage.
 */
export async function PUT(request: Request) {
  try {
    const session = await checkAdmin();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const percentage = Number(body.percentage);

    if (!Number.isFinite(percentage)) {
      return NextResponse.json(
        {
          success: false,
          message: "Referral percentage must be a valid number",
        },
        { status: 400 }
      );
    }

    if (percentage < 0 || percentage > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Referral percentage must be between 0% and 100%",
        },
        { status: 400 }
      );
    }

    const formattedPercentage = Number(
      percentage.toFixed(2)
    );

    const setting =
      await prisma.systemSetting.upsert({
        where: {
          key: SETTING_KEY,
        },
        update: {
          value: String(formattedPercentage),
          description:
            "Percentage paid to users for successful referrals",
        },
        create: {
          key: SETTING_KEY,
          value: String(formattedPercentage),
          description:
            "Percentage paid to users for successful referrals",
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Referral percentage updated successfully",
      percentage: Number(setting.value),
    });
  } catch (error) {
    console.error(
      "UPDATE REFERRAL SETTINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update referral percentage",
      },
      { status: 500 }
    );
  }
}