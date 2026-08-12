import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SERVICE_TYPES = [
  "AIRTIME",
  "DATA",
  "ELECTRICITY",
  "CABLE",
  "EXAM_PIN",
] as const;

export async function GET() {
  try {
    // ============================================================
    // ADMIN AUTH
    // ============================================================

    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // DATE RANGES
    // ============================================================

    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const difference = day === 0 ? 6 : day - 1;

    startOfWeek.setDate(
      startOfWeek.getDate() - difference
    );

    startOfWeek.setHours(0, 0, 0, 0);

    // ============================================================
    // BUSINESS WALLET
    // ============================================================

    let businessWallet =
      await prisma.businessWallet.findUnique({
        where: {
          name: "Brainfriend Tech",
        },
      });

    if (!businessWallet) {
      businessWallet =
        await prisma.businessWallet.create({
          data: {
            name: "Brainfriend Tech",
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            withdrawnProfit: 0,
            availableProfit: 0,
            balance: 0,
          },
        });
    }

    // ============================================================
    // BASE FILTER
    //
    // VERY IMPORTANT:
    // isTest: false means test money does NOT enter the wallet.
    // ============================================================

    const liveServiceWhere = {
      status: "SUCCESS",
      isTest: false,
      type: {
        in: [...SERVICE_TYPES],
      },
    };

    // ============================================================
    // TOTAL LIVE REVENUE
    // ============================================================

    const totalRevenue =
      await prisma.transaction.aggregate({
        where: liveServiceWhere,

        _sum: {
          amount: true,
          cost: true,
          profit: true,
        },

        _count: {
          id: true,
        },
      });

    const totalAmount =
      Number(totalRevenue._sum.amount ?? 0);

    const totalCost =
      Number(totalRevenue._sum.cost ?? 0);

    /*
     * Calculate from amount - cost instead of trusting
     * old profit values.
     */
    const totalProfit =
      totalAmount - totalCost;

    // ============================================================
    // TODAY
    // ============================================================

    const todayRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...liveServiceWhere,
          createdAt: {
            gte: startOfDay,
          },
        },

        _sum: {
          amount: true,
          cost: true,
        },

        _count: {
          id: true,
        },
      });

    const todayAmount =
      Number(todayRevenue._sum.amount ?? 0);

    const todayCost =
      Number(todayRevenue._sum.cost ?? 0);

    // ============================================================
    // THIS WEEK
    // ============================================================

    const weekRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...liveServiceWhere,
          createdAt: {
            gte: startOfWeek,
          },
        },

        _sum: {
          amount: true,
          cost: true,
        },

        _count: {
          id: true,
        },
      });

    const weekAmount =
      Number(weekRevenue._sum.amount ?? 0);

    const weekCost =
      Number(weekRevenue._sum.cost ?? 0);

    // ============================================================
    // THIS MONTH
    // ============================================================

    const monthRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...liveServiceWhere,
          createdAt: {
            gte: startOfMonth,
          },
        },

        _sum: {
          amount: true,
          cost: true,
        },

        _count: {
          id: true,
        },
      });

    const monthAmount =
      Number(monthRevenue._sum.amount ?? 0);

    const monthCost =
      Number(monthRevenue._sum.cost ?? 0);

    // ============================================================
    // TRANSACTION COUNTS
    // ============================================================

    const successfulTransactions =
      await prisma.transaction.count({
        where: {
          status: "SUCCESS",
          isTest: false,
          type: {
            in: [...SERVICE_TYPES],
          },
        },
      });

    const failedTransactions =
      await prisma.transaction.count({
        where: {
          status: "FAILED",
          isTest: false,
          type: {
            in: [...SERVICE_TYPES],
          },
        },
      });

    const pendingTransactions =
      await prisma.transaction.count({
        where: {
          status: "PENDING",
          isTest: false,
          type: {
            in: [...SERVICE_TYPES],
          },
        },
      });

    // ============================================================
    // WALLET FUNDING
    // ============================================================

    const walletFunding =
      await prisma.transaction.aggregate({
        where: {
          type: "FUND_WALLET",
          status: "SUCCESS",
          isTest: false,
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    // ============================================================
    // USER WITHDRAWALS
    // ============================================================

    const userWithdrawals =
      await prisma.withdrawal.aggregate({
        where: {
          status: "PAID",
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    // ============================================================
    // BUSINESS WITHDRAWALS
    //
    // NOTE:
    // BusinessWithdrawal DOES NOT have isTest.
    // So do not use isTest here.
    // ============================================================

    const businessWithdrawals =
      await prisma.businessWithdrawal.aggregate({
        where: {
          status: "SUCCESS",
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    const pendingBusinessWithdrawals =
      await prisma.businessWithdrawal.aggregate({
        where: {
          status: {
            in: [
              "PENDING",
              "PROCESSING",
            ],
          },
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    // ============================================================
    // SERVICE BREAKDOWN
    // ============================================================

    const revenueByType =
      await prisma.transaction.groupBy({
        by: ["type"],

        where: liveServiceWhere,

        _sum: {
          amount: true,
          cost: true,
          profit: true,
        },

        _count: {
          id: true,
        },

        orderBy: {
          _sum: {
            profit: "desc",
          },
        },
      });

    // Add calculated profit so old bad profit values
    // do not affect the dashboard.
    const byType = revenueByType.map(
      (item) => {
        const revenue =
          Number(item._sum.amount ?? 0);

        const cost =
          Number(item._sum.cost ?? 0);

        return {
          type: item.type,
          revenue,
          cost,
          profit: revenue - cost,
          transactions: item._count.id,
        };
      }
    );

    // ============================================================
    // PROVIDER BREAKDOWN
    // ============================================================

    const revenueByProvider =
      await prisma.transaction.groupBy({
        by: ["provider"],

        where: liveServiceWhere,

        _sum: {
          amount: true,
          cost: true,
        },

        _count: {
          id: true,
        },

        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
      });

    const byProvider =
      revenueByProvider.map(
        (item) => {
          const revenue =
            Number(item._sum.amount ?? 0);

          const cost =
            Number(item._sum.cost ?? 0);

          return {
            provider: item.provider,
            revenue,
            cost,
            profit: revenue - cost,
            transactions: item._count.id,
          };
        }
      );

    // ============================================================
    // RECENT LIVE REVENUE
    // ============================================================

    const recentRevenue =
      await prisma.transaction.findMany({
        where: liveServiceWhere,

        orderBy: {
          createdAt: "desc",
        },

        take: 20,

        select: {
          id: true,
          type: true,
          provider: true,
          amount: true,
          cost: true,
          profit: true,
          description: true,
          reference: true,
          createdAt: true,
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

    const formattedRecentRevenue =
      recentRevenue.map(
        (transaction) => ({
          ...transaction,
          profit:
            Number(transaction.amount) -
            Number(transaction.cost),
        })
      );

    // ============================================================
    // RECENT TRANSACTIONS
    // ============================================================

    const recentTransactions =
      await prisma.transaction.findMany({
        orderBy: {
          createdAt: "desc",
        },

        take: 20,

        select: {
          id: true,
          type: true,
          amount: true,
          cost: true,
          profit: true,
          description: true,
          status: true,
          reference: true,
          provider: true,
          isTest: true,
          createdAt: true,

          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

    // ============================================================
    // SYNC BUSINESS WALLET
    // ============================================================

    const withdrawnProfit =
      Number(
        businessWallet.withdrawnProfit ?? 0
      );

    const availableProfit =
      Math.max(
        totalProfit - withdrawnProfit,
        0
      );

    businessWallet =
      await prisma.businessWallet.update({
        where: {
          id: businessWallet.id,
        },

        data: {
          totalRevenue: totalAmount,
          totalCost: totalCost,
          totalProfit: totalProfit,
          availableProfit: availableProfit,
          balance: availableProfit,
        },
      });

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json({
      success: true,

      businessWallet: {
        id: businessWallet.id,
        name: businessWallet.name,

        totalRevenue:
          businessWallet.totalRevenue,

        totalCost:
          businessWallet.totalCost,

        totalProfit:
          businessWallet.totalProfit,

        withdrawnProfit:
          businessWallet.withdrawnProfit,

        availableProfit:
          businessWallet.availableProfit,

        balance:
          businessWallet.balance,

        recipientCode:
          businessWallet.recipientCode,

        createdAt:
          businessWallet.createdAt,

        updatedAt:
          businessWallet.updatedAt,
      },

      revenue: {
        total: totalAmount,
        cost: totalCost,
        profit: totalProfit,
        transactions:
          totalRevenue._count.id ?? 0,

        today: {
          revenue: todayAmount,
          cost: todayCost,
          profit:
            todayAmount - todayCost,
          transactions:
            todayRevenue._count.id ?? 0,
        },

        week: {
          revenue: weekAmount,
          cost: weekCost,
          profit:
            weekAmount - weekCost,
          transactions:
            weekRevenue._count.id ?? 0,
        },

        month: {
          revenue: monthAmount,
          cost: monthCost,
          profit:
            monthAmount - monthCost,
          transactions:
            monthRevenue._count.id ?? 0,
        },
      },

      transactions: {
        successful:
          successfulTransactions,

        failed:
          failedTransactions,

        pending:
          pendingTransactions,
      },

      wallet: {
        funding:
          walletFunding._sum.amount ?? 0,

        fundingCount:
          walletFunding._count.id ?? 0,

        userWithdrawals:
          userWithdrawals._sum.amount ?? 0,

        userWithdrawalCount:
          userWithdrawals._count.id ?? 0,
      },

      businessWithdrawals: {
        total:
          businessWithdrawals._sum.amount ?? 0,

        count:
          businessWithdrawals._count.id ?? 0,

        pending:
          pendingBusinessWithdrawals
            ._sum.amount ?? 0,

        pendingCount:
          pendingBusinessWithdrawals
            ._count.id ?? 0,
      },

      byType,

      byProvider,

      recentRevenue:
        formattedRecentRevenue,

      recentTransactions,
    });
  } catch (error) {
    console.error(
      "ADMIN REVENUE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load revenue data.",
      },
      { status: 500 }
    );
  }
}