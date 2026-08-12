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
    // BASE LIVE SERVICE FILTER
    // ============================================================

    const liveServiceWhere = {
      status: "SUCCESS",
      isTest: false,
      type: {
        in: [...SERVICE_TYPES],
      },
    };

    // ============================================================
    // TOTAL REVENUE
    // ============================================================

    const totalRevenue =
      await prisma.transaction.aggregate({
        where: liveServiceWhere,
        _sum: {
          amount: true,
          cost: true,
        },
        _count: {
          id: true,
        },
      });

    const totalAmount = Number(
      totalRevenue._sum.amount ?? 0
    );

    const totalCost = Number(
      totalRevenue._sum.cost ?? 0
    );

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

    const todayAmount = Number(
      todayRevenue._sum.amount ?? 0
    );

    const todayCost = Number(
      todayRevenue._sum.cost ?? 0
    );

    // ============================================================
    // WEEK
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

    const weekAmount = Number(
      weekRevenue._sum.amount ?? 0
    );

    const weekCost = Number(
      weekRevenue._sum.cost ?? 0
    );

    // ============================================================
    // MONTH
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

    const monthAmount = Number(
      monthRevenue._sum.amount ?? 0
    );

    const monthCost = Number(
      monthRevenue._sum.cost ?? 0
    );

    // ============================================================
    // TRANSACTION COUNTS
    // ============================================================

    const [
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
    ] = await Promise.all([
      prisma.transaction.count({
        where: {
          status: "SUCCESS",
          isTest: false,
          type: {
            in: [...SERVICE_TYPES],
          },
        },
      }),

      prisma.transaction.count({
        where: {
          status: "FAILED",
          isTest: false,
          type: {
            in: [...SERVICE_TYPES],
          },
        },
      }),

      prisma.transaction.count({
        where: {
          status: "PENDING",
          isTest: false,
          type: {
            in: [...SERVICE_TYPES],
          },
        },
      }),
    ]);

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
    // SERVICE BREAKDOWN
    // ============================================================

    const revenueByType =
      await prisma.transaction.groupBy({
        by: ["type"],
        where: liveServiceWhere,
        _sum: {
          amount: true,
          cost: true,
        },
        _count: {
          id: true,
        },
      });

    const byType = revenueByType
      .map((item) => {
        const revenue = Number(
          item._sum.amount ?? 0
        );

        const cost = Number(
          item._sum.cost ?? 0
        );

        return {
          type: item.type,
          _sum: {
            amount: revenue,
          },
          _count: {
            id: item._count.id,
          },
          revenue,
          cost,
          profit: revenue - cost,
          transactions: item._count.id,
        };
      })
      .sort(
        (a, b) =>
          b.profit - a.profit
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
      });

    const byProvider =
      revenueByProvider
        .map((item) => {
          const revenue = Number(
            item._sum.amount ?? 0
          );

          const cost = Number(
            item._sum.cost ?? 0
          );

          return {
            provider:
              item.provider || "UNKNOWN",
            revenue,
            cost,
            profit: revenue - cost,
            transactions:
              item._count.id,
          };
        })
        .sort(
          (a, b) =>
            b.profit - a.profit
        );

    // ============================================================
    // RECENT TRANSACTIONS
    // ============================================================

    const recentTransactions =
      await prisma.transaction.findMany({
        where: liveServiceWhere,

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
          createdAt: true,

          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

    const formattedRecentTransactions =
      recentTransactions.map(
        (transaction) => ({
          id: transaction.id,
          type: transaction.type,
          amount: Number(
            transaction.amount
          ),
          cost: Number(
            transaction.cost
          ),
          profit:
            Number(transaction.amount) -
            Number(transaction.cost),
          description:
            transaction.description || "",
          status: transaction.status,
          reference:
            transaction.reference,
          provider:
            transaction.provider || "UNKNOWN",
          createdAt:
            transaction.createdAt.toISOString(),

          user: {
            id: transaction.user.id,
            fullName:
              transaction.user.fullName,
            email:
              transaction.user.email,
            phone:
              transaction.user.phone,
          },
        })
      );

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
            totalRevenue: totalAmount,
            totalCost: totalCost,
            totalProfit: totalProfit,
            withdrawnProfit: 0,
            availableProfit:
              Math.max(totalProfit, 0),
            balance:
              Math.max(totalProfit, 0),
          },
        });
    } else {
      const withdrawnProfit = Number(
        businessWallet.withdrawnProfit ?? 0
      );

      const availableProfit =
        Math.max(
          totalProfit -
            withdrawnProfit,
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
            availableProfit:
              availableProfit,
            balance:
              availableProfit,
          },
        });
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json({
      success: true,

      businessWallet: {
        id: businessWallet.id,
        name: businessWallet.name,
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
        balance: Number(
          businessWallet.balance
        ),
        recipientCode:
          businessWallet.recipientCode,
        createdAt:
          businessWallet.createdAt,
        updatedAt:
          businessWallet.updatedAt,
      },

      revenue: {
        total: totalAmount,
        today: todayAmount,
        week: weekAmount,
        month: monthAmount,

        totalTransactions:
          totalRevenue._count.id ?? 0,

        todayTransactions:
          todayRevenue._count.id ?? 0,

        weekTransactions:
          weekRevenue._count.id ?? 0,

        monthTransactions:
          monthRevenue._count.id ?? 0,

        cost: totalCost,

        profit: totalProfit,
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
        funding: Number(
          walletFunding._sum.amount ?? 0
        ),

        fundingCount:
          walletFunding._count.id ?? 0,

        withdrawals: Number(
          userWithdrawals._sum.amount ?? 0
        ),

        withdrawalCount:
          userWithdrawals._count.id ?? 0,
      },

      byType,

      byProvider,

      recentTransactions:
        formattedRecentTransactions,
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
        details:
          process.env.NODE_ENV ===
          "development"
            ? String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}