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
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    /*
     * ============================================================
     * 1. CALCULATE REAL BUSINESS MONEY
     * ============================================================
     *
     * Transaction is the source of truth.
     *
     * We only count:
     * - SUCCESS transactions
     * - non-test transactions
     * - actual business services
     *
     * We exclude:
     * - FUND_WALLET
     * - WITHDRAWAL
     */

    const transactionTotals =
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

    const totalRevenue = Number(
      transactionTotals._sum.amount ?? 0
    );

    const totalCost = Number(
      transactionTotals._sum.cost ?? 0
    );

    const totalProfit = Number(
      transactionTotals._sum.profit ?? 0
    );

    /*
     * ============================================================
     * 2. CALCULATE BUSINESS WITHDRAWALS
     * ============================================================
     *
     * These statuses are considered money reserved/used:
     *
     * PENDING
     * PROCESSING
     * SUCCESS
     *
     * FAILED and REVERSED are returned to available profit.
     */

    const withdrawalTotals =
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

    const reservedWithdrawals = Number(
      withdrawalTotals._sum.amount ?? 0
    );

    /*
     * ============================================================
     * 3. REAL AVAILABLE PROFIT
     * ============================================================
     *
     * This is the amount that can actually be withdrawn.
     */

    const availableProfit = Math.max(
      0,
      totalProfit - reservedWithdrawals
    );

    /*
     * ============================================================
     * 4. FIND BRAINFRIEND GLOBAL TECH WALLET
     * ============================================================
     */

    const wallet =
      await prisma.businessWallet.findUnique({
        where: {
          name: "Brainfriend Global Tech",
        },
      });

    /*
     * ============================================================
     * 5. SYNCHRONIZE WALLET
     * ============================================================
     *
     * The BusinessWallet values are kept synchronized with the
     * actual transaction records.
     *
     * Transaction data remains the source of truth.
     */

    if (wallet) {
      await prisma.businessWallet.update({
        where: {
          id: wallet.id,
        },

        data: {
          totalRevenue,
          totalCost,
          totalProfit,

          withdrawnProfit:
            reservedWithdrawals,

          availableProfit,

          balance: availableProfit,
        },
      });
    }

    /*
     * ============================================================
     * 6. WITHDRAWAL HISTORY
     * ============================================================
     *
     * BusinessWithdrawal does NOT have "description".
     * Therefore we use adminNote.
     */

    const withdrawalsList =
      await prisma.businessWithdrawal.findMany({
        orderBy: {
          createdAt: "desc",
        },

        take: 100,

        select: {
          id: true,
          amount: true,
          status: true,
          reference: true,
          adminNote: true,
          processedAt: true,
          createdAt: true,
          updatedAt: true,
          method: true,
          accountName: true,
          accountNumber: true,
          bankName: true,
          recipientCode: true,
          transferCode: true,
          paystackReference: true,
        },
      });

    /*
     * ============================================================
     * 7. RETURN DATA
     * ============================================================
     */

    return NextResponse.json({
      success: true,

      wallet: {
        id: wallet?.id ?? null,

        name:
          wallet?.name ??
          "Brainfriend Global Tech",

        totalRevenue,

        totalCost,

        totalProfit,

        withdrawnProfit:
          reservedWithdrawals,

        availableProfit,

        /*
         * Balance represents the same real amount available
         * for withdrawal.
         */
        balance: availableProfit,

        recipientCode:
          wallet?.recipientCode ?? null,
      },

      withdrawals: {
        total: reservedWithdrawals,

        count:
          withdrawalsList.length,
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
              withdrawal.adminNote,

            adminNote:
              withdrawal.adminNote,

            processedAt:
              withdrawal.processedAt,

            createdAt:
              withdrawal.createdAt,

            updatedAt:
              withdrawal.updatedAt,

            method:
              withdrawal.method,

            accountName:
              withdrawal.accountName,

            accountNumber:
              withdrawal.accountNumber,

            bankName:
              withdrawal.bankName,

            recipientCode:
              withdrawal.recipientCode,

            transferCode:
              withdrawal.transferCode,

            paystackReference:
              withdrawal.paystackReference,
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
          "Unable to load business wallet.",
      },
      { status: 500 }
    );
  }
}