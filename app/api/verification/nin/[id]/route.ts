import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // =========================================================
    // AUTHENTICATION
    // =========================================================

    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================
    // GET ID
    // =========================================================

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NIN verification ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================
    // FIND VERIFICATION
    // =========================================================

    const verification =
      await prisma.ninVerification.findFirst(
        {
          where: {
            id,

            userId:
              session.user.id,
          },
        }
      );

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NIN verification not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =========================================================
    // ACTUAL PDF CHECK
    // =========================================================

    const hasStoredPdf =
      typeof verification.pdfBase64 ===
        "string" &&
      verification.pdfBase64.trim()
        .length > 0;

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json(
      {
        success: true,

        data: {
          id:
            verification.id,

          verification_id:
            verification.id,

          reference:
            verification.reference,

          transaction_id:
            verification.transactionId,

          status:
            verification.status,

          nin:
            verification.nin,

          card_type:
            verification.cardType,

          amount:
            verification.amount,

          details: {
            firstName:
              verification.firstName,

            middleName:
              verification.middleName,

            surname:
              verification.surname,

            gender:
              verification.gender,

            birthDate:
              verification.birthDate,

            telephoneNo:
              verification.telephone,

            photo:
              verification.photo,
          },

          // IMPORTANT:
          // Use the actual database value, not just the
          // old hasPdf flag.
          has_pdf:
            hasStoredPdf,

          pdf_url:
            hasStoredPdf
              ? `/api/verification/nin/${verification.id}/pdf`
              : null,

          createdAt:
            verification.createdAt,

          updatedAt:
            verification.updatedAt,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "NIN VERIFICATION RETRIEVAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Unable to retrieve NIN verification.",

        debug:
          process.env.NODE_ENV ===
          "development"
            ? {
                message:
                  error?.message,

                code:
                  error?.code,

                meta:
                  error?.meta,
              }
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}