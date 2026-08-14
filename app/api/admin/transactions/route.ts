import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const type =
      searchParams.get("type");

    const status =
      searchParams.get("status");

    const search =
      searchParams.get("search")?.trim();

    const limitParam =
      Number(
        searchParams.get("limit") || "50"
      );

    const limit =
      Number.isInteger(limitParam) &&
      limitParam > 0 &&
      limitParam <= 200
        ? limitParam
        : 50;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = {
        equals: status,
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        {
          reference: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          provider: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          user: {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const transactions =
      await prisma.transaction.findMany({
        where,

        orderBy: {
          createdAt: "desc",
        },

        take: limit,

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

    const totals =
      await prisma.transaction.aggregate({
        where,

        _sum: {
          amount: true,
          cost: true,
          profit: true,
        },

        _count: {
          id: true,
        },
      });

    return NextResponse.json({
      success: true,

      transactions,

      totals: {
        amount:
          Number(
            totals._sum?.amount ?? 0
          ),

        cost:
          Number(
            totals._sum?.cost ?? 0
          ),

        profit:
          Number(
            totals._sum?.profit ?? 0
          ),

        count:
          Number(
            totals._count?.id ?? 0
          ),
      },
    });
  } catch (error) {
    console.error(
      "ADMIN TRANSACTIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load transactions.",
      },
      { status: 500 }
    );
  }
}