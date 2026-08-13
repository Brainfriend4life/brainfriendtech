import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PURCHASE_TYPES = [
  "AIRTIME",
  "DATA",
  "ELECTRICITY",
  "CABLE",
  "EXAM_PIN",
  "NIN",
] as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // =========================================================
    // SERVICE TRANSACTIONS
    // =========================================================

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: {
          in: [...PURCHASE_TYPES],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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

    // =========================================================
    // EXAM PINS
    // =========================================================

    const examPins = await prisma.examPin.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
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
    });

    // =========================================================
    // NIN VERIFICATIONS
    // =========================================================

    const ninVerifications =
      await prisma.ninVerification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
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
      });

    // =========================================================
    // COMBINED PURCHASES
    // =========================================================

    const purchases = transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      status: transaction.status,
      reference: transaction.reference,
      provider: transaction.provider,
      createdAt: transaction.createdAt,
      details: null,
    }));

    // =========================================================
    // EXAM PIN PURCHASES
    // =========================================================

    for (const exam of examPins) {
      purchases.push({
        id: exam.id,
        type: "EXAM_PIN",
        amount: Number(exam.amount),
        description: `${exam.provider} Exam PIN`,
        status: "SUCCESS",
        reference: exam.reference,
        provider: exam.provider,
        createdAt: exam.createdAt,
        details: {
          pin: exam.pin,
          serial: exam.serial,
        },
      });
    }

    // =========================================================
    // NIN PURCHASES
    // =========================================================

    for (const nin of ninVerifications) {
      purchases.push({
        id: nin.id,
        type: "NIN",
        amount: Number(nin.amount),
        description: `${nin.cardType} NIN Verification`,
        status: nin.status,
        reference: nin.reference,
        provider: "NetworkDataSub",
        createdAt: nin.createdAt,
        details: {
          nin: nin.nin,
          cardType: nin.cardType,
          firstName: nin.firstName,
          middleName: nin.middleName,
          surname: nin.surname,
          gender: nin.gender,
          birthDate: nin.birthDate,
          telephone: nin.telephone,
          photo: nin.photo,
          hasPdf: nin.hasPdf,
          transactionId: nin.transactionId,
        },
      });
    }

    // =========================================================
    // SORT EVERYTHING BY DATE
    // =========================================================

    purchases.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,

      purchases,

      examPins: examPins.map((exam) => ({
        id: exam.id,
        provider: exam.provider,
        pin: exam.pin,
        serial: exam.serial,
        amount: Number(exam.amount),
        reference: exam.reference,
        createdAt: exam.createdAt,
      })),

      ninVerifications: ninVerifications.map((nin) => ({
        id: nin.id,
        nin: nin.nin,
        cardType: nin.cardType,
        amount: Number(nin.amount),
        reference: nin.reference,
        transactionId: nin.transactionId,
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
      })),

      total: purchases.length,
    });
  } catch (error) {
    console.error("PURCHASES HISTORY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load purchases history.",
      },
      { status: 500 }
    );
  }
}