import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function generateReference() {
  return `BW-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase()}`;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Get available revenue + withdrawal history
*/

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

    /*
    |--------------------------------------------------------------------------
    | Successful business revenue
    |--------------------------------------------------------------------------
    | isTest: false ensures test transactions never count as real revenue.
    */

    const revenueResult =
      await prisma.transaction.aggregate({
        where: {
          status: {
            equals: "success",
            mode: "insensitive",
          },

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
        },
      });

    const totalRevenue =
      revenueResult._sum.amount ?? 0;

    /*
    |--------------------------------------------------------------------------
    | Business withdrawals
    |--------------------------------------------------------------------------
    */

    const withdrawals =
      await prisma.businessWithdrawal.findMany({
        orderBy: {
          createdAt: "desc",
        },

        take: 50,
      });

    /*
    |--------------------------------------------------------------------------
    | Already withdrawn / reserved money
    |--------------------------------------------------------------------------
    |
    | SUCCESS = already paid out
    | PROCESSING = currently being processed
    | PENDING = requested but not completed
    | APPROVED = approved but not completed
    |
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

    const reservedAmount =
      withdrawalTotals._sum.amount ?? 0;

    const availableRevenue =
      Math.max(
        0,
        totalRevenue - reservedAmount
      );

    return NextResponse.json({
      success: true,

      revenue: {
        totalRevenue,
        reservedAmount,
        availableRevenue,
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
          "Failed to load withdrawal information.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Create a manual or Paystack withdrawal request
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const amount = Number(
      body?.amount
    );

    const method =
      body?.method === "PAYSTACK"
        ? "PAYSTACK"
        : "MANUAL";

    const accountName =
      typeof body?.accountName === "string"
        ? body.accountName.trim()
        : "";

    const accountNumber =
      typeof body?.accountNumber === "string"
        ? body.accountNumber.trim()
        : "";

    const bankName =
      typeof body?.bankName === "string"
        ? body.bankName.trim()
        : "";

    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    /*
    |--------------------------------------------------------------------------
    | Validate amount
    |--------------------------------------------------------------------------
    */

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate bank details
    |--------------------------------------------------------------------------
    */

    if (!accountName) {
      return NextResponse.json(
        {
          error:
            "Account name is required.",
        },
        { status: 400 }
      );
    }

    if (!accountNumber) {
      return NextResponse.json(
        {
          error:
            "Account number is required.",
        },
        { status: 400 }
      );
    }

    if (!bankName) {
      return NextResponse.json(
        {
          error:
            "Bank name is required.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Check available revenue
    |--------------------------------------------------------------------------
    | isTest: false ensures test transactions never count as real revenue.
    */

    const revenueResult =
      await prisma.transaction.aggregate({
        where: {
          status: {
            equals: "success",
            mode: "insensitive",
          },

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
        },
      });

    const totalRevenue =
      revenueResult._sum.amount ?? 0;

    const existingWithdrawals =
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

    const reservedAmount =
      existingWithdrawals._sum.amount ?? 0;

    const availableRevenue =
      Math.max(
        0,
        totalRevenue - reservedAmount
      );

    if (
      amount > availableRevenue
    ) {
      return NextResponse.json(
        {
          error: `Insufficient available revenue. Available: ₦${availableRevenue.toLocaleString(
            "en-NG",
            {
              minimumFractionDigits: 2,
            }
          )}`,
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Paystack
    |--------------------------------------------------------------------------
    |
    | We keep Paystack in the system.
    |
    | Actual transfer will NOT happen yet because
    | your Paystack account currently does not have
    | third-party payout access.
    |
    */

    if (method === "PAYSTACK") {
      return NextResponse.json(
        {
          error:
            "Paystack withdrawals are currently unavailable because your Paystack account does not have third-party payout access yet.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create manual withdrawal
    |--------------------------------------------------------------------------
    */

    const withdrawal =
      await prisma.businessWithdrawal.create({
        data: {
          amount,

          method: "MANUAL",

          accountName,
          accountNumber,
          bankName,

          reference:
            generateReference(),

          status: "PENDING",

          adminNote:
            adminNote || null,
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          "Manual withdrawal request created successfully.",

        withdrawal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "BUSINESS WITHDRAWAL POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create withdrawal request.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
| Approve / Reject / Mark as Paid
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: Request
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const withdrawalId =
      typeof body?.withdrawalId === "string"
        ? body.withdrawalId
        : "";

    const action =
      typeof body?.action === "string"
        ? body.action
        : "";

    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    if (!withdrawalId) {
      return NextResponse.json(
        {
          error:
            "Withdrawal ID is required.",
        },
        { status: 400 }
      );
    }

    const withdrawal =
      await prisma.businessWithdrawal.findUnique(
        {
          where: {
            id: withdrawalId,
          },
        }
      );

    if (!withdrawal) {
      return NextResponse.json(
        {
          error:
            "Withdrawal not found.",
        },
        { status: 404 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | APPROVE
    |--------------------------------------------------------------------------
    */

    if (action === "APPROVE") {
      if (
        withdrawal.status !== "PENDING"
      ) {
        return NextResponse.json(
          {
            error:
              "Only pending withdrawals can be approved.",
          },
          { status: 400 }
        );
      }

      const updated =
        await prisma.businessWithdrawal.update(
          {
            where: {
              id: withdrawalId,
            },

            data: {
              status: "PROCESSING",

              adminNote:
                adminNote ||
                withdrawal.adminNote,

              processedAt:
                new Date(),
            },
          }
        );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal approved and marked as processing.",
        withdrawal: updated,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | REJECT
    |--------------------------------------------------------------------------
    */

    if (action === "REJECT") {
      if (
        withdrawal.status ===
          "SUCCESS" ||
        withdrawal.status ===
          "REVERSED"
      ) {
        return NextResponse.json(
          {
            error:
              "This withdrawal can no longer be rejected.",
          },
          { status: 400 }
        );
      }

      const updated =
        await prisma.businessWithdrawal.update(
          {
            where: {
              id: withdrawalId,
            },

            data: {
              status: "FAILED",

              adminNote:
                adminNote ||
                "Withdrawal rejected by admin.",

              processedAt:
                new Date(),
            },
          }
        );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal rejected successfully.",
        withdrawal: updated,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | MARK AS PAID
    |--------------------------------------------------------------------------
    */

    if (action === "MARK_PAID") {
      if (
        withdrawal.status !==
          "PROCESSING" &&
        withdrawal.status !==
          "PENDING"
      ) {
        return NextResponse.json(
          {
            error:
              "Only pending or processing withdrawals can be marked as paid.",
          },
          { status: 400 }
        );
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const updated =
              await tx.businessWithdrawal.update(
                {
                  where: {
                    id: withdrawalId,
                  },

                  data: {
                    status: "SUCCESS",

                    adminNote:
                      adminNote ||
                      withdrawal.adminNote,

                    processedAt:
                      new Date(),
                  },
                }
              );

            return updated;
          }
        );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal marked as paid successfully.",
        withdrawal: result,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | INVALID ACTION
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        error:
          "Invalid withdrawal action. Use APPROVE, REJECT or MARK_PAID.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "BUSINESS WITHDRAWAL PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update withdrawal.",
      },
      { status: 500 }
    );
  }
}