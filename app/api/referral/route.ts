import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        fullName: true,
        referralCode: true,
        referralBalance: true,
        walletBalance: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      referralCode: user.referralCode,
      referralBalance: Number(user.referralBalance),
      walletBalance: Number(user.walletBalance),
    });
  } catch (error) {
    console.error("REFERRAL GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load referral information.",
      },
      { status: 500 }
    );
  }
}