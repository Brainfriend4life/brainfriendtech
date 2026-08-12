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

    const session =
      await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // GET OR CREATE BUSINESS WALLET
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
    // GET LIVE SERVICE TOTALS
    // ============================================================

    const serviceTotals =
      await prisma.transaction.aggregate({
        where: {
          status: "SUCCESS",
          isTest: false,
          type: {
            in: [...SERVICE_TYPES],
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

    const serviceRevenue = Number(
      serviceTotals._sum.amount ?? 0
    );

    const providerCosts = Number(
      serviceTotals._sum.cost ?? 0
    );

    const grossProfit =
      serviceRevenue - providerCosts;

    // ============================================================
    // BUSINESS WITHDRAWALS
    // ============================================================

    const successfulWithdrawals =
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

    const withdrawnProfit = Number(
      successfulWithdrawals._sum.amount ?? 0
    );

    const availableProfit =
      Math.max(
        grossProfit -
          withdrawnProfit,
        0
      );

    // ============================================================
    // SERVICE BREAKDOWN
    // ============================================================

    const transactions =
      await prisma.transaction.findMany({
        where: {
          status: "SUCCESS",
          isTest: false,
          type: {
            in: [...SERVICE_TYPES],
          },
        },

        select: {
          id: true,
          type: true,
          provider: true,
          amount: true,
          cost: true,
          profit: true,
          reference: true,
          description: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 5000,
      });

    const serviceMap = new Map<
      string,
      {
        transactions: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >();

    for (const type of SERVICE_TYPES) {
      serviceMap.set(type, {
        transactions: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      });
    }

    for (const transaction of transactions) {
      const current =
        serviceMap.get(
          transaction.type
        );

      if (!current) continue;

      const amount = Number(
        transaction.amount ?? 0
      );

      const cost = Number(
        transaction.cost ?? 0
      );

      current.transactions += 1;
      current.revenue += amount;
      current.cost += cost;
      current.profit +=
        amount - cost;
    }

    const byService =
      Array.from(
        serviceMap.entries()
      )
        .map(
          ([type, data]) => ({
            type,

            _count: {
              id: data.transactions,
            },

            _sum: {
              amount: data.revenue,
              cost: data.cost,
              profit: data.profit,
            },

            transactions:
              data.transactions,

            revenue:
              data.revenue,

            cost:
              data.cost,

            profit:
              data.profit,
          })
        )
        .sort(
          (a, b) =>
            b.profit - a.profit
        );

    // ============================================================
    // PROVIDER BREAKDOWN
    // ============================================================

    const providerMap = new Map<
      string,
      {
        transactions: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >();

    for (const transaction of transactions) {
      const provider =
        transaction.provider ||
        "UNKNOWN";

      if (
        !providerMap.has(provider)
      ) {
        providerMap.set(provider, {
          transactions: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        });
      }

      const current =
        providerMap.get(
          provider
        )!;

      const amount = Number(
        transaction.amount ?? 0
      );

      const cost = Number(
        transaction.cost ?? 0
      );

      current.transactions += 1;
      current.revenue += amount;
      current.cost += cost;
      current.profit +=
        amount - cost;
    }

    const byProvider =
      Array.from(
        providerMap.entries()
      )
        .map(
          ([provider, data]) => ({
            provider,

            _count: {
              id: data.transactions,
            },

            _sum: {
              amount: data.revenue,
              cost: data.cost,
              profit: data.profit,
            },

            transactions:
              data.transactions,

            revenue:
              data.revenue,

            cost:
              data.cost,

            profit:
              data.profit,
          })
        )
        .sort(
          (a, b) =>
            b.profit - a.profit
        );

    // ============================================================
    // PROFITABLE TRANSACTIONS
    // ============================================================

    const profitableTransactions =
      transactions
        .filter(
          (transaction) => {
            const amount = Number(
              transaction.amount ?? 0
            );

            const cost = Number(
              transaction.cost ?? 0
            );

            return (
              amount - cost > 0
            );
          }
        )
        .map(
          (transaction) => {
            const amount = Number(
              transaction.amount ?? 0
            );

            const cost = Number(
              transaction.cost ?? 0
            );

            return {
              id: transaction.id,
              type: transaction.type,
              provider:
                transaction.provider ||
                "UNKNOWN",
              amount,
              cost,
              profit:
                amount - cost,
              reference:
                transaction.reference,
              description:
                transaction.description ||
                "",
              createdAt:
                transaction.createdAt,
            };
          }
        );

    // ============================================================
    // RECENT TRANSACTIONS
    // ============================================================

    const recentTransactions =
      transactions
        .slice(0, 20)
        .map(
          (transaction) => {
            const amount = Number(
              transaction.amount ?? 0
            );

            const cost = Number(
              transaction.cost ?? 0
            );

            return {
              id: transaction.id,
              type: transaction.type,
              provider:
                transaction.provider ||
                "UNKNOWN",
              amount,
              cost,
              profit:
                amount - cost,
              reference:
                transaction.reference,
              description:
                transaction.description ||
                "",
              createdAt:
                transaction.createdAt,
            };
          }
        );

    // ============================================================
    // WITHDRAWAL HISTORY
    // ============================================================

    const withdrawalsList =
      await prisma.businessWithdrawal.findMany({
        orderBy: {
          createdAt: "desc",
        },

        take: 20,

        select: {
          id: true,
          amount: true,
          status: true,
          reference: true,
          adminNote: true,
          createdAt: true,
        },
      });

    // ============================================================
    // UPDATE BUSINESS WALLET
    // ============================================================

    businessWallet =
      await prisma.businessWallet.update({
        where: {
          id: businessWallet.id,
        },

        data: {
          totalRevenue:
            serviceRevenue,

          totalCost:
            providerCosts,

          totalProfit:
            grossProfit,

          withdrawnProfit:
            withdrawnProfit,

          availableProfit:
            availableProfit,

          balance:
            availableProfit,
        },
      });

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json({
      success: true,

      wallet: {
        id: businessWallet.id,

        name:
          businessWallet.name,

        serviceRevenue:
          Number(
            businessWallet.totalRevenue
          ),

        providerCosts:
          Number(
            businessWallet.totalCost
          ),

        grossProfit:
          Number(
            businessWallet.totalProfit
          ),

        withdrawnProfit:
          Number(
            businessWallet.withdrawnProfit
          ),

        availableProfit:
          Number(
            businessWallet.availableProfit
          ),

        balance:
          Number(
            businessWallet.balance
          ),

        totalRevenue:
          Number(
            businessWallet.totalRevenue
          ),

        totalCost:
          Number(
            businessWallet.totalCost
          ),

        totalProfit:
          Number(
            businessWallet.totalProfit
          ),

        recipientCode:
          businessWallet.recipientCode,

        createdAt:
          businessWallet.createdAt,

        updatedAt:
          businessWallet.updatedAt,
      },

      summary: {
        realTransactions:
          transactions.length,

        profitableTransactions:
          profitableTransactions.length,

        totalRevenue:
          serviceRevenue,

        totalCost:
          providerCosts,

        totalProfit:
          grossProfit,

        withdrawnProfit,

        availableProfit,
      },

      byService,

      byProvider,

      profitableTransactions,

      recentTransactions,

      withdrawals: {
        total:
          withdrawnProfit,

        count:
          successfulWithdrawals
            ._count.id ?? 0,
      },

      withdrawalsList:
        withdrawalsList.map(
          (withdrawal) => ({
            id: withdrawal.id,

            amount: Number(
              withdrawal.amount
            ),

            status:
              withdrawal.status,

            reference:
              withdrawal.reference,

            description:
              withdrawal.adminNote ||
              "",

            createdAt:
              withdrawal.createdAt,
          })
        ),
    });
  } catch (error) {
    console.error(
      "BUSINESS WALLET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to load Brainfriend Tech revenue wallet.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? String(error)
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}