import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type WalletAction = "FUND" | "DEDUCT" | "SET";

type WithdrawalAction =
  | "APPROVE"
  | "REJECT"
  | "PAID";

function generateReference(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase()}`;
}

/*
|--------------------------------------------------------------------------
| GET USER WALLET
|--------------------------------------------------------------------------
*/
export async function GET(request: Request) {
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

    const { searchParams } =
      new URL(request.url);

    const userId =
      searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          walletBalance: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "ADMIN WALLET GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load user wallet.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST - FUND / DEDUCT / SET WALLET
|--------------------------------------------------------------------------
*/
export async function POST(request: Request) {
  try {
    const session =
      await getServerSession(authOptions);

    /*
    ADMIN ONLY
    */
    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const userId =
      body?.userId as string | undefined;

    const action =
      body?.action as WalletAction | undefined;

    const amount =
      Number(body?.amount);

    const description =
      typeof body?.description ===
      "string"
        ? body.description.trim()
        : "";

    /*
    VALIDATE USER ID
    */
    if (!userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required.",
        },
        { status: 400 }
      );
    }

    /*
    VALIDATE ACTION
    */
    if (
      action !== "FUND" &&
      action !== "DEDUCT" &&
      action !== "SET"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid wallet action.",
        },
        { status: 400 }
      );
    }

    /*
    VALIDATE AMOUNT
    */
    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid amount.",
        },
        { status: 400 }
      );
    }

    if (
      (action === "FUND" ||
        action === "DEDUCT") &&
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be greater than zero.",
        },
        { status: 400 }
      );
    }

    /*
    FIND USER
    */
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          walletBalance: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    /*
    CALCULATE NEW BALANCE
    */
    let newBalance =
      user.walletBalance;

    let transactionAmount =
      amount;

    let transactionDescription =
      description;

    if (action === "FUND") {
      newBalance =
        user.walletBalance + amount;

      transactionDescription =
        transactionDescription ||
        "Wallet funded by admin";
    }

    if (action === "DEDUCT") {
      if (
        amount >
        user.walletBalance
      ) {
        return NextResponse.json(
          {
            error:
              "Insufficient wallet balance.",
          },
          { status: 400 }
        );
      }

      newBalance =
        user.walletBalance - amount;

      transactionDescription =
        transactionDescription ||
        "Wallet deduction by admin";
    }

    if (action === "SET") {
      newBalance = amount;

      transactionAmount =
        Math.abs(
          amount -
            user.walletBalance
        );

      transactionDescription =
        transactionDescription ||
        "Wallet balance adjusted by admin";
    }

    /*
    UNIQUE TRANSACTION REFERENCE
    */
    const reference =
      generateReference(
        "ADMIN-WALLET"
      );

    /*
    UPDATE BALANCE AND TRANSACTION
    TOGETHER
    */
    const result =
      await prisma.$transaction(
        async (tx) => {
          const updatedUser =
            await tx.user.update({
              where: {
                id: userId,
              },
              data: {
                walletBalance:
                  newBalance,
              },
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                walletBalance: true,
                role: true,
                status: true,
              },
            });

          /*
          SET WITH SAME BALANCE
          DOES NOT CREATE TRANSACTION
          */
          if (
            action === "SET" &&
            transactionAmount === 0
          ) {
            return {
              updatedUser,
              transaction: null,
            };
          }

          const transaction =
            await tx.transaction.create({
              data: {
                userId,
                type:
                  "FUND_WALLET",
                amount:
                  transactionAmount,
                description:
                  transactionDescription,
                status: "success",
                reference,
                provider: "ADMIN",
              },
            });

          return {
            updatedUser,
            transaction,
          };
        }
      );

    return NextResponse.json({
      success: true,

      message:
        action === "FUND"
          ? "Wallet funded successfully."
          : action === "DEDUCT"
          ? "Wallet deducted successfully."
          : "Wallet balance updated successfully.",

      user:
        result.updatedUser,

      transaction:
        result.transaction,
    });
  } catch (error) {
    console.error(
      "ADMIN WALLET POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update user wallet.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH - ADMIN WITHDRAWAL PROCESSING
|--------------------------------------------------------------------------
|
| APPROVE:
|   Approves a pending withdrawal.
|
| REJECT:
|   Rejects a pending withdrawal and refunds
|   the amount to the user's wallet if the
|   amount was previously reserved.
|
| PAID:
|   Marks an approved withdrawal as paid and
|   creates the WITHDRAWAL transaction.
|
|--------------------------------------------------------------------------
*/
export async function PATCH(request: Request) {
  try {
    const session =
      await getServerSession(authOptions);

    /*
    ADMIN ONLY
    */
    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Only administrators can process withdrawals.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const withdrawalId =
      body?.withdrawalId as
        | string
        | undefined;

    const action =
      body?.action as
        | WithdrawalAction
        | undefined;

    const adminNote =
      typeof body?.adminNote ===
      "string"
        ? body.adminNote.trim()
        : "";

    /*
    VALIDATE WITHDRAWAL ID
    */
    if (!withdrawalId) {
      return NextResponse.json(
        {
          error:
            "Withdrawal ID is required.",
        },
        { status: 400 }
      );
    }

    /*
    VALIDATE ACTION
    */
    if (
      action !== "APPROVE" &&
      action !== "REJECT" &&
      action !== "PAID"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid withdrawal action.",
        },
        { status: 400 }
      );
    }

    /*
    PROCESS EVERYTHING INSIDE ONE
    DATABASE TRANSACTION
    */
    const result =
      await prisma.$transaction(
        async (tx) => {
          const withdrawal =
            await tx.withdrawal.findUnique({
              where: {
                id: withdrawalId,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    walletBalance: true,
                  },
                },
              },
            });

          if (!withdrawal) {
            throw new Error(
              "WITHDRAWAL_NOT_FOUND"
            );
          }

          /*
          APPROVE
          */
          if (
            action === "APPROVE"
          ) {
            if (
              withdrawal.status !==
              "PENDING"
            ) {
              throw new Error(
                "WITHDRAWAL_NOT_PENDING"
              );
            }

            const updated =
              await tx.withdrawal.update({
                where: {
                  id: withdrawalId,
                },
                data: {
                  status:
                    "APPROVED",
                  adminNote:
                    adminNote ||
                    null,
                },
              });

            return {
              withdrawal: updated,
              message:
                "Withdrawal approved successfully.",
            };
          }

          /*
          REJECT
          */
          if (
            action === "REJECT"
          ) {
            if (
              withdrawal.status !==
                "PENDING" &&
              withdrawal.status !==
                "APPROVED"
            ) {
              throw new Error(
                "WITHDRAWAL_ALREADY_PROCESSED"
              );
            }

            /*
            Refund the wallet only if the
            withdrawal was already approved
            and the amount had been reserved.
            */
            let updatedBalance =
              withdrawal.user
                .walletBalance;

            if (
              withdrawal.status ===
              "APPROVED"
            ) {
              updatedBalance +=
                withdrawal.amount;

              await tx.user.update({
                where: {
                  id: withdrawal.userId,
                },
                data: {
                  walletBalance:
                    updatedBalance,
                },
              });
            }

            const updated =
              await tx.withdrawal.update({
                where: {
                  id: withdrawalId,
                },
                data: {
                  status:
                    "REJECTED",
                  adminNote:
                    adminNote ||
                    "Withdrawal rejected by admin.",
                  processedAt:
                    new Date(),
                },
              });

            /*
            If money was refunded,
            record the refund.
            */
            if (
              withdrawal.status ===
              "APPROVED"
            ) {
              await tx.transaction.create({
                data: {
                  userId:
                    withdrawal.userId,
                  type:
                    "FUND_WALLET",
                  amount:
                    withdrawal.amount,
                  description:
                    "Withdrawal rejected - wallet refunded",
                  status:
                    "success",
                  reference:
                    generateReference(
                      "WITHDRAWAL-REFUND"
                    ),
                  provider:
                    "ADMIN",
                },
              });
            }

            return {
              withdrawal: updated,
              message:
                "Withdrawal rejected successfully.",
            };
          }

          /*
          PAID
          */
          if (action === "PAID") {
            if (
              withdrawal.status !==
              "APPROVED"
            ) {
              throw new Error(
                "WITHDRAWAL_NOT_APPROVED"
              );
            }

            /*
            IMPORTANT:
            The wallet is NOT deducted here
            because the withdrawal amount should
            already have been reserved when the
            withdrawal was created/approved.
            */

            const updated =
              await tx.withdrawal.update({
                where: {
                  id: withdrawalId,
                },
                data: {
                  status:
                    "PAID",
                  adminNote:
                    adminNote ||
                    withdrawal.adminNote ||
                    null,
                  processedAt:
                    new Date(),
                },
              });

            /*
            CREATE WITHDRAWAL TRANSACTION
            */
            const transaction =
              await tx.transaction.create({
                data: {
                  userId:
                    withdrawal.userId,

                  type:
                    "WITHDRAWAL",

                  amount:
                    withdrawal.amount,

                  description:
                    `Wallet withdrawal - ${withdrawal.bankName} - ${withdrawal.accountNumber}`,

                  status:
                    "success",

                  reference:
                    withdrawal.reference,

                  provider:
                    "ADMIN",
                },
              });

            return {
              withdrawal: updated,
              transaction,
              message:
                "Withdrawal marked as paid successfully.",
            };
          }

          throw new Error(
            "INVALID_ACTION"
          );
        }
      );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "ADMIN WITHDRAWAL ERROR:",
      error
    );

    if (
      error instanceof Error
    ) {
      if (
        error.message ===
        "WITHDRAWAL_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            error:
              "Withdrawal not found.",
          },
          { status: 404 }
        );
      }

      if (
        error.message ===
        "WITHDRAWAL_NOT_PENDING"
      ) {
        return NextResponse.json(
          {
            error:
              "Only pending withdrawals can be approved.",
          },
          { status: 400 }
        );
      }

      if (
        error.message ===
        "WITHDRAWAL_ALREADY_PROCESSED"
      ) {
        return NextResponse.json(
          {
            error:
              "This withdrawal has already been processed.",
          },
          { status: 400 }
        );
      }

      if (
        error.message ===
        "WITHDRAWAL_NOT_APPROVED"
      ) {
        return NextResponse.json(
          {
            error:
              "Only approved withdrawals can be marked as paid.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Failed to process withdrawal.",
      },
      { status: 500 }
    );
  }
}