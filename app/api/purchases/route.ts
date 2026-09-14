import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================================
// GET /api/purchases
//
// Returns every service purchase for the logged-in user
// (airtime, data, electricity, cable, exam pin, NIN) plus the
// raw ExamPin / NinVerification records so the frontend can
// show PIN / serial / NIN detail fields in the modal.
//
// FUND_WALLET and WITHDRAWAL transactions are intentionally
// excluded — they aren't "purchases".
// ============================================================

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const [transactions, examPins, ninVerifications] =
      await Promise.all([
        prisma.transaction.findMany({
          where: {
            userId,
            type: {
              in: [
                "AIRTIME",
                "DATA",
                "ELECTRICITY",
                "CABLE",
                "EXAM_PIN",
                "NIN",
              ],
            },
          },
          orderBy: { createdAt: "desc" },
        }),

        prisma.examPin.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),

        prisma.ninVerification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Index the side-tables by reference so we can attach
    // service-specific "details" onto each matching transaction
    // in O(1) instead of scanning on every row.
    const examPinsByReference = new Map(
      examPins.map((pin) => [pin.reference, pin])
    );

    const ninByReference = new Map(
      ninVerifications.map((nin) => [nin.reference, nin])
    );

    const purchases = transactions.map((transaction) => {
      let details: any = null;

      if (transaction.type === "EXAM_PIN") {
        const examPin = examPinsByReference.get(
          transaction.reference
        );

        if (examPin) {
          details = {
            pin: examPin.pin,
            serial: examPin.serial,
          };
        }
      }

      if (transaction.type === "NIN") {
        const nin = ninByReference.get(transaction.reference);

        if (nin) {
          details = {
            nin: nin.nin,
            cardType: nin.cardType,
            transactionId: nin.transactionId,
            firstName: nin.firstName,
            middleName: nin.middleName,
            surname: nin.surname,
            gender: nin.gender,
            birthDate: nin.birthDate,
            telephone: nin.telephone,
            photo: nin.photo,
            hasPdf: nin.hasPdf,
          };
        }
      }

      return {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        status: transaction.status,
        reference: transaction.reference,
        provider: transaction.provider,
        createdAt: transaction.createdAt,
        details,
      };
    });

    return NextResponse.json({
      success: true,
      purchases,
      examPins,
      ninVerifications,
    });
  } catch (error: any) {
    console.error("LOAD PURCHASES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to load purchases.",
      },
      { status: 500 }
    );
  }
}