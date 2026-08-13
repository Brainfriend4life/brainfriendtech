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
    // ADMIN AUTHENTICATION
    // =========================================================

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

    // =========================================================
    // GET ID
    // =========================================================

    const { id } = await context.params;

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

    console.log(
      "========== ADMIN NIN PDF REQUEST =========="
    );

    console.log({
      verificationId: id,
      adminId: session.user.id,
    });

    // =========================================================
    // FIND VERIFICATION (NO userId RESTRICTION - ADMIN CAN
    // VIEW ANY USER'S NIN PDF)
    // =========================================================

    const verification =
      await prisma.ninVerification.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          reference: true,
          status: true,
          hasPdf: true,
          pdfBase64: true,
          userId: true,
        },
      });

    // =========================================================
    // NOT FOUND
    // =========================================================

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NIN verification not found.",
        },
        { status: 404 }
      );
    }

    // =========================================================
    // CHECK STORED PDF
    // =========================================================

    if (
      !verification.pdfBase64 ||
      !verification.pdfBase64.trim()
    ) {
      console.error(
        "ADMIN NIN PDF IS NOT STORED:",
        {
          verificationId: verification.id,
          reference: verification.reference,
          databaseHasPdf: verification.hasPdf,
          pdfExists: Boolean(
            verification.pdfBase64
          ),
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The NIN PDF was not stored for this verification.",
          hasPdf: false,
          reference: verification.reference,
          verificationId: verification.id,
        },
        { status: 404 }
      );
    }

    // =========================================================
    // GET STORED VALUE
    // =========================================================

    let pdfValue = verification.pdfBase64.trim();

    // =========================================================
    // PDF URL
    // =========================================================

    if (
      pdfValue.startsWith("https://") ||
      pdfValue.startsWith("http://")
    ) {
      console.log(
        "ADMIN NIN PDF IS A URL:",
        pdfValue
      );

      return NextResponse.redirect(pdfValue);
    }

    // =========================================================
    // REMOVE DATA URL PREFIX
    // =========================================================

    if (pdfValue.startsWith("data:")) {
      const commaIndex = pdfValue.indexOf(",");

      if (commaIndex !== -1) {
        pdfValue = pdfValue.substring(
          commaIndex + 1
        );
      }
    }

    // =========================================================
    // REMOVE OTHER PREFIXES
    // =========================================================

    if (pdfValue.includes(",")) {
      const commaIndex = pdfValue.indexOf(",");

      const header = pdfValue
        .substring(0, commaIndex)
        .toLowerCase();

      if (
        header.includes("base64") ||
        header.includes("application/pdf")
      ) {
        pdfValue = pdfValue.substring(
          commaIndex + 1
        );
      }
    }

    // =========================================================
    // CLEAN BASE64
    // =========================================================

    pdfValue = pdfValue.replace(/\s/g, "");

    if (!pdfValue) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The stored NIN PDF is empty.",
          reference: verification.reference,
        },
        { status: 404 }
      );
    }

    // =========================================================
    // DECODE
    // =========================================================

    let pdfBuffer: Buffer;

    try {
      pdfBuffer = Buffer.from(
        pdfValue,
        "base64"
      );
    } catch (error) {
      console.error(
        "ADMIN NIN PDF DECODE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to decode the NIN PDF.",
        },
        { status: 500 }
      );
    }

    // =========================================================
    // EMPTY PDF
    // =========================================================

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The NIN PDF document is empty.",
        },
        { status: 404 }
      );
    }

    // =========================================================
    // VALIDATE PDF
    // =========================================================

    const pdfHeader = pdfBuffer
      .subarray(0, 5)
      .toString("ascii");

    console.log("ADMIN NIN PDF:", {
      reference: verification.reference,
      size: pdfBuffer.length,
      header: pdfHeader,
    });

    if (pdfHeader !== "%PDF-") {
      console.error(
        "ADMIN: INVALID PDF DATA:",
        {
          reference: verification.reference,
          header: pdfHeader,
          size: pdfBuffer.length,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The stored NIN document is not a valid PDF.",
          header: pdfHeader,
          size: pdfBuffer.length,
          reference: verification.reference,
        },
        { status: 500 }
      );
    }

    // =========================================================
    // FILENAME
    // =========================================================

    const safeReference = String(
      verification.reference ||
        verification.id
    ).replace(/[^a-zA-Z0-9_-]/g, "-");

    const filename = `NIN-${safeReference}.pdf`;

    // =========================================================
    // RETURN PDF
    // =========================================================

    console.log("ADMIN NIN PDF RETURNING:", {
      filename,
      size: pdfBuffer.length,
    });

    return new NextResponse(
      new Uint8Array(pdfBuffer),
      {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Content-Length": String(
            pdfBuffer.length
          ),
          "Cache-Control":
            "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "========== ADMIN NIN PDF ERROR =========="
    );

    console.error("ERROR:", error);
    console.error("MESSAGE:", error?.message);
    console.error("CODE:", error?.code);
    console.error("META:", error?.meta);

    console.error(
      "==================================="
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to retrieve NIN document.",
        debug:
          process.env.NODE_ENV === "development"
            ? {
                message: error?.message,
                code: error?.code,
                meta: error?.meta,
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}