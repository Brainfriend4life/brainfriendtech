import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    const services = [
      "AIRTIME",
      "DATA",
      "ELECTRICITY",
      "CABLE",
      "EXAM_PIN",
      "NIN",
    ];

    const result: Record<
      string,
      {
        revenue: number;
        cost: number;
        profit: number;
        transactions: number;
      }
    > = {};

    for (const service of services) {
      const data =
        await prisma.businessRevenue.aggregate({
          where: {
            type: service as any,
          },

          _sum: {
            amount: true,
            cost: true,
            profit: true,
          },

          _count: {
            id: true,
          },
        });

      result[service] = {
        revenue:
          Number(
            data._sum?.amount ?? 0
          ),

        cost:
          Number(
            data._sum?.cost ?? 0
          ),

        profit:
          Number(
            data._sum?.profit ?? 0
          ),

        transactions:
          Number(
            data._count?.id ?? 0
          ),
      };
    }

    return NextResponse.json({
      success: true,
      services: result,
    });
  } catch (error) {
    console.error(
      "ADMIN SERVICE REVENUE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load service revenue.",
      },
      { status: 500 }
    );
  }
}