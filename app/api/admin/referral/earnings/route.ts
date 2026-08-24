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

    const earnings =
      await prisma.referralEarning.findMany({
        include: {
          referrer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              referralCode: true,
            },
          },

          referredUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 500,
      });

    const result = earnings.map(
      (earning) => ({
        id: earning.id,

        amount: Number(earning.amount || 0),

        percentage: Number(
          earning.percentage || 0
        ),

        transactionAmount: Number(
          earning.transactionAmount || 0
        ),

        type: earning.type,

        status: earning.status,

        description:
          earning.description,

        reference:
          earning.reference,

        createdAt:
          earning.createdAt,

        referrer: earning.referrer
          ? {
              id: earning.referrer.id,
              fullName:
                earning.referrer.fullName,
              email:
                earning.referrer.email,
              referralCode:
                earning.referrer.referralCode,
            }
          : null,

        referredUser:
          earning.referredUser
            ? {
                id:
                  earning.referredUser.id,
                fullName:
                  earning.referredUser
                    .fullName,
                email:
                  earning.referredUser
                    .email,
              }
            : null,
      })
    );

    const total = result.reduce(
      (sum, item) =>
        sum + item.amount,
      0
    );

    const successful = result
      .filter(
        (item) =>
          item.status === "SUCCESS"
      )
      .reduce(
        (sum, item) =>
          sum + item.amount,
        0
      );

    return NextResponse.json({
      success: true,
      earnings: result,

      summary: {
        total,
        successful,
        count: result.length,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN REFERRAL EARNINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load referral earnings.",
      },
      { status: 500 }
    );
  }
}