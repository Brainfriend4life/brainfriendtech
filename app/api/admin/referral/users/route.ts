import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        referredUsers: {
          some: {},
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        referralCode: true,
        referralBalance: true,
        walletBalance: true,
        createdAt: true,

        _count: {
          select: {
            referredUsers: true,
            referralEarnings: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      referralCode: user.referralCode,
      referralBalance: Number(user.referralBalance || 0),
      walletBalance: Number(user.walletBalance || 0),
      referredUsers: user._count.referredUsers,
      earningsCount: user._count.referralEarnings,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({
      success: true,
      users: result,
    });
  } catch (error) {
    console.error("ADMIN REFERRAL USERS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load referral users.",
      },
      { status: 500 }
    );
  }
}