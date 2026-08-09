import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session =
      await getServerSession(authOptions);

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
            "Please enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    if (!accountName) {
      return NextResponse.json(
        { error: "Account name is required." },
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

    if (!bankName) {
      return NextResponse.json(
        { error: "Bank name is required." },
        { status: 400 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
        select: {
          id: true,
          walletBalance: true,
          status: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Your account is currently suspended.",
        },
        { status: 403 }
      );
    }

    const reference =
      `WD-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`;

    const result =
      await prisma.$transaction(
        async (tx) => {
          const currentUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
              select: {
                walletBalance: true,
              },
            });

          if (!currentUser) {
            throw new Error(
              "User not found."
            );
          }

          if (
            amount >
            currentUser.walletBalance
          ) {
            throw new Error(
              "INSUFFICIENT_BALANCE"
            );
          }

          /*
           * Reserve the money immediately.
           * Admin will later approve/reject the request.
           */
          const updatedUser =
            await tx.user.update({
              where: {
                id: user.id,
              },
              data: {
                walletBalance: {
                  decrement: amount,
                },
              },
            });

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
                "Withdrawal request",
              status: "pending",
              reference,
              provider: "SYSTEM",
            },
          });

          return {
            updatedUser,
            withdrawal,
          };
        }
      );

    return NextResponse.json({
      success: true,
      message:
        "Withdrawal request submitted successfully. Awaiting admin approval.",
      withdrawal: result.withdrawal,
      walletBalance:
        result.updatedUser.walletBalance,
    });
  } catch (error) {
    console.error(
      "WITHDRAWAL ERROR:",
      error
    );

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
          "Failed to create withdrawal request.",
      },
      { status: 500 }
    );
  }
}