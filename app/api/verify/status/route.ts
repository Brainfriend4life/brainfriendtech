import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { syncVerification } from "@/lib/ageverify-sync";
import { publicResult, documentPath } from "@/lib/ageverify-public";

// Customer-facing "Check Status" button. The real work is in
// lib/ageverify-sync.ts, which the cron route uses too.

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const reference = String(body?.reference ?? "").trim();

    if (!reference) {
      return NextResponse.json(
        { error: "Verification reference is required." },
        { status: 400 },
      );
    }

    // Customers can only check their own requests.
    const record = await prisma.identityVerification.findFirst({
      where: { reference, userId: user.id },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Verification record not found." },
        { status: 404 },
      );
    }

    const outcome = await syncVerification(record);

    if (outcome.action === "error" || outcome.action === "skipped") {
      return NextResponse.json(
        {
          error: outcome.message,
          reference,
          status: outcome.status,
        },
        { status: outcome.httpStatus ?? 502 },
      );
    }

    const fresh =
      (await prisma.identityVerification.findUnique({
        where: { id: record.id },
      })) ?? record;

    return NextResponse.json({
      reference: fresh.reference,
      status: fresh.status,
      result: publicResult(fresh.result),
      download_path: documentPath(fresh.id, fresh.result),
      refunded: fresh.refunded,
      message: outcome.message,
    });
  } catch (error) {
    console.error("AGEVERIFY STATUS ERROR:", error);

    return NextResponse.json(
      { error: "Unable to check verification status." },
      { status: 500 },
    );
  }
}
