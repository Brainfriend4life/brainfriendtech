import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    const wallet =
      await prisma.businessWallet.findUnique({
        where: {
          name: "Brainfriend Tech",
        },
      });

    const transactions =
      await prisma.transaction.aggregate({
        where: {
          status: "SUCCESS",
          isTest: false,
          type: {
            notIn: [
              "FUND_WALLET",
              "WITHDRAWAL",
            ],
          },
        },

        _sum: {
          amount: true,
          cost: true,
          profit: true,
        },
      });

    const withdrawals =
      await prisma.businessWithdrawal.aggregate({
        where: {
          status: {
            in: [
              "PENDING",
              "PROCESSING",
              "SUCCESS",
            ],
          },
        },

        _sum: {
          amount: true,
        },
      });

    const totalRevenue = Number(
      transactions._sum.amount ?? 0
    );

    const totalCost = Number(
      transactions._sum.cost ?? 0
    );

    const totalProfit = Number(
      transactions._sum.profit ?? 0
    );

    const withdrawnAmount = Number(
      withdrawals._sum.amount ?? 0
    );

    const availableBalance = Math.max(
      0,
      totalRevenue - withdrawnAmount
    );

    return NextResponse.json({
      success: true,

      wallet: {
        id: wallet?.id ?? null,
        name:
          wallet?.name ||
          "Brainfriend Tech",

        balance: availableBalance,

        totalRevenue,

        totalCost,

        totalProfit,

        withdrawnProfit:
          Number(
            wallet?.withdrawnProfit ?? 0
          ),

        availableProfit:
          Math.max(
            0,
            totalProfit -
              Number(
                wallet?.withdrawnProfit ?? 0
              )
          ),
      },

      withdrawals: {
        total:
          withdrawnAmount,
        pending:
          await getWithdrawalTotal(
            "PENDING"
          ),
        processing:
          await getWithdrawalTotal(
            "PROCESSING"
          ),
        successful:
          await getWithdrawalTotal(
            "SUCCESS"
          ),
      },
    });
  } catch (error) {
    console.error(
      "BUSINESS WALLET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load business wallet.",
      },
      { status: 500 }
    );
  }
}

async function getWithdrawalTotal(
  status:
    | "PENDING"
    | "PROCESSING"
    | "SUCCESS"
) {
  const result =
    await prisma.businessWithdrawal.aggregate({
      where: {
        status,
      },

      _sum: {
        amount: true,
      },
    });

  return Number(
    result._sum.amount ?? 0
  );
}