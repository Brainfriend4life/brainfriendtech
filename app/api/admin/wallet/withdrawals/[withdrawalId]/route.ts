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

    const { withdrawalId } = await params;

    const body = await request.json();

    const action = String(body.action || "").toUpperCase();
    const adminNote =
      String(body.adminNote || "").trim() || null;

    if (
      !["APPROVE", "REJECT", "PAID"].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action. Use APPROVE, REJECT or PAID.",
        },
        { status: 400 }
      );
    }

    const withdrawal =
      await prisma.withdrawal.findUnique({
        where: {
          id: withdrawalId,
        },
      });

    if (!withdrawal) {
      return NextResponse.json(
        {
          error: "Withdrawal not found.",
        },
        { status: 404 }
      );
    }

    if (action === "APPROVE") {
      if (withdrawal.status !== "PENDING") {
        return NextResponse.json(
          {
            error:
              "Only pending withdrawals can be approved.",
          },
          { status: 400 }
        );
      }

      const updated =
        await prisma.withdrawal.update({
          where: {
            id: withdrawalId,
          },
          data: {
            status: "APPROVED",
            adminNote,
          },
        });

      return NextResponse.json({
        success: true,
        message: "Withdrawal approved.",
        withdrawal: updated,
      });
    }

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

      const updated =
        await prisma.withdrawal.update({
          where: {
            id: withdrawalId,
          },
          data: {
            status: "REJECTED",
            adminNote,
          },
        });

      return NextResponse.json({
        success: true,
        message: "Withdrawal rejected.",
        withdrawal: updated,
      });
    }

    /*
     * PAID
     *
     * Wallet money is deducted here, exactly once.
     */
    if (withdrawal.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Only approved withdrawals can be marked as paid.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: {
            id: withdrawal.userId,
          },
          select: {
            id: true,
            walletBalance: true,
          },
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        if (
          user.walletBalance < withdrawal.amount
        ) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const updatedUser =
          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              walletBalance: {
                decrement: withdrawal.amount,
              },
            },
          });

        const updatedWithdrawal =
          await tx.withdrawal.update({
            where: {
              id: withdrawal.id,
            },
            data: {
              status: "PAID",
              adminNote,
              processedAt: new Date(),
            },
          });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "FUND_WALLET",
            amount: withdrawal.amount,
            description:
              `Wallet withdrawal - ${withdrawal.reference}`,
            status: "success",
            reference: `TX-${withdrawal.reference}`,
            provider: "ADMIN_WITHDRAWAL",
          },
        });

        return {
          user: updatedUser,
          withdrawal: updatedWithdrawal,
        };
      }
    );

    return NextResponse.json({
      success: true,
      message: "Withdrawal marked as paid.",
      ...result,
    });
  } catch (error) {
    console.error(
      "ADMIN WITHDRAWAL UPDATE ERROR:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "USER_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_BALANCE"
    ) {
      return NextResponse.json(
        {
          error:
            "User does not have enough wallet balance to process this withdrawal.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to update withdrawal.",
      },
      { status: 500 }
    );
  }
}