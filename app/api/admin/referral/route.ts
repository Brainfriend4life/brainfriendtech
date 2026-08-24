import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const referrals = await prisma.referral.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        referrer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            referralCode: true,
            walletBalance: true,
          },
        },

        referred: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const totalReferrals = referrals.length;

    const totalEarned = referrals.reduce(
      (total, referral) =>
        total + Number(referral.amount || 0),
      0
    );

    const pendingEarned = referrals
      .filter(
        (referral) =>
          referral.status === "PENDING"
      )
      .reduce(
        (total, referral) =>
          total + Number(referral.amount || 0),
        0
      );

    const paidEarned = referrals
      .filter(
        (referral) =>
          referral.status === "PAID" ||
          referral.status === "CREDITED" ||
          referral.status === "COMPLETED"
      )
      .reduce(
        (total, referral) =>
          total + Number(referral.amount || 0),
        0
      );

    const referrerMap = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        referralCode: string | null;
        referrals: number;
        earnings: number;
        walletBalance: number;
      }
    >();

    for (const referral of referrals) {
      const user = referral.referrer;

      if (!user) continue;

      const amount = Number(
        referral.amount || 0
      );

      const existing =
        referrerMap.get(user.id);

      if (existing) {
        existing.referrals += 1;
        existing.earnings += amount;
      } else {
        referrerMap.set(user.id, {
          userId: user.id,
          name: user.fullName,
          email: user.email,
          referralCode:
            user.referralCode || null,
          referrals: 1,
          earnings: amount,
          walletBalance: Number(
            user.walletBalance || 0
          ),
        });
      }
    }

    const topReferrers = Array.from(
      referrerMap.values()
    )
      .sort(
        (a, b) =>
          b.earnings - a.earnings
      )
      .slice(0, 10);

    return NextResponse.json({
      success: true,

      stats: {
        totalReferrals,
        totalEarned,
        pendingEarned,
        paidEarned,
      },

      referrals,

      topReferrers,
    });
  } catch (error) {
    console.error(
      "ADMIN REFERRAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load referral data.",
      },
      { status: 500 }
    );
  }
}