
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    withdrawalId: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: Props
) {
  try {
    // =========================
    // ADMIN AUTHENTICATION
    // =========================

    const session = await getServerSession(authOptions);

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

    // =========================
    // GET WITHDRAWAL ID
    // =========================

    const { withdrawalId } = await params;

    if (!withdrawalId) {
      return NextResponse.json(
        {
          error: "Withdrawal ID is required.",
        },
        { status: 400 }
      );
    }

    // =========================
    // READ REQUEST BODY
    // =========================

    let body: {
      status?: string;
      adminNote?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const status = body?.status;

    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    // =========================
    // VALIDATE STATUS
    // =========================

    if (
      status !== "APPROVED" &&
      status !== "REJECTED" &&
      status !== "PAID"
    ) {
      return NextResponse.json(
        {
          error: "Invalid withdrawal status.",
        },
        { status: 400 }
      );
    }

    // =========================
    // FIND WITHDRAWAL
    // =========================

    const withdrawal =
      await prisma.withdrawal.findUnique({
        where: {
          id: withdrawalId,
        },
      });

    if (!withdrawal) {
      return NextResponse.json(
        {
          error: "Withdrawal request not found.",
        },
        { status: 404 }
      );
    }

    // =========================
    // PREVENT INVALID STATUS CHANGES
    // =========================

    if (withdrawal.status === "REJECTED") {
      return NextResponse.json(
        {
          error:
            "This withdrawal has already been rejected.",
        },
        { status: 400 }
      );
    }

    if (withdrawal.status === "PAID") {
      return NextResponse.json(
        {
          error:
            "This withdrawal has already been paid.",
        },
        { status: 400 }
      );
    }

    // =========================
    // APPROVE WITHDRAWAL
    // =========================

    if (status === "APPROVED") {
      if (withdrawal.status !== "PENDING") {
        return NextResponse.json(
          {
            error:
              "Only pending withdrawals can be approved.",
          },
          { status: 400 }
        );
      }

      const updatedWithdrawal =
        await prisma.withdrawal.update({
          where: {
            id: withdrawalId,
          },
          data: {
            status: "APPROVED",
            adminNote: adminNote || null,
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
        message:
          "Withdrawal approved successfully.",
        withdrawal: updatedWithdrawal,
      });
    }

    // =========================
    // REJECT WITHDRAWAL
    // =========================

    if (status === "REJECTED") {
      if (withdrawal.status !== "PENDING") {
        return NextResponse.json(
          {
            error:
              "Only pending withdrawals can be rejected.",
          },
          { status: 400 }
        );
      }

      /*
       * When a withdrawal is rejected,
       * return the withdrawal amount
       * to the user's wallet.
       *
       * Everything happens inside one
       * database transaction.
       */

      const result =
        await prisma.$transaction(
          async (tx) => {
            // -------------------------
            // REFUND USER
            // -------------------------

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
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                  walletBalance: true,
                },
              });

            // -------------------------
            // UPDATE WITHDRAWAL
            // -------------------------

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
                  processedAt: new Date(),
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

            // -------------------------
            // RECORD REFUND TRANSACTION
            // -------------------------

            await tx.transaction.create({
              data: {
                userId: withdrawal.userId,
                type: "WITHDRAWAL",
                amount: withdrawal.amount,
                description:
                  "Withdrawal rejected and amount refunded to wallet.",
                status: "success",
                reference:
                  `WITHDRAWAL-REFUND-${Date.now()}-${Math.random()
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
          "Withdrawal rejected and amount refunded successfully.",
        withdrawal:
          result.updatedWithdrawal,
        user: result.updatedUser,
      });
    }

    // =========================
    // MARK AS PAID
    // =========================

    if (status === "PAID") {
      if (withdrawal.status !== "APPROVED") {
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
            // -------------------------
            // MARK WITHDRAWAL AS PAID
            // -------------------------

            const updatedWithdrawal =
              await tx.withdrawal.update({
                where: {
                  id: withdrawalId,
                },
                data: {
                  status: "PAID",
                  adminNote:
                    adminNote ||
                    withdrawal.adminNote,
                  processedAt: new Date(),
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

            // -------------------------
            // RECORD PAYMENT TRANSACTION
            // -------------------------

            await tx.transaction.create({
              data: {
                userId: withdrawal.userId,
                type: "WITHDRAWAL",
                amount: withdrawal.amount,
                description:
                  "Withdrawal paid by admin.",
                status: "success",
                reference:
                  `WITHDRAWAL-PAID-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)
                    .toUpperCase()}`,
                provider: "ADMIN",
              },
            });

            return updatedWithdrawal;
          }
        );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal marked as paid successfully.",
        withdrawal: result,
      });
    }

    // =========================
    // FALLBACK
    // =========================

    return NextResponse.json(
      {
        error:
          "Unable to process withdrawal.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "ADMIN WITHDRAWAL UPDATE ERROR:",
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

