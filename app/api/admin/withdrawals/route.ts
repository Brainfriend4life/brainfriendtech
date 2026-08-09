import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 403 }
      );
    }

    const withdrawals =
      await prisma.withdrawal.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              walletBalance: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      withdrawals,
    });
  } catch (error) {
    console.error(
      "ADMIN WITHDRAWALS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load withdrawals.",
      },
      { status: 500 }
    );
  }
}

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
        { error: "Unauthorized." },
        { status: 403 }
      );
    }

    const body = await request.json();

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

    if (
      !["APPROVE", "REJECT", "PAID"].includes(
        action
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid withdrawal action.",
        },
        { status: 400 }
      );
    }

    const withdrawal =
      await prisma.withdrawal.findUnique({
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
      return NextResponse.json(
        {
          error:
            "Withdrawal not found.",
        },
        { status: 404 }
      );
    }

    /*
     * APPROVE
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

      const result =
        await prisma.$transaction(
          async (tx) => {
            const updated =
              await tx.withdrawal.update({
                where: {
                  id: withdrawalId,
                },
                data: {
                  status: "APPROVED",
                  adminNote:
                    adminNote || null,
                },
              });

            await tx.transaction.updateMany({
              where: {
                reference:
                  withdrawal.reference,
                type: "WITHDRAWAL",
              },
              data: {
                status: "approved",
                description:
                  adminNote
                    ? `Withdrawal approved by admin: ${adminNote}`
                    : "Withdrawal approved by admin",
              },
            });

            return updated;
          }
        );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal approved successfully.",
        withdrawal: result,
      });
    }

    /*
     * REJECT
     *
     * The user's money was already reserved
     * when the withdrawal was created.
     *
     * Therefore, rejection returns the money
     * back to the user's wallet.
     */
    if (action === "REJECT") {
      if (
        withdrawal.status !== "PENDING" &&
        withdrawal.status !== "APPROVED"
      ) {
        return NextResponse.json(
          {
            error:
              "This withdrawal can no longer be rejected.",
          },
          { status: 400 }
        );
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const updatedUser =
              await tx.user.update({
                where: {
                  id: withdrawal.userId,
                },
                data: {
                  walletBalance: {
                    increment:
                      withdrawal.amount,
                  },
                },
                select: {
                  walletBalance: true,
                },
              });

            const updatedWithdrawal =
              await tx.withdrawal.update({
                where: {
                  id: withdrawalId,
                },
                data: {
                  status: "REJECTED",
                  adminNote:
                    adminNote ||
                    "Withdrawal rejected by admin.",
                  processedAt:
                    new Date(),
                },
              });

            await tx.transaction.updateMany({
              where: {
                reference:
                  withdrawal.reference,
                type: "WITHDRAWAL",
              },
              data: {
                status: "rejected",
                description:
                  adminNote
                    ? `Withdrawal rejected: ${adminNote}`
                    : "Withdrawal rejected and wallet refunded",
              },
            });

            await tx.transaction.create({
              data: {
                userId:
                  withdrawal.userId,
                type: "FUND_WALLET",
                amount:
                  withdrawal.amount,
                description:
                  "Withdrawal refund",
                status: "success",
                reference:
                  `REFUND-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)
                    .toUpperCase()}`,
                provider: "ADMIN",
              },
            });

            return {
              updatedUser,
              updatedWithdrawal,
            };
          }
        );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal rejected and wallet refunded.",
        withdrawal:
          result.updatedWithdrawal,
        walletBalance:
          result.updatedUser.walletBalance,
      });
    }

    /*
     * PAID
     *
     * Admin should only mark an approved
     * withdrawal as PAID after actually
     * sending the money to the user's bank.
     */
    if (action === "PAID") {
      if (
        withdrawal.status !== "APPROVED"
      ) {
        return NextResponse.json(
          {
            error:
              "Only approved withdrawals can be marked as paid.",
          },
          { status: 400 }
        );
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const updated =
              await tx.withdrawal.update({
                where: {
                  id: withdrawalId,
                },
                data: {
                  status: "PAID",
                  adminNote:
                    adminNote || null,
                  processedAt:
                    new Date(),
                },
              });

            await tx.transaction.updateMany({
              where: {
                reference:
                  withdrawal.reference,
                type: "WITHDRAWAL",
              },
              data: {
                status: "success",
                description:
                  adminNote
                    ? `Withdrawal paid: ${adminNote}`
                    : "Withdrawal paid by admin",
              },
            });

            return updated;
          }
        );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal marked as paid.",
        withdrawal: result,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid withdrawal action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "ADMIN WITHDRAWAL PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to process withdrawal.",
      },
      { status: 500 }
    );
  }
}