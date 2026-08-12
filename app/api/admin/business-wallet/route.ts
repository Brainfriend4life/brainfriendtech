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
  console.log("==========================================");
  console.log("BUSINESS WALLET API START");
  console.log("==========================================");

  try {
    // =====================================================
    // 1. ADMIN AUTHENTICATION
    // =====================================================

    console.log("CHECKING ADMIN AUTH...");

    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      console.log("AUTH FAILED");

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    console.log("AUTH CHECK COMPLETE");

    // =====================================================
    // 2. FIND OR CREATE BUSINESS WALLET
    // =====================================================

    console.log("FINDING BUSINESS WALLET...");

    let businessWallet = await prisma.businessWallet.findUnique({
      where: {
        name: "Brainfriend Tech",
      },
    });

    if (!businessWallet) {
      console.log("BUSINESS WALLET NOT FOUND - CREATING...");

      businessWallet = await prisma.businessWallet.create({
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

      console.log(
        "BUSINESS WALLET CREATED:",
        businessWallet.id
      );
    } else {
      console.log(
        "BUSINESS WALLET FOUND:",
        businessWallet.id
      );
    }

    // =====================================================
    // 3. GET SUCCESSFUL SERVICE TRANSACTIONS
    // =====================================================

    console.log("STARTING TRANSACTION QUERY...");

    const transactionStart = Date.now();

    const transactions = await prisma.transaction.findMany({
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

    console.log(
      "TRANSACTION QUERY COMPLETE:",
      transactions.length,
      "transactions"
    );

    console.log(
      "TRANSACTION QUERY TIME:",
      Date.now() - transactionStart,
      "ms"
    );

    // =====================================================
    // 4. CALCULATE FINANCIAL TOTALS
    // =====================================================

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const transaction of transactions) {
      totalRevenue += Number(transaction.amount || 0);
      totalCost += Number(transaction.cost || 0);
      totalProfit += Number(transaction.profit || 0);
    }

    console.log("FINANCIAL TOTALS:", {
      totalRevenue,
      totalCost,
      totalProfit,
    });

    // =====================================================
    // 5. GET SUCCESSFUL WITHDRAWALS
    // =====================================================

    console.log("CHECKING BUSINESS WITHDRAWALS...");

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
      successfulWithdrawals._sum.amount || 0
    );

    console.log(
      "WITHDRAWN PROFIT:",
      withdrawnProfit
    );

    // =====================================================
    // 6. CALCULATE AVAILABLE PROFIT
    // =====================================================

    const availableProfit = Math.max(
      totalProfit - withdrawnProfit,
      0
    );

    console.log(
      "AVAILABLE PROFIT:",
      availableProfit
    );

    // =====================================================
    // 7. SERVICE BREAKDOWN
    // =====================================================

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
      const current = serviceMap.get(transaction.type);

      if (!current) continue;

      current.transactions += 1;
      current.revenue += Number(transaction.amount || 0);
      current.cost += Number(transaction.cost || 0);
      current.profit += Number(transaction.profit || 0);
    }

    const byService = Array.from(serviceMap.entries())
      .map(([type, data]) => ({
        type,

        _count: {
          id: data.transactions,
        },

        _sum: {
          amount: data.revenue,
          cost: data.cost,
          profit: data.profit,
        },

        transactions: data.transactions,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.profit,
      }))
      .sort((a, b) => b.profit - a.profit);

    // =====================================================
    // 8. PROVIDER BREAKDOWN
    // =====================================================

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
        transaction.provider || "UNKNOWN";

      if (!providerMap.has(provider)) {
        providerMap.set(provider, {
          transactions: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        });
      }

      const current = providerMap.get(provider)!;

      current.transactions += 1;
      current.revenue += Number(transaction.amount || 0);
      current.cost += Number(transaction.cost || 0);
      current.profit += Number(transaction.profit || 0);
    }

    const byProvider = Array.from(providerMap.entries())
      .map(([provider, data]) => ({
        provider,

        _count: {
          id: data.transactions,
        },

        _sum: {
          amount: data.revenue,
          cost: data.cost,
          profit: data.profit,
        },

        transactions: data.transactions,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.profit,
      }))
      .sort((a, b) => b.profit - a.profit);

    // =====================================================
    // 9. PROFITABLE TRANSACTIONS
    // =====================================================

    const profitableTransactions = transactions
      .filter(
        (transaction) =>
          Number(transaction.profit || 0) > 0
      )
      .map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        provider: transaction.provider,
        amount: Number(transaction.amount || 0),
        cost: Number(transaction.cost || 0),
        profit: Number(transaction.profit || 0),
        reference: transaction.reference,
        description: transaction.description,
        createdAt: transaction.createdAt,
      }));

    // =====================================================
    // 10. RECENT TRANSACTIONS
    // =====================================================

    const recentTransactions = transactions
      .slice(0, 20)
      .map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        provider: transaction.provider,
        amount: Number(transaction.amount || 0),
        cost: Number(transaction.cost || 0),
        profit: Number(transaction.profit || 0),
        reference: transaction.reference,
        description: transaction.description,
        createdAt: transaction.createdAt,
      }));

    // =====================================================
    // 11. GET WITHDRAWAL HISTORY
    // =====================================================

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

    // =====================================================
    // 12. UPDATE BUSINESS WALLET
    // =====================================================

    businessWallet =
      await prisma.businessWallet.update({
        where: {
          id: businessWallet.id,
        },

        data: {
          totalRevenue,
          totalCost,
          totalProfit,
          withdrawnProfit,
          availableProfit,
          balance: availableProfit,
        },
      });

    // =====================================================
    // 13. FINAL RESPONSE
    // =====================================================

    console.log("BUSINESS WALLET API COMPLETE");

    return NextResponse.json({
      success: true,

      wallet: {
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

      summary: {
        realTransactions:
          transactions.length,

        profitableTransactions:
          profitableTransactions.length,

        totalRevenue,
        totalCost,
        totalProfit,
        withdrawnProfit,
        availableProfit,
      },

      byService,
      byProvider,
      profitableTransactions,
      recentTransactions,

      withdrawals: {
        total: withdrawnProfit,
        count:
          successfulWithdrawals._count.id || 0,
      },

      withdrawalsList,
    });
  } catch (error) {
    console.error(
      "=========================================="
    );

    console.error(
      "BUSINESS WALLET ERROR:",
      error
    );

    console.error(
      "=========================================="
    );
const withdrawalsList =
  await prisma.businessWithdrawal.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    select: {
      id: true,
      amount: true,
      status: true,
      reference: true,
      adminNote: true,
      createdAt: true,
    },
  });
    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to load Brainfriend Tech revenue wallet.",

        error:
          process.env.NODE_ENV === "development"
            ? String(error)
            : undefined,
            withdrawalsList: withdrawalsList.map(
  (withdrawal) => ({
    id: withdrawal.id,
    amount: Number(withdrawal.amount),
    status: withdrawal.status,
    reference: withdrawal.reference,
    description: withdrawal.adminNote,
    createdAt: withdrawal.createdAt,
  })
),
      },
      {
        status: 500,
      }
    );
  }
}