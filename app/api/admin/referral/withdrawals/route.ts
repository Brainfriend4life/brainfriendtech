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

    const withdrawals =
      await prisma.referralWithdrawal.findMany({
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              referralCode: true,
              referralBalance: true,
              walletBalance: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const result = withdrawals.map(
      (withdrawal) => ({
        id: withdrawal.id,

        amount: Number(
          withdrawal.amount
        ),

        status: withdrawal.status,

        reference:
          withdrawal.reference,

        adminNote:
          withdrawal.adminNote,

        createdAt:
          withdrawal.createdAt,

        updatedAt:
          withdrawal.updatedAt,

        user: {
          id: withdrawal.user.id,

          fullName:
            withdrawal.user.fullName,

          email:
            withdrawal.user.email,

          phone:
            withdrawal.user.phone,

          referralCode:
            withdrawal.user
              .referralCode,

          referralBalance: Number(
            withdrawal.user
              .referralBalance || 0
          ),

          walletBalance: Number(
            withdrawal.user
              .walletBalance || 0
          ),
        },
      })
    );

    return NextResponse.json({
      success: true,
      withdrawals: result,
    });
  } catch (error) {
    console.error(
      "ADMIN REFERRAL WITHDRAWALS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load referral withdrawals.",
      },
      { status: 500 }
    );
  }
}