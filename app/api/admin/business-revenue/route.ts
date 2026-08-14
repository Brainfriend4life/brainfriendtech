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

    const provider =
      searchParams.get("provider");

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

    if (provider) {
      where.provider = {
        equals: provider,
        mode: "insensitive",
      };
    }

    const revenues =
      await prisma.businessRevenue.findMany({
        where,

        orderBy: {
          createdAt: "desc",
        },

        take: limit,

        include: {
          businessWallet: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    const totals =
      await prisma.businessRevenue.aggregate({
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

      revenues,

      totals: {
        revenue:
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
      "ADMIN BUSINESS REVENUE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load business revenue.",
      },
      { status: 500 }
    );
  }
}