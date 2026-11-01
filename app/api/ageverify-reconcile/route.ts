import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizeAgeVerifySuccess } from "@/lib/ageverify-ledger";

// Protect this route: set CRON_SECRET in your .env and call it with
//   /api/ageverify-reconcile?secret=YOUR_CRON_SECRET
// (or send the header x-cron-secret).

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function costKey(service: string) {
  return `AGEVERIFY_${service.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_COST`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ?? req.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const results: Array<Record<string, unknown>> = [];

  const verifications = await prisma.identityVerification.findMany({
    where: { status: "COMPLETED" },
    take: 500,
  });

  for (const v of verifications) {
    const chargeRef = `CHARGE-${v.reference}`;

    try {
      const tx = await prisma.transaction.findUnique({
        where: { reference: chargeRef },
      });

      if (!tx) {
        results.push({
          reference: v.reference,
          action: "no charge transaction",
        });
        continue;
      }

      const existingRevenue = await prisma.businessRevenue.findUnique({
        where: { transactionId: tx.id },
      });

      // Revenue already recorded: just make sure the status is not pending.
      if (existingRevenue) {
        if (tx.status === "PENDING") {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { status: "SUCCESS" },
          });
          results.push({ reference: v.reference, action: "status fixed" });
        }
        continue;
      }

      const amount = Number(v.amount);
      const cost = toPositiveNumber(process.env[costKey(v.service)]);

      if (cost === null || cost > amount) {
        // Cannot record revenue, but never leave the customer's charge pending.
        if (tx.status === "PENDING") {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { status: "SUCCESS" },
          });
        }
        results.push({
          reference: v.reference,
          action: "skipped revenue",
          reason:
            cost === null
              ? `missing ENV ${costKey(v.service)}`
              : "cost is higher than price",
        });
        continue;
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: { cost },
      });

      const out = await finalizeAgeVerifySuccess(v.id);
      results.push({ reference: v.reference, action: "revenue recorded", out });
    } catch (error: any) {
      console.error("AGEVERIFY RECONCILE ERROR:", v.reference, error);
      results.push({
        reference: v.reference,
        action: "error",
        message: error?.message ?? String(error),
      });
    }
  }

  return NextResponse.json({ checked: verifications.length, results });
}
