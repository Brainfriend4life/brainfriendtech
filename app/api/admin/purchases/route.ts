import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SERVICE_TYPES = [
  "AIRTIME",
  "DATA",
  "ELECTRICITY",
  "CABLE",
  "EXAM_PIN",
  "NIN",
] as const;

export async function GET(request: Request) {
  try {
    // ============================================================
    // ADMIN AUTH
    // ============================================================

    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // QUERY PARAMETERS
    // ============================================================

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const type = searchParams.get("type") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(
      Number(searchParams.get("page") || 1),
      1
    );

    const limit = 25;
    const skip = (page - 1) * limit;

    // ============================================================
    // TRANSACTION FILTER
    // ============================================================

    const where: any = {
      isTest: false,
      type: {
        in:
          type !== "ALL" &&
          SERVICE_TYPES.includes(
            type as (typeof SERVICE_TYPES)[number]
          )
            ? [type]
            : [...SERVICE_TYPES],
      },
    };

    if (status !== "ALL") {
      where.status = status;
    }

    // ============================================================
    // SEARCH USER / REFERENCE
    // ============================================================

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
        {
          user: {
            phone: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    // ============================================================
    // TRANSACTIONS
    // ============================================================

    const [transactions, total] =
      await Promise.all([
        prisma.transaction.findMany({
          where,

          orderBy: {
            createdAt: "desc",
          },

          skip,
          take: limit,

          select: {
            id: true,
            type: true,
            amount: true,
            cost: true,
            profit: true,
            description: true,
            status: true,
            reference: true,
            provider: true,
            createdAt: true,

            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        }),

        prisma.transaction.count({
          where,
        }),
      ]);

    // ============================================================
    // EXAM PINS
    // ============================================================

    const transactionReferences = transactions
      .filter(
        (transaction) =>
          transaction.type === "EXAM_PIN"
      )
      .map(
        (transaction) => transaction.reference
      );

    const examPins =
      transactionReferences.length > 0
        ? await prisma.examPin.findMany({
            where: {
              reference: {
                in: transactionReferences,
              },
            },

            select: {
              id: true,
              provider: true,
              pin: true,
              serial: true,
              amount: true,
              reference: true,
              createdAt: true,
            },
          })
        : [];

    // ============================================================
    // NIN VERIFICATIONS
    // ============================================================

    const ninReferences = transactions
      .filter(
        (transaction) =>
          transaction.type === "NIN"
      )
      .map(
        (transaction) => transaction.reference
      );

    const ninVerifications =
      ninReferences.length > 0
        ? await prisma.ninVerification.findMany({
            where: {
              reference: {
                in: ninReferences,
              },
            },

            select: {
              id: true,
              nin: true,
              cardType: true,
              amount: true,
              reference: true,
              transactionId: true,
              status: true,
              firstName: true,
              middleName: true,
              surname: true,
              gender: true,
              birthDate: true,
              telephone: true,
              photo: true,
              hasPdf: true,
              createdAt: true,
              updatedAt: true,
            },
          })
        : [];

    // ============================================================
    // FORMAT PURCHASES
    // ============================================================

    const purchases = transactions.map(
      (transaction) => {
        const examPin =
          transaction.type === "EXAM_PIN"
            ? examPins.find(
                (item) =>
                  item.reference ===
                  transaction.reference
              )
            : null;

        const nin =
          transaction.type === "NIN"
            ? ninVerifications.find(
                (item) =>
                  item.reference ===
                  transaction.reference
              )
            : null;

        return {
          id: transaction.id,
          type: transaction.type,

          amount: Number(transaction.amount),
          cost: Number(transaction.cost),
          profit:
            Number(transaction.amount) -
            Number(transaction.cost),

          description:
            transaction.description,

          status: transaction.status,
          reference: transaction.reference,
          provider: transaction.provider,
          createdAt: transaction.createdAt,

          user: transaction.user,

          examPin: examPin
            ? {
                id: examPin.id,
                provider: examPin.provider,
                pin: examPin.pin,
                serial: examPin.serial,
                amount: Number(
                  examPin.amount
                ),
                reference:
                  examPin.reference,
                createdAt:
                  examPin.createdAt,
              }
            : null,

          nin: nin
            ? {
                id: nin.id,
                nin: nin.nin,
                cardType: nin.cardType,
                amount: Number(nin.amount),
                reference: nin.reference,
                transactionId:
                  nin.transactionId,
                status: nin.status,
                firstName: nin.firstName,
                middleName: nin.middleName,
                surname: nin.surname,
                gender: nin.gender,
                birthDate: nin.birthDate,
                telephone: nin.telephone,
                photo: nin.photo,
                hasPdf: nin.hasPdf,
                createdAt: nin.createdAt,
                updatedAt: nin.updatedAt,
              }
            : null,
        };
      }
    );

    // ============================================================
    // SUMMARY
    // ============================================================

    const summary = await prisma.transaction.aggregate({
      where,

      _sum: {
        amount: true,
        cost: true,
      },

      _count: {
        id: true,
      },
    });

    const totalAmount = Number(
      summary._sum.amount ?? 0
    );

    const totalCost = Number(
      summary._sum.cost ?? 0
    );

    const totalProfit =
      totalAmount - totalCost;

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json({
      success: true,

      purchases,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },

      summary: {
        transactions:
          summary._count.id ?? 0,
        amount: totalAmount,
        cost: totalCost,
        profit: totalProfit,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN PURCHASES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load purchases history.",
      },
      {
        status: 500,
      }
    );
  }
}