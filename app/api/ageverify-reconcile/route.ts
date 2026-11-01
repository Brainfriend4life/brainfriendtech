import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizeAgeVerifySuccess } from "@/lib/ageverify-ledger";
import { getAgeVerifyPricing } from "@/lib/ageverify-pricing";

// Protect this route: set CRON_SECRET in your .env and call it with
//   /api/ageverify-reconcile?secret=YOUR_CRON_SECRET
// (or send the header x-cron-secret).

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * Old rows do not store the payload, so find the tier whose current selling
 * price equals the amount the customer paid, and use that tier's cost.
 */
function findCost(service: string, amount: number) {
  const payloads: any[] =
    service === "nin" || service === "bvn" || service === "nin-phone"
      ? [
          { slip_type: "regular" },
          { slip_type: "standard" },
          { slip_type: "premium" },
        ]
      : [{}];

  const errors: string[] = [];

  for (const payload of payloads) {
    try {
      const p = getAgeVerifyPricing(service, payload, 0, false);
      if (p.sellingPrice === amount) {
        return {
          cost: toPositiveNumber(p.providerCost),
          key: p.priceKey as string | null,
          errors,
        };
      }
      errors.push(`${p.priceKey} price is ${p.sellingPrice}, not ${amount}`);
    } catch (e: any) {
      errors.push(e?.message ?? String(e));
    }
  }

  return { cost: null as number | null, key: null as string | null, errors };
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
      const { cost, key, errors } = findCost(v.service, amount);

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
            key === null
              ? `no usable tier for amount ${amount}: ${errors.join(" | ")}`
              : cost === null
                ? `cost for ${key} is missing or 0`
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
