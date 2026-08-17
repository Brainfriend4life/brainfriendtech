import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const reference =
      request.nextUrl.searchParams.get(
        "reference"
      );

    if (!reference?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction reference is required.",
        },
        { status: 400 }
      );
    }

    const transaction =
      await prisma.transaction.findUnique({
        where: {
          reference: reference.trim(),
        },
        select: {
          id: true,
          reference: true,
          type: true,
          amount: true,
          description: true,
          status: true,
          provider: true,
          cost: true,
          profit: true,
          createdAt: true,
          userId: true,
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction not found.",
        },
        { status: 404 }
      );
    }

    // Normal users can only check
    // their own transactions.
    //
    // Admins can check any transaction.

    if (
      session.user.role !== "ADMIN" &&
      transaction.userId !== session.user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

      transaction: {
        id: transaction.id,
        reference:
          transaction.reference,
        type: transaction.type,
        amount: Number(
          transaction.amount
        ),
        description:
          transaction.description,
        status: transaction.status,
        provider:
          transaction.provider,
        cost: Number(
          transaction.cost
        ),
        profit: Number(
          transaction.profit
        ),
        createdAt:
          transaction.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "TRANSACTION STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to check transaction status.",
      },
      { status: 500 }
    );
  }
}