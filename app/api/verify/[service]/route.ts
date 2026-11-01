import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getAgeVerifyService } from "@/lib/ageverify-config";
import { av } from "@/lib/ageverify";
import { verifyUserTransactionPin } from "@/lib/security/verifyUserTransactionPin";
import { getAgeVerifyPricing } from "@/lib/ageverify-pricing";
import {
  finalizeAgeVerifySuccess,
  refundAgeVerify,
} from "@/lib/ageverify-ledger";

// Change this if your Transaction status enum uses a different value.
const TX_SUCCESS_STATUS = "SUCCESS";

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
 * Extract provider deduction (in NAIRA) from the actual provider response.
 *
 * The customer's selling price is NOT used as a provider cost.
 * Kobo values are converted to naira.
 */
function extractProviderCost(response: unknown): number | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const root = response as Record<string, any>;
  const nested = root.data && typeof root.data === "object" ? root.data : {};

  // Naira values
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

    if (value !== null) {
      return value;
    }
  }

  // Kobo values -> convert to naira
  const kobo =
    toPositiveNumber(root.cost_kobo) ?? toPositiveNumber(nested.cost_kobo);

  if (kobo !== null) {
    return kobo / 100;
  }

  return null;
}

/**
 * Never show the provider's name to customers (also strips it from
 * provider error messages before they are returned).
 */
function hideProvider(message: unknown): string | null {
  if (typeof message !== "string" || !message.trim()) return null;
  return message.replace(/(age|amb)\s*verify/gi, "the verification service");
}

/**
 * Make sure the customer charge transaction never stays PENDING
 * after the verification has actually been delivered.
 * Safe to call more than once; only touches rows still PENDING.
 */
async function markChargeTransactionSuccess(reference: string) {
  try {
    await prisma.transaction.updateMany({
      where: {
        reference: `CHARGE-${reference}`,
        status: "PENDING",
      },
      data: {
        status: TX_SUCCESS_STATUS as any,
      },
    });
  } catch (error) {
    console.error("AGEVERIFY TX STATUS UPDATE ERROR:", { reference, error });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ service: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const { service } = await params;
    const svc = getAgeVerifyService(service);

    if (!svc) {
      return NextResponse.json(
        { error: "Verification service unavailable." },
        { status: 404 },
      );
    }

    // Most services send JSON. BVN CRM sends multipart/form-data with the
    // enrollment screenshot attached.
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

      // Vercel functions accept request bodies up to about 4.5 MB.
      if (screenshot.size > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: "The screenshot must be smaller than 4 MB." },
          { status: 400 },
        );
      }
    }

    // The provider bills per accepted ID, but your selling price is per
    // request, so batches are limited to one ID until pricing is multiplied.
    const idList = (payload as any).tracking_ids ?? (payload as any).nins;

    if (Array.isArray(idList) && idList.length > 1) {
      return NextResponse.json(
        { error: "Please submit one ID per request." },
        { status: 400 },
      );
    }

    const pinCheck = await verifyUserTransactionPin(user.id, pinValue);

    if (!pinCheck.valid) {
      return NextResponse.json(
        { error: pinCheck.error },
        { status: pinCheck.status ?? 401 },
      );
    }

    // Existing ENV selling price remains the customer's price.
    const pricing = getAgeVerifyPricing(service, payload, 0, false);
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

        response = await av(svc.endpoint, { method: "POST", body: formData });
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

    // Provider failure: preserve the existing refund flow.
    // This API answers { status: false } on errors, and for batch-style
    // services it can accept nothing (accepted_count / submitted = 0), in
    // which case the provider charged nothing and the customer is refunded.
    const nothingAccepted =
      providerData?.accepted_count === 0 ||
      (typeof providerData?.submitted === "number" &&
        providerData.submitted === 0);

    if (
      !response.ok ||
      response.body?.status === false ||
      nothingAccepted ||
      ["failed", "failure", "rejected", "declined"].includes(providerStatus)
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

    // Only genuinely pending requests stay pending: manual services, an
    // explicit pending-type provider status, or a 202 with no result data.
    // A 202 that already carries the result is treated as completed.
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
          result: updated.result,
          refunded: updated.refunded,
        },
        { status: 202 },
      );
    }

    // Provider cost: the tier-aware value from your pricing file
    // (the same tier that decided the selling price), then fall back to
    // whatever the provider response reports.
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

    // Provider cost missing or invalid.
    // The verification was delivered and the customer was charged, so the
    // charge transaction must be closed (not left PENDING) and flagged
    // for manual reconciliation.
    if (providerCost === null || providerCost > price) {
      const updated = await prisma.identityVerification.update({
        where: { id: verification.id },
        data: {
          status: "COMPLETED",
          upstreamRef,
          result: providerData?.data ?? response.body,
        },
      });

      await markChargeTransactionSuccess(reference);

      console.error("AGEVERIFY PROVIDER COST NOT AVAILABLE (RECONCILE):", {
        reference,
        providerCost,
        customerPayment: price,
        providerResponse: response.body,
      });

      // Customer got what they paid for, so return the result normally.
      return NextResponse.json(
        {
          id: updated.id,
          reference: updated.reference,
          service: updated.service,
          amount: updated.amount,
          status: updated.status,
          result: updated.result,
          refunded: updated.refunded,
          revenueRecorded: false,
        },
        { status: 200 },
      );
    }

    // Save the actual deduction before business-ledger finalization.
    await prisma.transaction.update({
      where: {
        reference: `CHARGE-${reference}`,
      },
      data: {
        cost: providerCost,
      },
    });

    // Mark verification completed.
    const updated = await prisma.identityVerification.update({
      where: { id: verification.id },
      data: {
        status: "COMPLETED",
        upstreamRef,
        result: providerData?.data ?? response.body,
      },
    });

    // Record BusinessRevenue and referral commission.
    try {
      await finalizeAgeVerifySuccess(verification.id);
    } catch (ledgerError) {
      console.error("AGEVERIFY BUSINESS LEDGER ERROR:", ledgerError);

      // Verification was delivered; don't leave the charge PENDING.
      await markChargeTransactionSuccess(reference);

      return NextResponse.json(
        {
          id: updated.id,
          reference: updated.reference,
          service: updated.service,
          amount: updated.amount,
          status: updated.status,
          result: updated.result,
          refunded: updated.refunded,
          revenueRecorded: false,
          warning:
            "Verification completed, but transaction recording needs attention. Contact support with this reference if the record looks wrong.",
        },
        { status: 200 },
      );
    }

    // Safety net: if the ledger finalizer did not flip the status, do it now.
    await markChargeTransactionSuccess(reference);

    return NextResponse.json({
      id: updated.id,
      reference: updated.reference,
      service: updated.service,
      amount: updated.amount,
      status: updated.status,
      result: updated.result,
      refunded: updated.refunded,
      revenueRecorded: true,
      providerCost,
    });
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "Insufficient balance. Please fund your wallet." },
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
