import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const reference = searchParams
      .get("reference")
      ?.trim();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction reference is required.",
        },
        { status: 400 }
      );
    }

    const transaction =
      await prisma.transaction.findFirst({
        where: {
          reference,
          type: "FUND_WALLET",
        },

        select: {
          id: true,
          amount: true,
          description: true,
          status: true,
          reference: true,
          provider: true,
          createdAt: true,
          isTest: true,
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No deposit was found with this transaction reference.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

      transaction: {
        id: transaction.id,
        amount: Number(transaction.amount),
        description:
          transaction.description ||
          "Wallet Deposit",
        status: transaction.status,
        reference: transaction.reference,
        provider: transaction.provider,
        createdAt: transaction.createdAt,
        isTest: transaction.isTest,
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