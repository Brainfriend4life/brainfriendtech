import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { av } from "@/lib/ageverify";
import { getAgeVerifyService } from "@/lib/ageverify-config";
import { getAgeVerifyPricing } from "@/lib/ageverify-pricing";
import {
  finalizeAgeVerifySuccess,
  refundAgeVerify,
} from "@/lib/ageverify-ledger";

// Completes or refunds the manual / queued services (NIN validation, BVN CRM,
// modification IPE, BVN retrieval, IPE special, personalization) by asking
// the provider for the final status.
//
// Call it every 5-10 minutes from a free cron service (cron-job.org):
//   /api/ageverify-sync?secret=YOUR_CRON_SECRET
// (or send the header x-cron-secret).

type StatusSpec = {
  file: string;
  method: "POST" | "GET";
  ids: (d: any) => Record<string, string | undefined>;
};

// Status endpoint and the ID each one needs, taken from the submission
// response that was saved when the request was made.
const STATUS: Record<string, StatusSpec> = {
  "nin-validation": {
    file: "nin_validation_status.php",
    method: "POST",
    ids: (d) => ({ reference: d.reference }),
  },
  "nin-validation-v2": {
    file: "nin_validation_v2_status.php",
    method: "POST",
    ids: (d) => ({ batch_id: d.batch_id }),
  },
  "bvn-crm": {
    file: "bvn_crm_status.php",
    method: "POST",
    ids: (d) => ({ reference: d.reference }),
  },
  "modification-ipe": {
    file: "modification_ipe_status.php",
    method: "POST",
    ids: (d) => ({ tracking_id: d.tracking_id }),
  },
  "bvn-retrieval": {
    file: "bvn_retrieval_status.php",
    method: "POST",
    ids: (d) => ({ reference: d.reference }),
  },
  "ipe-clearance": {
    file: "ipe_clearance_status.php",
    method: "POST",
    ids: (d) => ({ batch_id: d.batch_id }),
  },
  "ipe-special": {
    file: "ipe_special_status.php",
    method: "GET",
    ids: (d) => ({ batch_id: d.batch_id }),
  },
  personalization: {
    file: "personalization_status.php",
    method: "POST",
    ids: (d) => ({ tracking_id: d.tracking_id }),
  },
};

const DONE = [
  "completed",
  "complete",
  "successful",
  "success",
  "approved",
  "done",
];
const FAILED = ["failed", "failure", "rejected", "declined", "cancelled"];

// NIN Validation V2 is non-refundable: a final "Failed" is still charged.
const NO_REFUND = new Set(["nin-validation-v2"]);

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function readStatus(service: string, body: any): string {
  const data = body?.data ?? {};

  if (service === "nin-validation-v2") {
    return String(
      data.batch_status ?? data.requests?.[0]?.status ?? "",
    ).toLowerCase();
  }

  if (Array.isArray(data.requests) && data.requests[0]) {
    return String(data.requests[0].status ?? "").toLowerCase();
  }

  return String(data.status ?? "").toLowerCase();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret =
    url.searchParams.get("secret") ?? req.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const results: Array<Record<string, unknown>> = [];

  const pending = await prisma.identityVerification.findMany({
    where: { status: "PROCESSING" },
    take: 200,
  });

  for (const v of pending) {
    try {
      const spec = STATUS[v.service];

      if (!spec) {
        results.push({
          reference: v.reference,
          action: "no status endpoint for service",
        });
        continue;
      }

      const svc = getAgeVerifyService(v.service);

      if (!svc) {
        results.push({ reference: v.reference, action: "service not found" });
        continue;
      }

      const submitted = ((v.result as any)?.data ?? {}) as any;
      const ids = spec.ids(submitted);
      const missing = Object.entries(ids).filter(([, value]) => !value);

      if (missing.length > 0) {
        results.push({
          reference: v.reference,
          action: "provider id missing in saved response",
          missing: missing.map(([key]) => key),
        });
        continue;
      }

      // Same folder as the submit endpoint, different file.
      let path = String(svc.endpoint).replace(/[^/]+\.php(\?.*)?$/, spec.file);

      if (path === String(svc.endpoint)) {
        results.push({
          reference: v.reference,
          action: "could not build status URL",
        });
        continue;
      }

      let res: any;

      // Personalization V2 status also returns the download_url for the slip.
      if (v.service === "personalization") {
        path = path.replace(/api\/v1\//, "api/v2/");
      }

      if (spec.method === "GET") {
        path += `?${new URLSearchParams(ids as Record<string, string>).toString()}`;
        res = await av(path, { method: "GET" });
      } else {
        res = await av(path, { method: "POST", body: JSON.stringify(ids) });
      }

      const body = res?.body ?? {};
      let status = readStatus(v.service, body);

      // V2 validation: a final Failed is still a completed, charged request.
      const isFailed = FAILED.includes(status);
      const treatAsDone =
        DONE.includes(status) || (isFailed && NO_REFUND.has(v.service));

      if (isFailed && !NO_REFUND.has(v.service)) {
        await prisma.identityVerification.update({
          where: { id: v.id },
          data: { status: "FAILED", result: body },
        });

        await refundAgeVerify(v.id);
        results.push({
          reference: v.reference,
          action: "failed, refunded",
          status,
        });
        continue;
      }

      if (!treatAsDone) {
        results.push({
          reference: v.reference,
          action: "still pending",
          status,
        });
        continue;
      }

      await prisma.identityVerification.update({
        where: { id: v.id },
        data: { status: "COMPLETED", result: body?.data ?? body },
      });

      let cost: number | null = null;
      try {
        cost = toPositiveNumber(
          getAgeVerifyPricing(v.service, {}, 0, false).providerCost,
        );
      } catch {
        cost = null;
      }

      const amount = Number(v.amount);

      if (cost !== null && cost <= amount) {
        await prisma.transaction.update({
          where: { reference: `CHARGE-${v.reference}` },
          data: { cost },
        });

        await finalizeAgeVerifySuccess(v.id);
        results.push({
          reference: v.reference,
          action: "completed, revenue recorded",
          status,
        });
      } else {
        await prisma.transaction.updateMany({
          where: { reference: `CHARGE-${v.reference}`, status: "PENDING" },
          data: { status: "SUCCESS" },
        });

        results.push({
          reference: v.reference,
          action: "completed, revenue skipped",
          reason:
            cost === null
              ? "provider cost missing or 0 in ENV"
              : "cost is higher than the price paid",
        });
      }
    } catch (error: any) {
      console.error("AGEVERIFY SYNC ERROR:", v.reference, error);
      results.push({
        reference: v.reference,
        action: "error",
        message: error?.message ?? String(error),
      });
    }
  }

  return NextResponse.json({ checked: pending.length, results });
}
