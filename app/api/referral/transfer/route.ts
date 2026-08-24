import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // ============================================================
    // 1. AUTHENTICATION
    // ============================================================

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

    const userId = session.user.id;

    // ============================================================
    // 2. ATOMIC TRANSFER
    // ============================================================

    const result = await prisma.$transaction(
      async (tx) => {
        // --------------------------------------------------------
        // Get current user
        // --------------------------------------------------------

        const user = await tx.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            status: true,
            referralBalance: true,
            walletBalance: true,
          },
        });

        if (!user) {
          throw new Error("User account not found.");
        }

        if (user.status !== "ACTIVE") {
          throw new Error(
            "Your account is not active."
          );
        }

        const referralBalance = Number(
          user.referralBalance
        );

        if (
          !Number.isFinite(referralBalance) ||
          referralBalance <= 0
        ) {
          throw new Error(
            "You do not have any referral earnings available to transfer."
          );
        }

        // --------------------------------------------------------
        // ATOMIC REFERRAL BALANCE DEDUCTION
        //
        // This prevents the same referral balance from being
        // transferred twice by simultaneous requests.
        // --------------------------------------------------------

        const referralDebit =
          await tx.user.updateMany({
            where: {
              id: userId,
              status: "ACTIVE",
              referralBalance: {
                gte: referralBalance,
              },
            },
            data: {
              referralBalance: {
                decrement: referralBalance,
              },
            },
          });

        if (referralDebit.count !== 1) {
          throw new Error(
            "Referral balance changed. Please try again."
          );
        }

        // --------------------------------------------------------
        // ADD REFERRAL EARNINGS TO MAIN WALLET
        // --------------------------------------------------------

        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            walletBalance: {
              increment: referralBalance,
            },
          },
        });

        // --------------------------------------------------------
        // GET FINAL BALANCES
        // --------------------------------------------------------

        const updatedUser =
          await tx.user.findUnique({
            where: {
              id: userId,
            },
            select: {
              referralBalance: true,
              walletBalance: true,
            },
          });

        return {
          transferredAmount: referralBalance,

          referralBalance: Number(
            updatedUser?.referralBalance ?? 0
          ),

          walletBalance: Number(
            updatedUser?.walletBalance ?? 0
          ),
        };
      }
    );

    // ============================================================
    // 3. SUCCESS
    // ============================================================

    return NextResponse.json({
      success: true,

      message: `₦${result.transferredAmount.toLocaleString(
        "en-NG",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )} referral earnings transferred to your wallet.`,

      transferredAmount:
        result.transferredAmount,

      referralBalance:
        result.referralBalance,

      walletBalance:
        result.walletBalance,
    });
  } catch (error: any) {
    console.error(
      "REFERRAL TRANSFER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to transfer referral earnings.",
      },
      { status: 400 }
    );
  }
}