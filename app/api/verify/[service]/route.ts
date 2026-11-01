
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getAgeVerifyService } from "@/lib/ageverify-config";
import { av } from "@/lib/ageverify";
import { verifyUserTransactionPin } from "@/lib/security/verifyUserTransactionPin";
import { getAgeVerifyPricing } from "@/lib/ageverify-pricing";
import { publicResult, documentPath } from "@/lib/ageverify-public";
import {
  finalizeAgeVerifySuccess,
  refundAgeVerify,
} from "@/lib/ageverify-ledger";

const TX_SUCCESS_STATUS = "SUCCESS";

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Extract provider deduction in naira.
 * The customer's selling price is never used as provider cost.
 */
function extractProviderCost(response: unknown): number | null {
  if (!response || typeof response !== "object") return null;

  const root = response as Record<string, any>;
  const nested =
    root.data && typeof root.data === "object" ? root.data : {};

  const nairaCandidates = [
    root.cost,
    root.amount,
    root.price,
    root.cost_ngn,
    root.amount_charged,
    nested.amount_charged,
    nested.cost,
    nested.amount,
    nested.price,
    nested.cost_ngn,
  ];

  for (const candidate of nairaCandidates) {
    const value = toPositiveNumber(candidate);
    if (value !== null) return value;
  }

  const kobo =
    toPositiveNumber(root.cost_kobo) ??
    toPositiveNumber(nested.cost_kobo);

  return kobo === null ? null : kobo / 100;
}

function hideProvider(message: unknown): string | null {
  if (typeof message !== "string" || !message.trim()) return null;

  return message.replace(
    /(age|amb)\s*verify/gi,
    "the verification service",
  );
}

/**
 * Only updates the original AgeVerify charge.
 */
async function markChargeTransactionSuccess(reference: string) {
  try {
    await prisma.transaction.updateMany({
      where: {
        reference: `CHARGE-${reference}`,
        provider: "AGEVERIFY",
        status: "PENDING",
      },
      data: {
        status: TX_SUCCESS_STATUS,
      },
    });
  } catch (error) {
    console.error("AGEVERIFY TX STATUS UPDATE ERROR:", {
      reference,
      error,
    });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ service: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in first." },
        { status: 401 },
      );
    }

    const { service } = await params;
    const svc = getAgeVerifyService(service);

    if (!svc) {
      return NextResponse.json(
        { error: "Verification service unavailable." },
        { status: 404 },
      );
    }

    let payload: any = null;
    let pinValue = "";
    let screenshot: File | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData().catch(() => null);

      if (form) {
        try {
          payload = JSON.parse(String(form.get("payload") ?? ""));
        } catch {
          payload = null;
        }

        pinValue = String(form.get("pin") ?? "");

        const upload = form.get("enrollment_screenshot");

        if (upload && typeof upload !== "string") {
          screenshot = upload as File;
        }
      }
    } else {
      const body = await req.json().catch(() => null);
      payload = body?.payload;
      pinValue = String(body?.pin ?? "");
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.keys(payload).length === 0
    ) {
      return NextResponse.json(
        {
          error: "A valid payload object is required.",
          example: { payload: { nin: "YOUR_NIN" } },
        },
        { status: 400 },
      );
    }

    if (service === "bvn-crm") {
      if (!screenshot) {
        return NextResponse.json(
          { error: "Please attach the enrollment screenshot." },
          { status: 400 },
        );
      }

      if (!screenshot.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "The screenshot must be an image file." },
          { status: 400 },
        );
      }

      if (screenshot.size > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: "The screenshot must be smaller than 4 MB." },
          { status: 400 },
        );
      }
    }

    const idList =
      (payload as any).tracking_ids ?? (payload as any).nins;

    if (Array.isArray(idList) && idList.length > 1) {
      return NextResponse.json(
        { error: "Please submit one ID per request." },
        { status: 400 },
      );
    }

    const pinCheck = await verifyUserTransactionPin(
      user.id,
      pinValue,
    );

    if (!pinCheck.valid) {
      return NextResponse.json(
        { error: pinCheck.error },
        { status: pinCheck.status ?? 401 },
      );
    }

    // Preserve the existing customer selling-price configuration.
    const pricing = getAgeVerifyPricing(
      service,
      payload,
      0,
      false,
    );

    const price = Number(pricing.sellingPrice);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Service price is not configured correctly." },
        { status: 500 },
      );
    }

    const reference = `IDV-${Date.now()}-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase()}`;

    // Debit customer and create pending records atomically.
    const verification = await prisma.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({
        where: {
          id: user.id,
          walletBalance: { gte: price },
        },
        data: {
          walletBalance: { decrement: price },
        },
      });

      if (debit.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const record = await tx.identityVerification.create({
        data: {
          userId: user.id,
          service,
          reference,
          amount: price,
          status: "PROCESSING",
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "NIN",
          amount: price,
          description: `${svc.title} (${reference})`,
          status: "PENDING",
          reference: `CHARGE-${reference}`,
          provider: "AGEVERIFY",
          cost: 0,
          profit: 0,
        },
      });

      return record;
    });

    let response: any;

    try {
      if (service === "bvn-crm" && screenshot) {
        const formData = new FormData();

        for (const [key, value] of Object.entries(payload)) {
          formData.append(key, String(value));
        }

        formData.append(
          "enrollment_screenshot",
          screenshot,
          screenshot.name || "screenshot.jpg",
        );

        response = await av(svc.endpoint, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await av(svc.endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    } catch (error) {
      console.error("AGEVERIFY CONNECTION ERROR:", error);

      await prisma.identityVerification.update({
        where: { id: verification.id },
        data: { status: "FAILED" },
      });

      await refundAgeVerify(verification.id);

      return NextResponse.json(
        {
          error:
            "The verification service could not be reached. Your wallet has been refunded.",
          reference,
          refunded: true,
        },
        { status: 502 },
      );
    }

    const providerData = response.body?.data ?? {};

    const providerStatus = String(
      providerData?.status ?? response.body?.status ?? "",
    ).toLowerCase();

    const upstreamRef =
      providerData?.reference ??
      providerData?.verification_reference ??
      providerData?.report_id ??
      providerData?.batch_id ??
      providerData?.tracking_id ??
      providerData?.personalization_id ??
      providerData?.id ??
      null;

    const nothingAccepted =
      providerData?.accepted_count === 0 ||
      (typeof providerData?.submitted === "number" &&
        providerData.submitted === 0);

    if (
      !response.ok ||
      response.body?.status === false ||
      nothingAccepted ||
      ["failed", "failure", "rejected", "declined"].includes(
        providerStatus,
      )
    ) {
      await prisma.identityVerification.update({
        where: { id: verification.id },
        data: {
          status: "FAILED",
          upstreamRef,
          result: response.body,
        },
      });

      await refundAgeVerify(verification.id);

      return NextResponse.json(
        {
          error: nothingAccepted
            ? "Your request was not accepted. Your wallet has been refunded."
            : hideProvider(response.body?.message) ||
              "Verification failed. Your wallet has been refunded.",
          reference,
          status: "FAILED",
          refunded: true,
        },
        { status: 502 },
      );
    }

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

    const hasResultData =
      providerData &&
      typeof providerData === "object" &&
      Object.keys(providerData).length > 0;

    if (
      svc.manual ||
      pendingStatuses.includes(providerStatus) ||
      (response.status === 202 && !hasResultData)
    ) {
      const updated = await prisma.identityVerification.update({
        where: { id: verification.id },
        data: {
          status: "PROCESSING",
          upstreamRef,
          result: response.body,
        },
      });

      return NextResponse.json(
        {
          id: updated.id,
          reference: updated.reference,
          service: updated.service,
          amount: updated.amount,
          status: updated.status,
          result: publicResult(updated.result),
          download_path: documentPath(
            updated.id,
            updated.result,
          ),
          refunded: updated.refunded,
        },
        { status: 202 },
      );
    }

    // Provider cost is independent of customer selling price.
    // Prefer the tier-aware provider cost from the pricing configuration.
    const providerCost =
      toPositiveNumber(pricing.providerCost) ??
      extractProviderCost(providerData) ??
      extractProviderCost(response.body);

    console.log("AGEVERIFY BUSINESS REVENUE DATA:", {
      reference,
      service,
      priceKey: pricing.priceKey,
      customerPayment: price,
      providerCost,
    });

    // Verification was delivered but provider cost is unavailable.
    // Close the customer charge and leave business revenue for reconciliation.
    if (providerCost === null) {
      const updated = await prisma.identityVerification.update({
        where: { id: verification.id },
        data: {
          status: "COMPLETED",
          upstreamRef,
          result: providerData?.data ?? response.body,
        },
      });

      await markChargeTransactionSuccess(reference);

      console.error(
        "AGEVERIFY PROVIDER COST NOT AVAILABLE - RECONCILIATION REQUIRED:",
        {
          reference,
          service,
          customerPayment: price,
          providerResponse: response.body,
        },
      );

      return NextResponse.json(
        {
          id: updated.id,
          reference: updated.reference,
          service: updated.service,
          amount: updated.amount,
          status: updated.status,
          result: publicResult(updated.result),
          download_path: documentPath(
            updated.id,
            updated.result,
          ),
          refunded: updated.refunded,
          revenueRecorded: false,
        },
        { status: 200 },
      );
    }

    // Save provider deduction, including when it exceeds the selling price.
    // A higher provider cost is a business loss, not a failed verification.
    await prisma.transaction.update({
      where: {
        reference: `CHARGE-${reference}`,
      },
      data: {
        cost: providerCost,
      },
    });

    const updated = await prisma.identityVerification.update({
      where: { id: verification.id },
      data: {
        status: "COMPLETED",
        upstreamRef,
        result: providerData?.data ?? response.body,
      },
    });

    try {
      await finalizeAgeVerifySuccess(verification.id);
    } catch (ledgerError) {
      console.error(
        "AGEVERIFY BUSINESS LEDGER ERROR:",
        ledgerError,
      );

      await markChargeTransactionSuccess(reference);

      return NextResponse.json(
        {
          id: updated.id,
          reference: updated.reference,
          service: updated.service,
          amount: updated.amount,
          status: updated.status,
          result: publicResult(updated.result),
          download_path: documentPath(
            updated.id,
            updated.result,
          ),
          refunded: updated.refunded,
          revenueRecorded: false,
          warning:
            "Verification completed, but business accounting needs reconciliation.",
        },
        { status: 200 },
      );
    }

    await markChargeTransactionSuccess(reference);

    return NextResponse.json({
      id: updated.id,
      reference: updated.reference,
      service: updated.service,
      amount: updated.amount,
      status: updated.status,
      result: publicResult(updated.result),
      download_path: documentPath(
        updated.id,
        updated.result,
      ),
      refunded: updated.refunded,
      revenueRecorded: true,
    });
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          error: "Insufficient balance. Please fund your wallet.",
        },
        { status: 402 },
      );
    }

    console.error("AGEVERIFY ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Unable to process verification request." },
      { status: 500 },
    );
  }
}
