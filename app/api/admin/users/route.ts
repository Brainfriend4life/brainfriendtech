import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim();

    const status =
      searchParams.get("status");

    const limitParam =
      Number(
        searchParams.get("limit") ||
          "50"
      );

    const limit =
      Number.isInteger(limitParam) &&
      limitParam > 0 &&
      limitParam <= 200
        ? limitParam
        : 50;

    const where: any = {};

    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (
      status === "ACTIVE" ||
      status === "SUSPENDED"
    ) {
      where.status = status;
    }

    const [
      users,
      total,
      active,
      suspended,
    ] =
      await Promise.all([
        prisma.user.findMany({
          where,

          orderBy: {
            createdAt: "desc",
          },

          take: limit,

          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            walletBalance: true,
            role: true,
            status: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,

            _count: {
              select: {
                transactions: true,
                withdrawals: true,
                ninVerifications: true,
              },
            },
          },
        }),

        prisma.user.count({
          where,
        }),

        prisma.user.count({
          where: {
            status: "ACTIVE",
          },
        }),

        prisma.user.count({
          where: {
            status: "SUSPENDED",
          },
        }),
      ]);

    return NextResponse.json({
      success: true,

      users,

      pagination: {
        total,
        limit,
      },

      summary: {
        total,
        active,
        suspended,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN USERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load users.",
      },
      { status: 500 }
    );
  }
}