import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hasDocumentUrl, resultText } from "@/lib/ageverify-public";

export const dynamic = "force-dynamic";

// Never send the provider's name to the browser.
function cleanName(value: string): string {
  return value.replace(/age\s*verify\s*/gi, "").trim();
}

// Saved results can be large (identity data, photos), so only the most
// recent records are read each time.
const VERIFICATION_LIMIT = 30;
const DOWNLOAD_LIMIT = 20;

export async function GET() {
  const started = Date.now();

  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const [verifications, downloads] = await Promise.all([
      prisma.identityVerification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: VERIFICATION_LIMIT,
        select: {
          id: true,
          service: true,
          reference: true,
          amount: true,
          status: true,
          refunded: true,
          createdAt: true,
          result: true,
        },
      }),

      prisma.transaction.findMany({
        where: {
          userId: user.id,
          provider: "AGEVERIFY",
          type: "NIN",
          description: {
            contains: "purchase",
          },
        },
        orderBy: { createdAt: "desc" },
        take: DOWNLOAD_LIMIT,
        select: {
          id: true,
          reference: true,
          amount: true,
          description: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // The raw saved result holds provider links, wallet balance and cost, so
    // it never leaves the server. The page only gets what it needs to show.
    const verificationRecords = verifications.map(({ result, ...record }) => {
      const finished = ["COMPLETED", "SUCCESS"].includes(
        record.status.toUpperCase(),
      );

      return {
        ...record,
        hasDocument: finished && hasDocumentUrl(result),
        resultText: finished ? resultText(result) : null,
        recordType: "verification",
      };
    });

    const downloadRecords = downloads.map((record) => ({
      id: record.id,
      service: cleanName(record.description.split(" purchase ")[0]),
      reference: record.reference,
      amount: record.amount,
      status: record.status,
      refunded: record.status === "FAILED",
      createdAt: record.createdAt,
      hasDocument: false,
      resultText: null,
      recordType: "document-download",
    }));

    const records = [...verificationRecords, ...downloadRecords]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, VERIFICATION_LIMIT);

    console.log("VERIFICATION HISTORY MS:", Date.now() - started);

    return NextResponse.json({ records });
  } catch (error) {
    console.error("VERIFICATION HISTORY ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load verification history." },
      { status: 500 },
    );
  }
}
