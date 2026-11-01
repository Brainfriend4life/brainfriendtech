import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { av } from "@/lib/ageverify";
import {
  finalizeAgeVerifySuccess,
  refundAgeVerify,
} from "@/lib/ageverify-ledger";

const STATUS_ENDPOINTS: Record<string, string> = {
  "nin-validation": "api/v1/nin_validation_status.php",
  "nin-validation-v2": "api/v1/nin_validation_v2_status.php",
  personalization: "api/v2/personalization_status.php",
  "ipe-clearance": "api/v1/ipe_clearance_status.php",
  "bvn-crm": "api/v1/bvn_crm_status.php",
  "modification-ipe": "api/v1/modification_ipe_status.php",
  "bvn-retrieval": "api/v1/bvn_retrieval_status.php",
  "ipe-special": "api/v1/ipe_special_status.php",
};

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

/**
 * Extract the actual provider deduction.
 * Kobo values are converted to naira.
 * Never use the customer's selling price as provider cost.
 */
function extractProviderCost(response: unknown): number | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const root = response as Record<string, any>;
  const nested = root.data && typeof root.data === "object" ? root.data : {};

  const candidates = [
    root.cost,
    root.amount,
    root.price,
    root.cost_ngn,
    nested.cost,
    nested.amount,
    nested.price,
    nested.cost_ngn,
  ];

  for (const candidate of candidates) {
    const value = toPositiveNumber(candidate);

    if (value !== null) {
      return value;
    }
  }

  const kobo =
    toPositiveNumber(root.cost_kobo) ?? toPositiveNumber(nested.cost_kobo);

  return kobo === null ? null : kobo / 100;
}

/**
 * Mark the customer charge successful after provider-confirmed
 * completion. This does not itself create business revenue.
 */
async function markChargeSuccess(reference: string) {
  await prisma.transaction.updateMany({
    where: {
      reference: `CHARGE-${reference}`,
      status: "PENDING",
    },
    data: {
      status: "SUCCESS",
    },
  });
}

/**
 * Save provider cost before calling the business ledger.
 */
async function saveProviderCost(reference: string, providerCost: number) {
  await prisma.transaction.updateMany({
    where: {
      reference: `CHARGE-${reference}`,
      provider: "AGEVERIFY",
    },
    data: {
      cost: providerCost,
    },
  });
}

/**
 * Finalize a completed verification.
 *
 * If the provider did not return its deduction, do not invent
 * a cost or record inaccurate business revenue.
 */
async function finalizeCompletedVerification(
  record: {
    id: string;
    reference: string;
    amount: any;
  },
  providerCost: number | null,
) {
  const charge = await prisma.transaction.findUnique({
    where: {
      reference: `CHARGE-${record.reference}`,
    },
  });

  const actualCost =
    providerCost ?? (charge ? toPositiveNumber(charge.cost) : null);

  // The verification is complete, so the customer's charge
  // should no longer remain pending.
  await markChargeSuccess(record.reference);

  if (actualCost === null) {
    return {
      revenueRecorded: false,
      providerCost: null,
      warning:
        "Verification completed, but the actual provider deduction is unavailable. Business revenue requires cost reconciliation.",
    };
  }

  await saveProviderCost(record.reference, actualCost);

  try {
    const ledger = await finalizeAgeVerifySuccess(record.id);

    return {
      revenueRecorded: true,
      providerCost: actualCost,
      ledger,
    };
  } catch (error) {
    console.error("AGEVERIFY LEDGER FINALIZATION ERROR:", {
      reference: record.reference,
      providerCost: actualCost,
      error,
    });

    return {
      revenueRecorded: false,
      providerCost: actualCost,
      warning:
        "Verification completed, but business revenue recording needs reconciliation.",
    };
  }
}

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

    const record = await prisma.identityVerification.findFirst({
      where: {
        reference,
        userId: user.id,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Verification record not found." },
        { status: 404 },
      );
    }

    /**
     * Already completed:
     * Retry business-ledger finalization safely.
     */
    if (record.status === "COMPLETED") {
      const savedResult = record.result as Record<string, any> | null;

      const savedStatusResponse = savedResult?.status_check;

      const savedProviderCost = extractProviderCost(savedStatusResponse);

      const finalization = await finalizeCompletedVerification(
        record,
        savedProviderCost,
      );

      return NextResponse.json({
        reference: record.reference,
        status: record.status,
        result: record.result,
        refunded: record.refunded,
        ...finalization,
      });
    }

    /**
     * Already failed:
     * Retry the existing idempotent refund process.
     */
    if (record.status === "FAILED") {
      const refundResult = await refundAgeVerify(record.id);

      return NextResponse.json({
        reference: record.reference,
        status: record.status,
        result: record.result,
        refunded: refundResult.refunded || record.refunded,
      });
    }

    const endpoint = STATUS_ENDPOINTS[record.service];

    if (!endpoint) {
      return NextResponse.json(
        {
          error: "Status checking is not available for this service.",
          reference,
          status: record.status,
        },
        { status: 400 },
      );
    }

    const savedResult = record.result as Record<string, any> | null;

    const upstreamRef = record.upstreamRef;

    if (!upstreamRef) {
      return NextResponse.json(
        {
          error:
            "Provider reference is not available yet. Please contact support.",
          reference,
          status: record.status,
        },
        { status: 409 },
      );
    }

    let statusPayload: Record<string, any> = {};
    let method = "POST";
    let statusEndpoint = endpoint;

    switch (record.service) {
      case "nin-validation":
        statusPayload = {
          reference: upstreamRef,
        };
        break;

      case "nin-validation-v2":
        statusPayload = {
          batch_id: upstreamRef,
          ...(savedResult?.nin ? { nin: savedResult.nin } : {}),
        };
        break;

      case "personalization":
        statusPayload = {
          tracking_id: savedResult?.tracking_id ?? upstreamRef,
        };
        break;

      case "ipe-clearance":
        statusPayload = {
          batch_id: upstreamRef,
        };
        break;

      case "bvn-crm":
      case "bvn-retrieval":
        statusPayload = {
          reference: upstreamRef,
        };
        break;

      case "modification-ipe":
        statusPayload = {
          tracking_id: savedResult?.tracking_id ?? upstreamRef,
        };
        break;

      case "ipe-special":
        method = "GET";
        statusEndpoint += `?batch_id=${encodeURIComponent(upstreamRef)}`;
        break;
    }

    const response = await av(statusEndpoint, {
      method,
      ...(method === "POST" ? { body: JSON.stringify(statusPayload) } : {}),
    });

    if (!response.ok || response.body?.status !== true) {
      return NextResponse.json(
        {
          error:
            response.body?.message || "Unable to retrieve provider status.",
          reference,
          status: record.status,
        },
        { status: response.status || 502 },
      );
    }

    const providerData = response.body?.data ?? {};

    const providerStatus = String(providerData.status ?? "").toLowerCase();

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "approved",
      "cleared",
      "done",
      "verified",
    ];

    const failedStatuses = [
      "failed",
      "failure",
      "rejected",
      "declined",
      "error",
    ];

    const pendingStatuses = [
      "pending",
      "processing",
      "queued",
      "submitted",
      "in_progress",
      "awaiting",
      "review",
      "new",
    ];

    let newStatus = record.status;

    if (completedStatuses.includes(providerStatus)) {
      newStatus = "COMPLETED";
    } else if (failedStatuses.includes(providerStatus)) {
      newStatus = "FAILED";
    } else if (pendingStatuses.includes(providerStatus)) {
      newStatus = "PROCESSING";
    }

    const pdfUrl =
      typeof providerData.pdf_url === "string" &&
      providerData.pdf_url.startsWith("https://ageverify.com.ng/")
        ? providerData.pdf_url
        : null;

    const downloadUrl =
      typeof providerData.download_url === "string" &&
      providerData.download_url.startsWith("https://ageverify.com.ng/")
        ? providerData.download_url
        : null;

    const updated = await prisma.identityVerification.update({
      where: {
        id: record.id,
      },
      data: {
        status: newStatus,
        result: {
          ...(savedResult ?? {}),
          status_check: providerData,
          ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
          ...(downloadUrl ? { download_url: downloadUrl } : {}),
        },
      },
    });

    /**
     * Provider confirms completion:
     * save actual provider cost, finalize revenue,
     * and mark the customer charge successful.
     */
    if (newStatus === "COMPLETED") {
      const providerCost =
        extractProviderCost(providerData) ?? extractProviderCost(response.body);

      const finalization = await finalizeCompletedVerification(
        updated,
        providerCost,
      );

      return NextResponse.json({
        reference: updated.reference,
        status: updated.status,
        result: updated.result,
        refunded: updated.refunded,
        ...finalization,
        message: response.body?.message,
      });
    }

    /**
     * Provider confirms failure:
     * refund the customer using the existing refund function.
     */
    if (newStatus === "FAILED") {
      const refundResult = await refundAgeVerify(record.id);

      return NextResponse.json({
        reference: updated.reference,
        status: updated.status,
        result: updated.result,
        refunded: refundResult.refunded || updated.refunded,
        message: response.body?.message,
      });
    }

    /**
     * Still pending:
     * leave the charge pending and do not record revenue.
     */
    return NextResponse.json({
      reference: updated.reference,
      status: updated.status,
      result: updated.result,
      refunded: updated.refunded,
      revenueRecorded: false,
      message:
        response.body?.message ??
        "Verification is still processing. Check again later.",
    });
  } catch (error) {
    console.error("AGEVERIFY STATUS ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to check verification status.",
      },
      { status: 500 },
    );
  }
}
