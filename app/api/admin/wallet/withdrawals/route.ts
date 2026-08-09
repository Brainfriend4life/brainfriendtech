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
      withdrawals,
    });
  } catch (error) {
    console.error(
      "ADMIN GET WITHDRAWALS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load withdrawals.",
      },
      { status: 500 }
    );
  }
}