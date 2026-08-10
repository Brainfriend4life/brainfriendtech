import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const now = new Date();

    // Start of today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Start of this month
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    // Start of this week
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();

    const difference =
      day === 0 ? 6 : day - 1;

    startOfWeek.setDate(
      startOfWeek.getDate() - difference
    );

    startOfWeek.setHours(0, 0, 0, 0);

    /*
     * Revenue excludes:
     * FUND_WALLET
     * WITHDRAWAL
     *
     * Only successful transactions
     * count as revenue.
     */
    const revenueWhere = {
      status: {
        equals: "success",
        mode: "insensitive" as const,
      },
      type: {
        notIn: [
          "FUND_WALLET" as const,
          "WITHDRAWAL" as const,
        ],
      },
    };

    // All successful revenue
    const totalRevenue =
      await prisma.transaction.aggregate({
        where: revenueWhere,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

    // Today's revenue
    const todayRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...revenueWhere,
          createdAt: {
            gte: startOfDay,
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

    // This week's revenue
    const weekRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...revenueWhere,
          createdAt: {
            gte: startOfWeek,
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

    // This month's revenue
    const monthRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...revenueWhere,
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

    // Successful transactions
    const successful =
      await prisma.transaction.count({
        where: {
          status: {
            equals: "success",
            mode: "insensitive",
          },
        },
      });

    // Failed transactions
    const failed =
      await prisma.transaction.count({
        where: {
          status: {
            equals: "failed",
            mode: "insensitive",
          },
        },
      });

    // Pending transactions
    const pending =
      await prisma.transaction.count({
        where: {
          status: {
            equals: "pending",
            mode: "insensitive",
          },
        },
      });

    // Wallet funding
    const walletFunding =
      await prisma.transaction.aggregate({
        where: {
          type: "FUND_WALLET",
          status: {
            equals: "success",
            mode: "insensitive",
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

    // Withdrawals
    const withdrawals =
      await prisma.transaction.aggregate({
        where: {
          type: "WITHDRAWAL",
          status: {
            equals: "success",
            mode: "insensitive",
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

    // Revenue by transaction type
    const typeGroups =
      await prisma.transaction.groupBy({
        by: ["type"],
        where: revenueWhere,
        _sum: {
          amount: true,
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

    // Recent transactions
    const recentTransactions =
      await prisma.transaction.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      revenue: {
        total:
          totalRevenue._sum.amount || 0,

        today:
          todayRevenue._sum.amount || 0,

        week:
          weekRevenue._sum.amount || 0,

        month:
          monthRevenue._sum.amount || 0,

        totalTransactions:
          totalRevenue._count.id || 0,

        todayTransactions:
          todayRevenue._count.id || 0,

        weekTransactions:
          weekRevenue._count.id || 0,

        monthTransactions:
          monthRevenue._count.id || 0,
      },

      transactions: {
        successful,
        failed,
        pending,
      },

      wallet: {
        funding:
          walletFunding._sum.amount || 0,

        fundingCount:
          walletFunding._count.id || 0,

        withdrawals:
          withdrawals._sum.amount || 0,

        withdrawalCount:
          withdrawals._count.id || 0,
      },

      byType: typeGroups,

      recentTransactions,
    });
  } catch (error) {
    console.error(
      "ADMIN REVENUE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load revenue data.",
      },
      { status: 500 }
    );
  }
}