
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateReference() {
  return `BIZ-WD-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

// =========================================================
// GET BUSINESS BALANCE + WITHDRAWAL HISTORY
// =========================================================

export async function GET() {
  try {
    // -------------------------------------------------------
    // ADMIN AUTHENTICATION
    // -------------------------------------------------------

    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 403,
        }
      );
    }

    // -------------------------------------------------------
    // CALCULATE TOTAL PROFIT
    // -------------------------------------------------------

    const profitResult =
      await prisma.transaction.aggregate({
        _sum: {
          profit: true,
        },
        where: {
          status: "success",
        },
      });

    const totalProfit =
      profitResult._sum.profit ?? 0;

    // -------------------------------------------------------
    // CALCULATE BUSINESS MONEY ALREADY WITHDRAWN
    // -------------------------------------------------------

    const withdrawnResult =
      await prisma.businessWithdrawal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: {
            in: [
              "PROCESSING",
              "SUCCESS",
            ],
          },
        },
      });

    const totalWithdrawn =
      withdrawnResult._sum.amount ?? 0;

    // -------------------------------------------------------
    // CALCULATE PENDING REQUESTS
    // -------------------------------------------------------

    const pendingResult =
      await prisma.businessWithdrawal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PENDING",
        },
      });

    const pendingWithdrawals =
      pendingResult._sum.amount ?? 0;

    // -------------------------------------------------------
    // AVAILABLE BUSINESS BALANCE
    // -------------------------------------------------------

    const availableBalance =
      Math.max(
        totalProfit -
          totalWithdrawn -
          pendingWithdrawals,
        0
      );

    // -------------------------------------------------------
    // RECENT WITHDRAWALS
    // -------------------------------------------------------

    const withdrawals =
      await prisma.businessWithdrawal.findMany({
        take: 20,
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,

      balance: {
        totalProfit,
        totalWithdrawn,
        pendingWithdrawals,
        availableBalance,
      },

      withdrawals,
    });
  } catch (error) {
    console.error(
      "BUSINESS WITHDRAWAL GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load business withdrawal information.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// CREATE BUSINESS WITHDRAWAL REQUEST
// =========================================================

export async function POST(
  request: Request
) {
  try {
    // -------------------------------------------------------
    // ADMIN AUTHENTICATION
    // -------------------------------------------------------

    const session = await getServerSession(
      authOptions
    );

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 403,
        }
      );
    }

    // -------------------------------------------------------
    // READ BODY
    // -------------------------------------------------------

    let body: {
      amount?: number;
      accountName?: string;
      accountNumber?: string;
      bankName?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const amount = Number(
      body?.amount
    );

    const accountName =
      typeof body?.accountName ===
      "string"
        ? body.accountName.trim()
        : "";

    const accountNumber =
      typeof body?.accountNumber ===
      "string"
        ? body.accountNumber.trim()
        : "";

    const bankName =
      typeof body?.bankName ===
      "string"
        ? body.bankName.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid withdrawal amount.",
        },
        {
          status: 400,
        }
      );
    }

    if (!accountName) {
      return NextResponse.json(
        {
          error:
            "Account name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!accountNumber) {
      return NextResponse.json(
        {
          error:
            "Account number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!bankName) {
      return NextResponse.json(
        {
          error:
            "Bank name is required.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // CALCULATE TOTAL PROFIT
    // -------------------------------------------------------

    const profitResult =
      await prisma.transaction.aggregate({
        _sum: {
          profit: true,
        },
        where: {
          status: "success",
        },
      });

    const totalProfit =
      profitResult._sum.profit ?? 0;

    // -------------------------------------------------------
    // CALCULATE MONEY ALREADY WITHDRAWN
    // -------------------------------------------------------

    const withdrawnResult =
      await prisma.businessWithdrawal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: {
            in: [
              "PROCESSING",
              "SUCCESS",
            ],
          },
        },
      });

    const totalWithdrawn =
      withdrawnResult._sum.amount ?? 0;

    // -------------------------------------------------------
    // CALCULATE PENDING WITHDRAWALS
    // -------------------------------------------------------

    const pendingResult =
      await prisma.businessWithdrawal.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PENDING",
        },
      });

    const pendingWithdrawals =
      pendingResult._sum.amount ?? 0;

    // -------------------------------------------------------
    // AVAILABLE BALANCE
    // -------------------------------------------------------

    const availableBalance =
      Math.max(
        totalProfit -
          totalWithdrawn -
          pendingWithdrawals,
        0
      );

    // -------------------------------------------------------
    // CHECK BALANCE
    // -------------------------------------------------------

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error:
            "Insufficient available business balance.",
          availableBalance,
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // CREATE WITHDRAWAL REQUEST
    // -------------------------------------------------------

    const withdrawal =
      await prisma.businessWithdrawal.create({
        data: {
          amount,

          accountName,

          accountNumber,

          bankName,

          reference:
            generateReference(),

          status: "PENDING",
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          "Business withdrawal request created successfully.",

        withdrawal,

        availableBalance:
          availableBalance - amount,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "BUSINESS WITHDRAWAL POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create business withdrawal request.",
      },
      {
        status: 500,
      }
    );
  }
}

