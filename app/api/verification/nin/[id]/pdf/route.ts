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
        { status: 401 }
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NIN verification ID is required.",
        },
        { status: 400 }
      );
    }

    const verification =
      await prisma.ninVerification.findFirst({
        where: {
          id,
          userId:
            session.user.id,
        },

        select: {
          id: true,
          reference: true,
          status: true,
          hasPdf: true,
          pdfBase64: true,
        },
      });

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NIN verification was not found.",
          verificationId: id,
        },
        { status: 404 }
      );
    }

    console.log(
      "NIN PDF RECORD:",
      {
        id:
          verification.id,

        reference:
          verification.reference,

        hasPdf:
          verification.hasPdf,

        pdfExists:
          Boolean(
            verification.pdfBase64
          ),

        pdfLength:
          verification.pdfBase64
            ?.length || 0,
      }
    );

    if (
      !verification.pdfBase64
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "The NIN was verified, but the PDF was not returned by the provider, so there is no PDF to display.",

          hasPdf:
            verification.hasPdf,

          reference:
            verification.reference,

          verificationId:
            verification.id,
        },
        { status: 404 }
      );
    }

    let pdfValue =
      verification.pdfBase64.trim();

    if (
      pdfValue.startsWith(
        "http://"
      ) ||
      pdfValue.startsWith(
        "https://"
      )
    ) {
      return NextResponse.redirect(
        pdfValue
      );
    }

    if (
      pdfValue.startsWith(
        "data:"
      )
    ) {
      const comma =
        pdfValue.indexOf(",");

      if (comma !== -1) {
        pdfValue =
          pdfValue.substring(
            comma + 1
          );
      }
    }

    pdfValue =
      pdfValue.replace(
        /\s/g,
        ""
      );

    let pdfBuffer: Buffer;

    try {
      pdfBuffer =
        Buffer.from(
          pdfValue,
          "base64"
        );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to decode the stored NIN PDF.",
        },
        { status: 500 }
      );
    }

    if (
      !pdfBuffer ||
      pdfBuffer.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The stored NIN PDF is empty.",
        },
        { status: 404 }
      );
    }

    const header =
      pdfBuffer
        .subarray(0, 5)
        .toString("ascii");

    if (
      header !== "%PDF-"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The stored NIN document is not a valid PDF.",
          header,
          size:
            pdfBuffer.length,
        },
        { status: 500 }
      );
    }

    const safeReference =
      String(
        verification.reference ||
          verification.id
      ).replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );

    const filename =
      `NIN-${safeReference}.pdf`;

    return new NextResponse(
      new Uint8Array(
        pdfBuffer
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="${filename}"`,

          "Content-Length":
            String(
              pdfBuffer.length
            ),

          "Cache-Control":
            "private, no-store, max-age=0",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "NIN PDF ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to retrieve NIN document.",
        debug:
          process.env.NODE_ENV ===
          "development"
            ? error?.message
            : undefined,
      },
      { status: 500 }
    );
  }
}