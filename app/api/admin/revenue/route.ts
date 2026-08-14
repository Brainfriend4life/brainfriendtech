import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(
      authOptions
    );

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

    const serviceTypes = [
      "AIRTIME",
      "DATA",
      "ELECTRICITY",
      "CABLE",
      "EXAM_PIN",
      "NIN",
    ] as const;

    const serviceWhere = {
      status: "SUCCESS",
      isTest: false,
      type: {
        in: serviceTypes,
      },
    };

    /*
     * DATE RANGES
     */

    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();

    const diff =
      day === 0 ? 6 : day - 1;

    startOfWeek.setDate(
      startOfWeek.getDate() - diff
    );
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    /*
     * MAIN REVENUE
     */

    const revenue = await prisma.transaction.aggregate(
      {
        where: serviceWhere,

        _sum: {
          amount: true,
          cost: true,
          profit: true,
        },

        _count: {
          id: true,
        },
      }
    );

    /*
     * TODAY
     */

    const todayRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...serviceWhere,
          createdAt: {
            gte: startOfToday,
          },
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    /*
     * WEEK
     */

    const weekRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...serviceWhere,
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

    /*
     * MONTH
     */

    const monthRevenue =
      await prisma.transaction.aggregate({
        where: {
          ...serviceWhere,
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

    /*
     * TRANSACTION STATUS
     */

    const successful =
      await prisma.transaction.count({
        where: {
          type: {
            in: serviceTypes,
          },
          isTest: false,
          status: "SUCCESS",
        },
      });

    const failed =
      await prisma.transaction.count({
        where: {
          type: {
            in: serviceTypes,
          },
          isTest: false,
          status: "FAILED",
        },
      });

    const pending =
      await prisma.transaction.count({
        where: {
          type: {
            in: serviceTypes,
          },
          isTest: false,
          status: "PENDING",
        },
      });

    /*
     * WALLET FUNDING
     */

    const funding =
      await prisma.transaction.aggregate({
        where: {
          type: "FUND_WALLET",
          isTest: false,
          status: "SUCCESS",
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    /*
     * USER WITHDRAWALS
     */

    const withdrawals =
      await prisma.transaction.aggregate({
        where: {
          type: "WITHDRAWAL",
          isTest: false,
          status: "SUCCESS",
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    /*
     * SERVICE BREAKDOWN
     */

    const revenueByService =
      await prisma.transaction.groupBy({
        by: ["type"],

        where: serviceWhere,

        _sum: {
          amount: true,
          cost: true,
          profit: true,
        },

        _count: {
          id: true,
        },
      });

    /*
     * RECENT TRANSACTIONS
     */

    const recentTransactions =
      await prisma.transaction.findMany({
        where: serviceWhere,

        orderBy: {
          createdAt: "desc",
        },

        take: 50,

        select: {
          id: true,
          type: true,
          amount: true,
          cost: true,
          profit: true,
          description: true,
          status: true,
          reference: true,
          createdAt: true,
          provider: true,

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

    /*
     * RETURN THE EXACT STRUCTURE
     * EXPECTED BY THE ADMIN REVENUE PAGE
     */

    return NextResponse.json({
      success: true,

      revenue: {
        total: Number(
          revenue._sum.amount ?? 0
        ),

        today: Number(
          todayRevenue._sum.amount ?? 0
        ),

        week: Number(
          weekRevenue._sum.amount ?? 0
        ),

        month: Number(
          monthRevenue._sum.amount ?? 0
        ),

        totalTransactions:
          revenue._count.id,

        todayTransactions:
          todayRevenue._count.id,

        weekTransactions:
          weekRevenue._count.id,

        monthTransactions:
          monthRevenue._count.id,
      },

      transactions: {
        successful,
        failed,
        pending,
      },

      wallet: {
        funding: Number(
          funding._sum.amount ?? 0
        ),

        fundingCount:
          funding._count.id,

        withdrawals: Number(
          withdrawals._sum.amount ?? 0
        ),

        withdrawalCount:
          withdrawals._count.id,
      },

      byType: revenueByService.map(
        (item) => ({
          type: item.type,

          _sum: {
            amount: Number(
              item._sum.amount ?? 0
            ),

            cost: Number(
              item._sum.cost ?? 0
            ),

            profit: Number(
              item._sum.profit ?? 0
            ),
          },

          _count: {
            id: item._count.id,
          },
        })
      ),

      recentTransactions:
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

            profit: Number(
              transaction.profit
            ),

            description:
              transaction.description,

            status: transaction.status,

            reference:
              transaction.reference,

            createdAt:
              transaction.createdAt.toISOString(),

            provider:
              transaction.provider,

            user: transaction.user,
          })
        ),
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
          "Unable to load business revenue.",
      },
      { status: 500 }
    );
  }
}