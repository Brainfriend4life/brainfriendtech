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
     * REAL BUSINESS MONEY
     * ============================================================
     *
     * We calculate the business profit directly from successful,
     * non-test transactions.
     *
     * FUND_WALLET is user's money, not business profit.
     * WITHDRAWAL is user's withdrawal, not business profit.
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
     * BUSINESS WITHDRAWALS
     * ============================================================
     *
     * Pending, processing and successful withdrawals are already
     * reserved from the available business profit.
     *
     * Failed and reversed withdrawals are NOT deducted.
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

    const withdrawnAmount = Number(
      withdrawalTotals._sum.amount ?? 0
    );

    /*
     * ============================================================
     * AVAILABLE PROFIT
     * ============================================================
     */
    const availableProfit = Math.max(
      0,
      totalProfit - withdrawnAmount
    );

    /*
     * ============================================================
     * BUSINESS WALLET
     * ============================================================
     *
     * We still read the wallet for the connected Paystack
     * recipient code, but the money displayed is calculated
     * from the real transaction records above.
     */
    const wallet =
      await prisma.businessWallet.findUnique({
        where: {
          name: "Brainfriend Global Tech",
        },
      });

    /*
     * ============================================================
     * WITHDRAWAL HISTORY
     * ============================================================
     *
     * Your BusinessWithdrawal model does NOT have description.
     * We return adminNote instead.
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
          createdAt: true,
          updatedAt: true,
          processedAt: true,
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
     * RETURN
     * ============================================================
     */
    return NextResponse.json({
      success: true,

      wallet: {
        id: wallet?.id ?? null,

        name:
          wallet?.name ||
          "Brainfriend Global Tech",

        /*
         * This is the REAL amount currently available
         * for business withdrawal.
         */
        balance: availableProfit,

        totalRevenue,

        totalCost,

        totalProfit,

        withdrawnProfit:
          withdrawnAmount,

        availableProfit,

        recipientCode:
          wallet?.recipientCode ?? null,
      },

      withdrawals: {
        total: withdrawnAmount,

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

            /*
             * Your schema has adminNote,
             * not description.
             */
            description:
              withdrawal.adminNote,

            createdAt:
              withdrawal.createdAt,

            updatedAt:
              withdrawal.updatedAt,

            processedAt:
              withdrawal.processedAt,

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