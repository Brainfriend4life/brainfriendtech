import type { IdentityVerification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { av } from "@/lib/ageverify";
import { getAgeVerifyService } from "@/lib/ageverify-config";
import { getAgeVerifyPricing } from "@/lib/ageverify-pricing";
import {
  finalizeAgeVerifySuccess,
  refundAgeVerify,
} from "@/lib/ageverify-ledger";

// One implementation of "ask the provider for the final status and settle
// the request". Used by both the customer's Check Status button
// (app/api/verify/status) and the cron job (app/api/ageverify-sync).

const PROVIDER_PREFIX = "https://ageverify.com.ng/";

type StatusSpec = {
  file: string;
  method: "POST" | "GET";
  ids: (
    submitted: any,
    record: IdentityVerification,
  ) => Record<string, string | undefined>;
};

// Status endpoint and the ID each one needs. IDs come from the submission
// response saved when the request was made (result.data).
const STATUS: Record<string, StatusSpec> = {
  "nin-validation": {
    file: "nin_validation_status.php",
    method: "POST",
    ids: (d, r) => ({ reference: d.reference ?? r.upstreamRef ?? undefined }),
  },
  "nin-validation-v2": {
    file: "nin_validation_v2_status.php",
    method: "POST",
    ids: (d, r) => ({ batch_id: d.batch_id ?? r.upstreamRef ?? undefined }),
  },
  "bvn-crm": {
    file: "bvn_crm_status.php",
    method: "POST",
    ids: (d, r) => ({ reference: d.reference ?? r.upstreamRef ?? undefined }),
  },
  "modification-ipe": {
    file: "modification_ipe_status.php",
    method: "POST",
    ids: (d) => ({ tracking_id: d.tracking_id }),
  },
  "bvn-retrieval": {
    file: "bvn_retrieval_status.php",
    method: "POST",
    ids: (d, r) => ({ reference: d.reference ?? r.upstreamRef ?? undefined }),
  },
  "ipe-clearance": {
    file: "ipe_clearance_status.php",
    method: "POST",
    ids: (d, r) => ({ batch_id: d.batch_id ?? r.upstreamRef ?? undefined }),
  },
  "ipe-special": {
    file: "ipe_special_status.php",
    method: "GET",
    ids: (d) => ({ batch_id: d.batch_id }),
  },
  personalization: {
    file: "personalization_status.php",
    method: "POST",
    ids: (d, r) => ({
      tracking_id: d.tracking_id ?? r.upstreamRef ?? undefined,
    }),
  },
};

const COMPLETED = [
  "completed",
  "complete",
  "success",
  "successful",
  "approved",
  "cleared",
  "done",
  "verified",
];
const FAILED = [
  "failed",
  "failure",
  "rejected",
  "declined",
  "error",
  "cancelled",
];
const PENDING = [
  "pending",
  "processing",
  "queued",
  "submitted",
  "in_progress",
  "awaiting",
  "review",
  "new",
];

// NIN Validation V2 is non-refundable: a final "Failed" is still a charged,
// finished request.
const NO_REFUND = new Set(["nin-validation-v2"]);

// These services have several price tiers, so their cost cannot be guessed
// without the original request. The reconcile route handles them by amount.
const TIERED = new Set(["nin", "nin-phone", "bvn"]);

export type SyncOutcome = {
  action: "completed" | "failed" | "pending" | "skipped" | "error";
  status: string;
  refunded: boolean;
  revenueRecorded?: boolean;
  message?: string;
  warning?: string;
  httpStatus?: number;
};

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function hideProvider(message: unknown): string | undefined {
  if (typeof message !== "string" || !message.trim()) return undefined;
  return message.replace(/(age|amb)\s*verify/gi, "the verification service");
}

function readStatus(service: string, data: any): string {
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

function configuredCost(service: string): number | null {
  if (TIERED.has(service)) return null;

  try {
    return toPositiveNumber(
      getAgeVerifyPricing(service, {}, 0, false).providerCost,
    );
  } catch {
    return null;
  }
}

/** Provider confirmed completion: close the charge and record revenue. */
async function finalizeCompleted(record: IdentityVerification) {
  const charge = await prisma.transaction.findUnique({
    where: { reference: `CHARGE-${record.reference}` },
  });

  if (!charge || charge.provider !== "AGEVERIFY") {
    return {
      revenueRecorded: false,
      warning: "Charge transaction not found. Reconciliation required.",
    };
  }

  // The customer got the service: never leave the charge pending.
  await prisma.transaction.updateMany({
    where: {
      reference: `CHARGE-${record.reference}`,
      provider: "AGEVERIFY",
      status: "PENDING",
    },
    data: { status: "SUCCESS" },
  });

  const amount = Number(record.amount);
  const cost = toPositiveNumber(charge.cost) ?? configuredCost(record.service);

  if (cost === null || cost > amount) {
    return {
      revenueRecorded: false,
      warning:
        cost === null
          ? "Provider cost is missing in ENV. Revenue needs reconciliation."
          : "Provider cost is higher than the price paid. Revenue skipped.",
    };
  }

  await prisma.transaction.update({
    where: { reference: `CHARGE-${record.reference}` },
    data: { cost },
  });

  try {
    await finalizeAgeVerifySuccess(record.id);
    return { revenueRecorded: true };
  } catch (error) {
    console.error("AGEVERIFY LEDGER FINALIZATION ERROR:", {
      reference: record.reference,
      error,
    });

    return {
      revenueRecorded: false,
      warning: "Revenue recording failed. Reconciliation required.",
    };
  }
}

export async function syncVerification(
  record: IdentityVerification,
): Promise<SyncOutcome> {
  // Retry an idempotent refund for an already failed request.
  if (record.status === "FAILED") {
    const refund = await refundAgeVerify(record.id);

    return {
      action: "failed",
      status: "FAILED",
      refunded: refund.refunded || record.refunded,
    };
  }

  // Retry ledger finalization for an already completed request.
  if (record.status === "COMPLETED") {
    const finalization = await finalizeCompleted(record);

    return {
      action: "completed",
      status: "COMPLETED",
      refunded: record.refunded,
      ...finalization,
    };
  }

  const spec = STATUS[record.service];
  const svc = getAgeVerifyService(record.service);

  if (!spec || !svc) {
    return {
      action: "skipped",
      status: record.status,
      refunded: record.refunded,
      message: "Status checking is not available for this service.",
      httpStatus: 400,
    };
  }

  const saved = ((record.result as any) ?? {}) as Record<string, any>;
  const submitted = (saved.data ?? {}) as Record<string, any>;
  const ids = spec.ids(submitted, record);

  if (Object.values(ids).some((value) => !value)) {
    return {
      action: "skipped",
      status: record.status,
      refunded: record.refunded,
      message:
        "Provider reference is not available yet. Please contact support.",
      httpStatus: 409,
    };
  }

  // Same folder as the submit endpoint, different file.
  let path = String(svc.endpoint).replace(/[^/]+\.php(\?.*)?$/, spec.file);

  if (path === String(svc.endpoint)) {
    return {
      action: "skipped",
      status: record.status,
      refunded: record.refunded,
      message: "Status checking is not available for this service.",
      httpStatus: 400,
    };
  }

  // Personalization V2 status also returns the download_url for the slip.
  if (record.service === "personalization") {
    path = path.replace(/api\/v1\//, "api/v2/");
  }

  let response;

  try {
    if (spec.method === "GET") {
      path += `?${new URLSearchParams(ids as Record<string, string>).toString()}`;
      response = await av(path, { method: "GET" });
    } else {
      response = await av(path, { method: "POST", body: JSON.stringify(ids) });
    }
  } catch (error) {
    console.error("AGEVERIFY STATUS CONNECTION ERROR:", error);

    return {
      action: "error",
      status: record.status,
      refunded: record.refunded,
      message: "Unable to reach the verification service. Try again shortly.",
      httpStatus: 502,
    };
  }

  if (!response.ok || response.body?.status !== true) {
    return {
      action: "error",
      status: record.status,
      refunded: record.refunded,
      message:
        hideProvider(response.body?.message) ||
        "Unable to retrieve verification status.",
      httpStatus: response.status || 502,
    };
  }

  const providerData = response.body?.data ?? {};
  const providerStatus = readStatus(record.service, providerData);
  const isFailed = FAILED.includes(providerStatus);

  let newStatus = record.status;

  if (COMPLETED.includes(providerStatus)) {
    newStatus = "COMPLETED";
  } else if (isFailed) {
    newStatus = NO_REFUND.has(record.service) ? "COMPLETED" : "FAILED";
  } else if (PENDING.includes(providerStatus)) {
    newStatus = "PROCESSING";
  }

  const pdfUrl =
    typeof providerData.pdf_url === "string" &&
    providerData.pdf_url.startsWith(PROVIDER_PREFIX)
      ? providerData.pdf_url
      : null;

  const downloadUrl =
    typeof providerData.download_url === "string" &&
    providerData.download_url.startsWith(PROVIDER_PREFIX)
      ? providerData.download_url
      : null;

  const updated = await prisma.identityVerification.update({
    where: { id: record.id },
    data: {
      status: newStatus,
      result: {
        ...saved,
        status_check: providerData,
        ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
        ...(downloadUrl ? { download_url: downloadUrl } : {}),
      },
    },
  });

  if (newStatus === "COMPLETED") {
    const finalization = await finalizeCompleted(updated);

    return {
      action: "completed",
      status: "COMPLETED",
      refunded: updated.refunded,
      message: hideProvider(response.body?.message),
      ...finalization,
    };
  }

  if (newStatus === "FAILED") {
    const refund = await refundAgeVerify(record.id);

    return {
      action: "failed",
      status: "FAILED",
      refunded: refund.refunded || updated.refunded,
      message: hideProvider(response.body?.message),
    };
  }

  return {
    action: "pending",
    status: updated.status,
    refunded: updated.refunded,
    message: "Verification is still processing. Check again later.",
  };
}
