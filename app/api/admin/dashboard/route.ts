import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const [
      users,
      activeUsers,
      transactions,
      successfulTransactions,
      pendingTransactions,
      failedTransactions,
      revenue,
      businessWallet,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.transaction.count(),

      prisma.transaction.count({
        where: {
          status: "SUCCESS",
        },
      }),

      prisma.transaction.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.transaction.count({
        where: {
          status: "FAILED",
        },
      }),

      prisma.transaction.aggregate({
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
      }),

      prisma.businessWallet.findUnique({
        where: {
          name: "Brainfriend Global Tech",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,

      users: {
        total: users,
        active: activeUsers,
      },

      transactions: {
        total: transactions,
        successful: successfulTransactions,
        pending: pendingTransactions,
        failed: failedTransactions,
      },

      revenue: {
        total: Number(revenue._sum.amount ?? 0),
        cost: Number(revenue._sum.cost ?? 0),
        profit: Number(revenue._sum.profit ?? 0),
      },

      businessWallet: businessWallet
        ? {
            balance: Number(
              businessWallet.balance
            ),

            totalRevenue: Number(
              businessWallet.totalRevenue
            ),

            totalCost: Number(
              businessWallet.totalCost
            ),

            totalProfit: Number(
              businessWallet.totalProfit
            ),

            withdrawnProfit: Number(
              businessWallet.withdrawnProfit
            ),

            availableProfit: Number(
              businessWallet.availableProfit
            ),
          }
        : {
            balance: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            withdrawnProfit: 0,
            availableProfit: 0,
          },
    });
  } catch (error) {
    console.error(
      "ADMIN DASHBOARD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load admin dashboard.",
      },
      { status: 500 }
    );
  }
}