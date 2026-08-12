import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        reference: true,
        provider: true,
        cost: true,
        profit: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("WALLET TRANSACTIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load wallet activity.",
      },
      { status: 500 }
    );
  }
}