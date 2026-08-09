import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const amount = Number(body?.amount);

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

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    if (
      !accountName ||
      !accountNumber ||
      !bankName
    ) {
      return NextResponse.json(
        {
          error:
            "Bank name, account name and account number are required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          error:
            "Account number must contain 10 digits.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: {
            email: session.user.email!,
          },
          select: {
            id: true,
            walletBalance: true,
            status: true,
          },
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        if (user.status !== "ACTIVE") {
          throw new Error("ACCOUNT_SUSPENDED");
        }

        if (amount > user.walletBalance) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        /*
         * Immediately reserve/debit the money.
         * This prevents the user from spending the
         * same balance while the withdrawal is pending.
         */
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            walletBalance: {
              decrement: amount,
            },
          },
          select: {
            walletBalance: true,
          },
        });

        const reference =
          `WD-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 10)
            .toUpperCase()}`;

        const withdrawal =
          await tx.withdrawal.create({
            data: {
              userId: user.id,
              amount,
              accountName,
              accountNumber,
              bankName,
              status: "PENDING",
              reference,
            },
          });

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "WITHDRAWAL",
            amount,
            description:
              "Wallet withdrawal request",
            status: "pending",
            reference,
            provider: "INTERNAL",
          },
        });

        return {
          withdrawal,
          walletBalance:
            updatedUser.walletBalance,
        };
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Withdrawal request submitted successfully.",
      withdrawal: result.withdrawal,
      walletBalance:
        result.walletBalance,
    });
  } catch (error) {
    console.error(
      "WITHDRAWAL REQUEST ERROR:",
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
      error.message === "ACCOUNT_SUSPENDED"
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is suspended.",
        },
        { status: 403 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "INSUFFICIENT_BALANCE"
    ) {
      return NextResponse.json(
        {
          error:
            "Insufficient wallet balance.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to submit withdrawal request.",
      },
      { status: 500 }
    );
  }
}