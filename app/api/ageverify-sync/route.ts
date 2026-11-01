import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncVerification } from "@/lib/ageverify-sync";

// Cron entry point: settles every request still waiting on the provider
// (NIN validation, V2, BVN CRM, modification IPE, BVN retrieval,
// IPE clearance, IPE special, personalization).
//
// Call it every 5-10 minutes from a free cron service (cron-job.org):
//   /api/ageverify-sync?secret=YOUR_CRON_SECRET
// (or send the header x-cron-secret).

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ?? req.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const pending = await prisma.identityVerification.findMany({
    where: { status: "PROCESSING" },
    take: 200,
  });

  const results: Array<Record<string, unknown>> = [];

  for (const record of pending) {
    try {
      const outcome = await syncVerification(record);

      results.push({
        reference: record.reference,
        service: record.service,
        action: outcome.action,
        status: outcome.status,
        revenueRecorded: outcome.revenueRecorded,
        note: outcome.message ?? outcome.warning,
      });
    } catch (error: any) {
      console.error("AGEVERIFY SYNC ERROR:", record.reference, error);

      results.push({
        reference: record.reference,
        action: "error",
        message: error?.message ?? String(error),
      });
    }
  }

  return NextResponse.json({ checked: pending.length, results });
}
