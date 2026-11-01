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

/**
 * Confirmed provider tariffs supplied for these exact service slugs.
 * Unknown services must be reconciled rather than assigned an invented cost.
 *
 * Environment variables can override a tariff:
 * AGEVERIFY_PROVIDER_COST_<SERVICE_SLUG_IN_UPPERCASE>
 * Example: AGEVERIFY_PROVIDER_COST_IPE_CLEARANCE=350
 */
const PROVIDER_COSTS: Record<string, number> = {
  personalization: 170,
  "ipe-clearance": 350,
  "bvn-crm": 1000,
  "bvn-retrieval": 1100,
  "modification-ipe": 1500,
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

function extractProviderCost(response: unknown): number | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const root = response as Record<string, any>;
  const nested = root.data && typeof root.data === "object" ? root.data : {};

  for (const candidate of [
    root.cost,
    root.cost_ngn,
    nested.cost,
    nested.cost_ngn,
  ]) {
    const value = toPositiveNumber(candidate);
    if (value !== null) return value;
  }

  const kobo =
    toPositiveNumber(root.cost_kobo) ?? toPositiveNumber(nested.cost_kobo);

  return kobo === null ? null : kobo / 100;
}

function getTariffFallback(service: string): number | null {
  const envKey = `AGEVERIFY_PROVIDER_COST_${service
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")}`;

  const configuredCost = toPositiveNumber(process.env[envKey]);

  return configuredCost ?? PROVIDER_COSTS[service] ?? null;
}

function publicResult(result: unknown) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return result;
  }

  const { status_check: _privateStatusCheck, ...safeResult } = result as Record<
    string,
    unknown
  >;

  return safeResult;
}

async function markChargeSuccess(reference: string) {
  const result = await prisma.transaction.updateMany({
    where: {
      reference: `CHARGE-${reference}`,
      provider: "AGEVERIFY",
      status: "PENDING",
    },
    data: {
      status: "SUCCESS",
    },
  });

  return result.count;
}

async function saveProviderCost(reference: string, providerCost: number) {
  const result = await prisma.transaction.updateMany({
    where: {
      reference: `CHARGE-${reference}`,
      provider: "AGEVERIFY",
    },
    data: {
      cost: providerCost,
    },
  });

  if (result.count !== 1) {
    throw new Error(
      `Could not save provider cost for AgeVerify reference ${reference}.`,
    );
  }
}

async function finalizeCompletedVerification(
  record: {
    id: string;
    reference: string;
    service: string;
  },
  providerResponse: unknown,
) {
  const charge = await prisma.transaction.findUnique({
    where: {
      reference: `CHARGE-${record.reference}`,
    },
  });

  if (!charge || charge.provider !== "AGEVERIFY") {
    throw new Error(
      `AgeVerify charge transaction not found for ${record.reference}.`,
    );
  }

  // Prefer a clearly identified provider deduction.
  const responseCost = extractProviderCost(providerResponse);

  // Use the saved transaction cost or confirmed tariff as fallback.
  const actualCost =
    responseCost ??
    toPositiveNumber(charge.cost) ??
    getTariffFallback(record.service);

  // Provider has confirmed completion: customer charge becomes SUCCESS.
  await markChargeSuccess(record.reference);

  if (actualCost === null) {
    return {
      revenueRecorded: false,
      providerCost: null,
      warning:
        "Verification completed. Provider cost is not confirmed for this service, so business revenue requires reconciliation.",
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
      service: record.service,
      error,
    });

    return {
      revenueRecorded: false,
      providerCost: actualCost,
      warning:
        "Verification completed, but business revenue recording requires reconciliation.",
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

    // Retry ledger finalization for an already completed verification.
    if (record.status === "COMPLETED") {
      const savedResult = record.result as Record<string, any> | null;

      const finalization = await finalizeCompletedVerification(
        record,
        savedResult?.status_check,
      );

      return NextResponse.json({
        reference: record.reference,
        status: record.status,
        result: publicResult(record.result),
        refunded: record.refunded,
        ...finalization,
      });
    }

    // Retry an idempotent refund for an already failed verification.
    if (record.status === "FAILED") {
      const refundResult = await refundAgeVerify(record.id);

      return NextResponse.json({
        reference: record.reference,
        status: record.status,
        result: publicResult(record.result),
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
        statusPayload = { reference: upstreamRef };
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
        statusPayload = { batch_id: upstreamRef };
        break;

      case "bvn-crm":
      case "bvn-retrieval":
        statusPayload = { reference: upstreamRef };
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
            response.body?.message || "Unable to retrieve verification status.",
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
      where: { id: record.id },
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

    if (newStatus === "COMPLETED") {
      const finalization = await finalizeCompletedVerification(
        updated,
        providerData,
      );

      return NextResponse.json({
        reference: updated.reference,
        status: updated.status,
        result: publicResult(updated.result),
        refunded: updated.refunded,
        ...finalization,
        message: response.body?.message,
      });
    }

    if (newStatus === "FAILED") {
      const refundResult = await refundAgeVerify(record.id);

      return NextResponse.json({
        reference: updated.reference,
        status: updated.status,
        result: publicResult(updated.result),
        refunded: refundResult.refunded || updated.refunded,
        message: response.body?.message,
      });
    }

    return NextResponse.json({
      reference: updated.reference,
      status: updated.status,
      result: publicResult(updated.result),
      refunded: updated.refunded,
      revenueRecorded: false,
      message:
        response.body?.message ??
        "Verification is still processing. Check again later.",
    });
  } catch (error) {
    console.error("AGEVERIFY STATUS ERROR:", error);

    return NextResponse.json(
      { error: "Unable to check verification status." },
      { status: 500 },
    );
  }
}
