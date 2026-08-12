
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

export async function GET() {
  try {
    // ==========================================
    // SERVICE TYPES
    // ==========================================

    const serviceTypes: TransactionType[] = [
      TransactionType.AIRTIME,
      TransactionType.DATA,
      TransactionType.ELECTRICITY,
      TransactionType.CABLE,
      TransactionType.EXAM_PIN,
    ];

    // ==========================================
    // TOTAL REAL REVENUE
    // ==========================================

    const revenue = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "SUCCESS",
        isTest: false,
        type: {
          in: serviceTypes,
        },
      },
    });

    // ==========================================
    // REAL REVENUE BY SERVICE
    // ==========================================

    const revenueByService =
      await prisma.transaction.groupBy({
        by: ["type"],
        _sum: {
          amount: true,
        },
        where: {
          status: "SUCCESS",
          isTest: false,
          type: {
            in: serviceTypes,
          },
        },
      });

    // ==========================================
    // TOTAL REVENUE
    // ==========================================

    const totalRevenue = Number(
      revenue._sum?.amount ?? 0
    );

    // ==========================================
    // BREAKDOWN
    // ==========================================

    const breakdown = {
      AIRTIME: 0,
      DATA: 0,
      ELECTRICITY: 0,
      CABLE: 0,
      EXAM_PIN: 0,
    };

    // ==========================================
    // BUILD BREAKDOWN
    // ==========================================

    for (const item of revenueByService) {
      if (
        Object.prototype.hasOwnProperty.call(
          breakdown,
          item.type
        )
      ) {
        breakdown[
          item.type as keyof typeof breakdown
        ] = Number(item._sum?.amount ?? 0);
      }
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      balance: totalRevenue,

      totalRevenue,

      breakdown,
    });
  } catch (error) {
    console.error(
      "ADMIN REVENUE BALANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to calculate Brainfriend Tech revenue.",
      },
      {
        status: 500,
      }
    );
  }
}

