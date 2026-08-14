


import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TransactionType, Prisma } from "@prisma/client";

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

    const serviceTypes: TransactionType[] = [
      TransactionType.AIRTIME,
      TransactionType.DATA,
      TransactionType.ELECTRICITY,
      TransactionType.CABLE,
      TransactionType.EXAM_PIN,
      TransactionType.NIN,
    ];

    const serviceWhere: Prisma.TransactionWhereInput = {
      status: "SUCCESS",
      isTest: false,
      type: {
        in: serviceTypes,
      },
    };

    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? 6 : day - 1;

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
     * TOTAL REVENUE
     */
    const revenue =
      await prisma.transaction.aggregate({
        where: serviceWhere,

        _sum: {
          amount: true,
          cost: true,
          profit: true,
        },
      });

    /*
     * TODAY
     */
    const todayWhere: Prisma.TransactionWhereInput = {
      ...serviceWhere,
      createdAt: {
        gte: startOfToday,
      },
    };

    const todayRevenue =
      await prisma.transaction.aggregate({
        where: todayWhere,

        _sum: {
          amount: true,
        },
      });

    /*
     * THIS WEEK
     */
    const weekWhere: Prisma.TransactionWhereInput = {
      ...serviceWhere,
      createdAt: {
        gte: startOfWeek,
      },
    };

    const weekRevenue =
      await prisma.transaction.aggregate({
        where: weekWhere,

        _sum: {
          amount: true,
        },
      });

    /*
     * THIS MONTH
     */
    const monthWhere: Prisma.TransactionWhereInput = {
      ...serviceWhere,
      createdAt: {
        gte: startOfMonth,
      },
    };

    const monthRevenue =
      await prisma.transaction.aggregate({
        where: monthWhere,

        _sum: {
          amount: true,
        },
      });

    /*
     * TRANSACTION COUNTS
     */
    const [
      totalTransactions,
      todayTransactions,
      weekTransactions,
      monthTransactions,
    ] = await Promise.all([
      prisma.transaction.count({
        where: serviceWhere,
      }),

      prisma.transaction.count({
        where: todayWhere,
      }),

      prisma.transaction.count({
        where: weekWhere,
      }),

      prisma.transaction.count({
        where: monthWhere,
      }),
    ]);

    /*
     * SUCCESSFUL / FAILED / PENDING
     */
    const [
      successful,
      failed,
      pending,
    ] = await Promise.all([
      prisma.transaction.count({
        where: {
          type: {
            in: serviceTypes,
          },
          isTest: false,
          status: "SUCCESS",
        },
      }),

      prisma.transaction.count({
        where: {
          type: {
            in: serviceTypes,
          },
          isTest: false,
          status: "FAILED",
        },
      }),

      prisma.transaction.count({
        where: {
          type: {
            in: serviceTypes,
          },
          isTest: false,
          status: "PENDING",
        },
      }),
    ]);

    /*
     * WALLET FUNDING
     */
    const funding =
      await prisma.transaction.aggregate({
        where: {
          type: TransactionType.FUND_WALLET,
          isTest: false,
          status: "SUCCESS",
        },

        _sum: {
          amount: true,
        },
      });

    const fundingCount =
      await prisma.transaction.count({
        where: {
          type: TransactionType.FUND_WALLET,
          isTest: false,
          status: "SUCCESS",
        },
      });

    /*
     * WITHDRAWALS
     */
    const withdrawals =
      await prisma.transaction.aggregate({
        where: {
          type: TransactionType.WITHDRAWAL,
          isTest: false,
          status: "SUCCESS",
        },

        _sum: {
          amount: true,
        },
      });

    const withdrawalCount =
      await prisma.transaction.count({
        where: {
          type: TransactionType.WITHDRAWAL,
          isTest: false,
          status: "SUCCESS",
        },
      });

    /*
     * REVENUE BY SERVICE
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
      });

    /*
     * COUNT EACH SERVICE TYPE
     */
    const serviceCounts =
      await Promise.all(
        revenueByService.map(async (item) => {
          const count =
            await prisma.transaction.count({
              where: {
                ...serviceWhere,
                type: item.type,
              },
            });

          return {
            type: item.type,
            count,
          };
        })
      );

    const serviceCountMap =
      new Map(
        serviceCounts.map((item) => [
          item.type,
          item.count,
        ])
      );

    /*
     * RECENT TRANSACTIONS
     *
     * We intentionally use userId here instead of
     * transaction.user because the currently generated
     * Prisma client does not expose the user relation
     * on this model.
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
          userId: true,
          type: true,
          amount: true,
          cost: true,
          profit: true,
          description: true,
          status: true,
          reference: true,
          createdAt: true,
          provider: true,
        },
      });

    /*
     * GET USERS FOR RECENT TRANSACTIONS
     */
    const userIds = Array.from(
      new Set(
        recentTransactions.map(
          (transaction) =>
            transaction.userId
        )
      )
    );

    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: {
                in: userIds,
              },
            },

            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          })
        : [];

    const userMap = new Map(
      users.map((user) => [
        user.id,
        user,
      ])
    );

    /*
     * RESPONSE
     */
    return NextResponse.json({
      success: true,

      revenue: {
        total: Number(
          revenue._sum?.amount ?? 0
        ),

        today: Number(
          todayRevenue._sum?.amount ?? 0
        ),

        week: Number(
          weekRevenue._sum?.amount ?? 0
        ),

        month: Number(
          monthRevenue._sum?.amount ?? 0
        ),

        totalTransactions,

        todayTransactions,

        weekTransactions,

        monthTransactions,
      },

      transactions: {
        successful,
        failed,
        pending,
      },

      wallet: {
        funding: Number(
          funding._sum?.amount ?? 0
        ),

        fundingCount,

        withdrawals: Number(
          withdrawals._sum?.amount ?? 0
        ),

        withdrawalCount,
      },

      byType: revenueByService.map(
        (item) => ({
          type: item.type,

          _sum: {
            amount: Number(
              item._sum?.amount ?? 0
            ),

            cost: Number(
              item._sum?.cost ?? 0
            ),

            profit: Number(
              item._sum?.profit ?? 0
            ),
          },

          _count:
            serviceCountMap.get(
              item.type
            ) ?? 0,
        })
      ),

      recentTransactions:
        recentTransactions.map(
          (transaction) => ({
            id: transaction.id,

            userId:
              transaction.userId,

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

            status:
              transaction.status,

            reference:
              transaction.reference,

            createdAt:
              transaction.createdAt.toISOString(),

            provider:
              transaction.provider,

            user:
              userMap.get(
                transaction.userId
              ) ?? null,
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

