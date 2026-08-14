import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const PAYSTACK_URL =
  "https://api.paystack.co";

function generateReference() {
  return `BW-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase()}`;
}

async function paystackRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const secretKey =
    process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured."
    );
  }

  return fetch(
    `${PAYSTACK_URL}${endpoint}`,
    {
      ...options,

      headers: {
        Authorization:
          `Bearer ${secretKey}`,

        "Content-Type":
          "application/json",

        Accept:
          "application/json",

        ...(options.headers || {}),
      },

      cache: "no-store",
    }
  );
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Load business withdrawals.
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const session =
      await getServerSession(
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

    const withdrawals =
      await prisma.businessWithdrawal.findMany({
        orderBy: {
          createdAt: "desc",
        },

        take: 100,
      });

    return NextResponse.json({
      success: true,
      withdrawals,
    });
  } catch (error) {
    console.error(
      "BUSINESS WITHDRAWALS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load business withdrawals.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Create withdrawal.
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request
) {
  try {
    const session =
      await getServerSession(
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

    const body =
      await request.json();

    const amount =
      Number(body?.amount);

    const method =
      body?.method === "PAYSTACK"
        ? "PAYSTACK"
        : "MANUAL";

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
      typeof body?.bankName === "string"
        ? body.bankName.trim()
        : "";

    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    if (!accountName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Account name is required.",
        },
        { status: 400 }
      );
    }

    if (!accountNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Account number is required.",
        },
        { status: 400 }
      );
    }

    if (!bankName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bank name is required.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate real available business balance
    |--------------------------------------------------------------------------
    */

    const revenue =
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
        },
      });

    const totalRevenue =
      Number(
        revenue._sum.amount ?? 0
      );

    const withdrawals =
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
      Number(
        withdrawals._sum.amount ?? 0
      );

    const availableRevenue =
      Math.max(
        0,
        totalRevenue -
          reservedAmount
      );

    if (
      amount > availableRevenue
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `Insufficient business balance. Available: ₦${availableRevenue.toLocaleString(
              "en-NG"
            )}`,
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Manual withdrawal
    |--------------------------------------------------------------------------
    */

    if (method === "MANUAL") {
      const withdrawal =
        await prisma.businessWithdrawal.create(
          {
            data: {
              amount,

              method:
                "MANUAL",

              accountName,
              accountNumber,
              bankName,

              reference:
                generateReference(),

              status:
                "PENDING",

              adminNote:
                adminNote || null,
            },
          }
        );

      return NextResponse.json(
        {
          success: true,

          message:
            "Manual withdrawal request created.",

          withdrawal,
        },
        { status: 201 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PAYSTACK
    |--------------------------------------------------------------------------
    */

    const paystackKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paystack secret key is not configured.",
        },
        { status: 500 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create Paystack recipient
    |--------------------------------------------------------------------------
    */

    const recipientResponse =
      await paystackRequest(
        "/transferrecipient",
        {
          method: "POST",

          body: JSON.stringify({
            type: "nuban",

            name:
              accountName,

            account_number:
              accountNumber,

            bank_code:
              body?.bankCode ||
              undefined,

            currency:
              "NGN",
          }),
        }
      );

    const recipientData =
      await recipientResponse.json();

    if (
      !recipientResponse.ok ||
      !recipientData?.status ||
      !recipientData?.data?.recipient_code
    ) {
      console.error(
        "PAYSTACK RECIPIENT ERROR:",
        recipientData
      );

      return NextResponse.json(
        {
          success: false,

          error:
            recipientData?.message ||
            "Unable to create Paystack transfer recipient.",

          paystackResponse:
            recipientData,
        },
        { status: 400 }
      );
    }

    const recipientCode =
      recipientData.data
        .recipient_code;

    /*
    |--------------------------------------------------------------------------
    | Create withdrawal record first
    |--------------------------------------------------------------------------
    */

    const reference =
      generateReference();

    const withdrawal =
      await prisma.businessWithdrawal.create(
        {
          data: {
            amount,

            method:
              "PAYSTACK",

            accountName,
            accountNumber,
            bankName,

            recipientCode,

            reference,

            status:
              "PROCESSING",

            adminNote:
              adminNote || null,

            processedAt:
              new Date(),
          },
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Initiate Paystack transfer
    |--------------------------------------------------------------------------
    */

    try {
      const transferResponse =
        await paystackRequest(
          "/transfer",
          {
            method: "POST",

            body: JSON.stringify({
              source:
                "balance",

              amount:
                Math.round(
                  amount * 100
                ),

              recipient:
                recipientCode,

              reason:
                adminNote ||
                "Brainfriend Tech business withdrawal",

              reference,
            }),
          }
        );

      const transferData =
        await transferResponse.json();

      if (
        !transferResponse.ok ||
        !transferData?.status
      ) {
        await prisma.businessWithdrawal.update(
          {
            where: {
              id:
                withdrawal.id,
            },

            data: {
              status:
                "FAILED",

              adminNote:
                transferData?.message ||
                "Paystack transfer failed.",
            },
          }
        );

        return NextResponse.json(
          {
            success: false,

            error:
              transferData?.message ||
              "Paystack transfer failed.",

            withdrawal:
              await prisma.businessWithdrawal.findUnique(
                {
                  where: {
                    id:
                      withdrawal.id,
                  },
                }
              ),

            paystackResponse:
              transferData,
          },
          { status: 400 }
        );
      }

      const transferCode =
        transferData?.data
          ?.transfer_code ||
        null;

      const paystackReference =
        transferData?.data
          ?.reference ||
        reference;

      const updated =
        await prisma.businessWithdrawal.update(
          {
            where: {
              id:
                withdrawal.id,
            },

            data: {
              transferCode,

              paystackReference,

              status:
                transferData?.data
                  ?.status ===
                "success"
                  ? "SUCCESS"
                  : "PROCESSING",

              processedAt:
                new Date(),
            },
          }
        );

      /*
      |--------------------------------------------------------------------------
      | Update business wallet
      |--------------------------------------------------------------------------
      */

      await updateBusinessWallet();

      return NextResponse.json({
        success: true,

        message:
          updated.status ===
          "SUCCESS"
            ? "Paystack withdrawal completed successfully."
            : "Paystack transfer initiated successfully.",

        withdrawal:
          updated,

        paystack:
          transferData,
      });
    } catch (transferError: any) {
      await prisma.businessWithdrawal.update(
        {
          where: {
            id:
              withdrawal.id,
          },

          data: {
            status:
              "FAILED",

            adminNote:
              transferError?.message ||
              "Paystack transfer failed.",
          },
        }
      );

      throw transferError;
    }
  } catch (error: any) {
    console.error(
      "BUSINESS WITHDRAWAL POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Failed to process business withdrawal.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
| Approve / reject / mark paid / reverse.
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: Request
) {
  try {
    const session =
      await getServerSession(
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

    const body =
      await request.json();

    const withdrawalId =
      typeof body?.withdrawalId ===
      "string"
        ? body.withdrawalId
        : "";

    const action =
      typeof body?.action === "string"
        ? body.action
        : "";

    const adminNote =
      typeof body?.adminNote ===
      "string"
        ? body.adminNote.trim()
        : "";

    if (!withdrawalId) {
      return NextResponse.json(
        {
          success: false,
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
          success: false,
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
        withdrawal.status !==
        "PENDING"
      ) {
        return NextResponse.json(
          {
            success: false,
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
              id:
                withdrawalId,
            },

            data: {
              status:
                "PROCESSING",

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
          "Withdrawal approved.",

        withdrawal:
          updated,
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
            success: false,
            error:
              "This withdrawal cannot be rejected.",
          },
          { status: 400 }
        );
      }

      const updated =
        await prisma.businessWithdrawal.update(
          {
            where: {
              id:
                withdrawalId,
            },

            data: {
              status:
                "FAILED",

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
          "Withdrawal rejected.",

        withdrawal:
          updated,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | MARK PAID
    |--------------------------------------------------------------------------
    */

    if (
      action ===
      "MARK_PAID"
    ) {
      if (
        withdrawal.status !==
          "PROCESSING" &&
        withdrawal.status !==
          "PENDING"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only pending or processing withdrawals can be marked as paid.",
          },
          { status: 400 }
        );
      }

      const updated =
        await prisma.businessWithdrawal.update(
          {
            where: {
              id:
                withdrawalId,
            },

            data: {
              status:
                "SUCCESS",

              adminNote:
                adminNote ||
                withdrawal.adminNote,

              processedAt:
                new Date(),
            },
          }
        );

      await updateBusinessWallet();

      return NextResponse.json({
        success: true,

        message:
          "Withdrawal marked as paid.",

        withdrawal:
          updated,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | INVALID ACTION
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: false,

        error:
          "Invalid action. Use APPROVE, REJECT or MARK_PAID.",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(
      "BUSINESS WITHDRAWAL PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Failed to update withdrawal.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| BUSINESS WALLET SYNC
|--------------------------------------------------------------------------
*/

async function updateBusinessWallet() {
  const revenue =
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

  const totalRevenue =
    Number(
      revenue._sum.amount ?? 0
    );

  const totalCost =
    Number(
      revenue._sum.cost ?? 0
    );

  const totalProfit =
    Number(
      revenue._sum.profit ?? 0
    );

  const withdrawals =
    await prisma.businessWithdrawal.aggregate({
      where: {
        status: "SUCCESS",
      },

      _sum: {
        amount: true,
      },
    });

  const withdrawnAmount =
    Number(
      withdrawals._sum.amount ?? 0
    );

  const walletBalance =
    Math.max(
      0,
      totalRevenue -
        withdrawnAmount
    );

  const existing =
    await prisma.businessWallet.findUnique(
      {
        where: {
          name:
            "Brainfriend Tech",
        },
      }
    );

  if (!existing) {
    await prisma.businessWallet.create(
      {
        data: {
          name:
            "Brainfriend Tech",

          balance:
            walletBalance,

          totalRevenue,

          totalCost,

          totalProfit,

          withdrawnProfit:
            Math.min(
              withdrawnAmount,
              totalProfit
            ),

          availableProfit:
            Math.max(
              0,
              totalProfit -
                Math.min(
                  withdrawnAmount,
                  totalProfit
                )
            ),
        },
      }
    );

    return;
  }

  await prisma.businessWallet.update(
    {
      where: {
        id: existing.id,
      },

      data: {
        balance:
          walletBalance,

        totalRevenue,

        totalCost,

        totalProfit,

        withdrawnProfit:
          Math.min(
            withdrawnAmount,
            totalProfit
          ),

        availableProfit:
          Math.max(
            0,
            totalProfit -
              Math.min(
                withdrawnAmount,
                totalProfit
              )
          ),
      },
    }
  );
}