import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const query =
      searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            fullName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
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

      orderBy: {
        createdAt: "desc",
      },

      take: 10,
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(
      "ADMIN USER SEARCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to search users.",
      },
      { status: 500 }
    );
  }
}