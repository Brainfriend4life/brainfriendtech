import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getAgeVerifyService } from "@/lib/ageverify-config";
import { av } from "@/lib/ageverify";
import { getAgeVerifyProviderCost } from "@/lib/ageverify-pricing";
import { finalizeAgeVerifySuccess, refundAgeVerify } from "@/lib/ageverify-ledger";

const PRICE_ENV: Record<string, string> = {
  nin: "AGEVERIFY_NIN_VERIFY_PRICE",
  "nin-phone": "AGEVERIFY_NIN_PHONE_PRICE",
  "nin-demo": "AGEVERIFY_NIN_DEMO_PRICE",
  bvn: "AGEVERIFY_BVN_VERIFY_PRICE",
  "nin-validation": "AGEVERIFY_NIN_VALIDATION_PRICE",
  "nin-validation-v2": "AGEVERIFY_NIN_VALIDATION_V2_PRICE",
  personalization: "AGEVERIFY_PERSONALIZATION_PRICE",
  "ipe-clearance": "AGEVERIFY_IPE_CLEARANCE_PRICE",
  "bvn-crm": "AGEVERIFY_BVN_CRM_PRICE",
  "modification-ipe": "AGEVERIFY_MODIFICATION_IPE_PRICE",
  "bvn-retrieval": "AGEVERIFY_BVN_RETRIEVAL_PRICE",
  "ipe-special": "AGEVERIFY_IPE_SPECIAL_PRICE",
};
const NIN_SLIP_PRICES: Record<string, string> = {
  regular: "AGEVERIFY_NIN_REGULAR_SLIP_PRICE",
  standard: "AGEVERIFY_NIN_STANDARD_SLIP_PRICE",
  premium: "AGEVERIFY_NIN_PREMIUM_SLIP_PRICE",
};

const NIN_PHONE_PRICES: Record<string, string> = {
  regular: "AGEVERIFY_NIN_PHONE_REGULAR_PRICE",
  standard: "AGEVERIFY_NIN_PHONE_STANDARD_PRICE",
  premium: "AGEVERIFY_NIN_PHONE_PREMIUM_PRICE",
};

function accepted(body: any) {
  return body?.status === true;
}

function getProviderData(body: any) {
  return body?.data ?? {};
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ service: string }> },
) {
  let idempotencyKey = "";
  let requestUserId = "";
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    requestUserId = user.id;
    idempotencyKey = (req.headers.get("Idempotency-Key") || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return NextResponse.json({ error: "A valid request key is required." }, { status: 400 });
    }
    const { service } = await params;
    const svc = getAgeVerifyService(service);

    if (!svc) {
      return NextResponse.json(
        { error: "AgeVerify service unavailable." },
        { status: 404 },
      );
    }

    const existingRequest = await prisma.identityVerification.findFirst({
      where: { userId: user.id, idempotencyKey },
    });
    if (existingRequest) {
      return NextResponse.json({
        reference: existingRequest.reference,
        service: existingRequest.service,
        amount: existingRequest.amount,
        status: existingRequest.status,
        result: existingRequest.result,
        refunded: existingRequest.refunded,
        message: "This request has already been received.",
      }, { status: existingRequest.status === "PROCESSING" ? 202 : 200 });
    }

    let payload: Record<string, any>;
    let pin = "";
    let enrollmentScreenshot: File | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const payloadText = formData.get("payload");
      pin = String(formData.get("pin") ?? "");

      if (typeof payloadText !== "string") {
        return NextResponse.json(
          { error: "A valid payload object is required." },
          { status: 400 },
        );
      }

      try {
        payload = JSON.parse(payloadText);
      } catch {
        return NextResponse.json(
          { error: "Invalid request payload." },
          { status: 400 },
        );
      }

      const uploadedFile = formData.get("enrollment_screenshot");
      if (uploadedFile instanceof File) {
        enrollmentScreenshot = uploadedFile;
      }
    } else {
      const body = await req.json().catch(() => null);
      payload = body?.payload;
      pin = String(body?.pin ?? "");
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json(
        { error: "A valid payload object is required." },
        { status: 400 },
      );
    }
    let price: number;

    if (service === "nin-phone") {
      const slipType = String(payload.slip_type ?? "standard").toLowerCase();
      const priceVariable = NIN_PHONE_PRICES[slipType];

      if (!priceVariable) {
        return NextResponse.json(
          { error: "Select a valid phone slip type: regular, standard or premium." },
          { status: 400 },
        );
      }

      price = Number(process.env[priceVariable]);
    } else if (service === "nin" || service === "bvn") {
      const slipType = String(payload.slip_type ?? "").toLowerCase();
      const priceVariable = NIN_SLIP_PRICES[slipType];

      if (!priceVariable) {
        return NextResponse.json(
          { error: "Select a valid slip type: regular, standard or premium." },
          { status: 400 },
        );
      }

      price = Number(process.env[priceVariable]);
    } else {
      const priceVariable = PRICE_ENV[service];
      price = Number(priceVariable ? process.env[priceVariable] : undefined);
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "This service has no valid selling price configured." },
        { status: 503 },
      );
    }
    const providerCost = getAgeVerifyProviderCost(service, payload);


    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "Enter your 4-digit transaction PIN." },
        { status: 400 },
      );
    }

    if (service === "bvn-crm" && !enrollmentScreenshot) {
      return NextResponse.json(
        { error: "The BVN CRM enrollment screenshot is required." },
        { status: 400 },
      );
    }

    if (
      service === "nin-validation-v2" &&
      (!Array.isArray(payload.nins) ||
        payload.nins.length < 1 ||
        payload.nins.length > 20)
    ) {
      return NextResponse.json(
        { error: "Enter between 1 and 20 NIN numbers." },
        { status: 400 },
      );
    }

    const pinUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!pinUser?.transactionPinEnabled || !pinUser.transactionPinHash) {
      return NextResponse.json(
        { error: "Please set up your transaction PIN first." },
        { status: 400 },
      );
    }

    if (
      pinUser.transactionPinLockedUntil &&
      pinUser.transactionPinLockedUntil > new Date()
    ) {
      return NextResponse.json(
        { error: "Transaction PIN temporarily locked. Try again later." },
        { status: 403 },
      );
    }

    const bcrypt = await import("bcryptjs");
    const pinCorrect = await bcrypt.compare(pin, pinUser.transactionPinHash);

    if (!pinCorrect) {
      const attempts = pinUser.transactionPinAttempts + 1;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          transactionPinAttempts: attempts,
          transactionPinLockedUntil:
            attempts >= 5
              ? new Date(Date.now() + 15 * 60 * 1000)
              : null,
        },
      });

      return NextResponse.json(
        { error: "Incorrect transaction PIN." },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        transactionPinAttempts: 0,
        transactionPinLockedUntil: null,
        lastTransactionPinCheck: new Date(),
      },
    });

    const reference = `IDV-${Date.now()}-${crypto.randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase()}`;

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

      if (!debit.count) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const record = await tx.identityVerification.create({
        data: {
          userId: user.id,
          service,
          reference,
          idempotencyKey,
          amount: price,
          status: "PROCESSING",
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "NIN",
          amount: price,
          description: `AgeVerify ${svc.title} charge (${reference})`,
          status: "PENDING",
          reference: `CHARGE-${reference}`,
          provider: "AGEVERIFY",
          cost: providerCost,
          profit: 0,
        },
      });

      return record;
    });

    const providerPayload = { ...payload };
    let providerResponse;

    try {
      if (service === "bvn-crm") {
        const form = new FormData();

        form.append("ticket_id", String(providerPayload.ticket_id ?? ""));
        form.append("batch_id", String(providerPayload.batch_id ?? ""));
        form.append(
          "enrollment_screenshot",
          enrollmentScreenshot!,
          enrollmentScreenshot!.name,
        );

        providerResponse = await av(svc.endpoint, {
          method: "POST",
          body: form,
        });
      } else {
        if (
          service === "nin-demo" &&
          typeof providerPayload.dob === "string"
        ) {
          const parts = providerPayload.dob.split("-");
          if (parts.length === 3 && parts[0].length === 4) {
            providerPayload.dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }

        providerResponse = await av(svc.endpoint, {
          method: "POST",
          body: JSON.stringify(providerPayload),
        });
      }
    } catch (error) {
      console.error("AGEVERIFY CONNECTION ERROR:", error);

      await prisma.identityVerification.update({
        where: { id: verification.id },
        data: {
          status: "PROCESSING",
          result: {
            message:
              "Provider connection uncertain. Check provider history before retrying.",
          },
        },
      });

      return NextResponse.json(
        {
          error:
            "The provider connection was interrupted. Your request is being held for review. Contact support before retrying.",
          reference,
          status: "PROCESSING",
          refunded: false,
        },
        { status: 202 },
      );
    }

    const providerData = getProviderData(providerResponse.body);

    const upstreamRef =
      (service === "personalization" ||
      service === "modification-ipe" ||
      service === "bvn-retrieval"
        ? providerPayload.tracking_id ?? null
        : null) ??
      (service === "bvn-crm" ? providerPayload.batch_id : null) ??
      providerData.reference ??
      providerData.report_id ??
      providerData.batch_id ??
      providerData.tracking_id ??
      providerData.personalization_id?.toString() ??
      null;

    if (!providerResponse.ok || !accepted(providerResponse.body)) {
      const message =
        providerResponse.body?.message || "AgeVerify rejected the request.";

      await prisma.identityVerification.update({
        where: { id: verification.id },
        data: {
          status: "FAILED",
          upstreamRef,
          result: providerResponse.body,
        },
      });

      await refundAgeVerify(verification.id);

      return NextResponse.json(
        {
          error: message,
          reference,
          status: "FAILED",
          refunded: true,
          provider: providerResponse.body,
        },
        { status: providerResponse.status || 502 },
      );
    }

    const providerStatus = String(providerData.status ?? "").toLowerCase();

    const isPending =
      svc.manual ||
      [
        "pending",
        "processing",
        "submitted",
        "new",
        "review",
      ].includes(providerStatus);

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
      where: { id: verification.id },
      data: {
        status: isPending ? "PROCESSING" : "COMPLETED",
        upstreamRef,
        result: {
          ...providerData,
          ...(service === "personalization"
            ? { tracking_id: providerPayload.tracking_id }
            : {}),
          ...(service === "modification-ipe"
            ? { tracking_id: providerPayload.tracking_id }
            : {}),
          ...(service === "bvn-retrieval"
            ? { tracking_id: providerPayload.tracking_id }
            : {}),
          ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
          ...(downloadUrl ? { download_url: downloadUrl } : {}),
        },
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
        pdf_url: pdfUrl,
        download_url: downloadUrl,
        refunded: updated.refunded,
      },
      { status: isPending ? 202 : 200 },
    );
  } catch (error: any) {
    if (error?.code === "P2002" && idempotencyKey && requestUserId) {
      const existingRequest = await prisma.identityVerification.findFirst({
        where: { userId: requestUserId, idempotencyKey },
      });
      if (existingRequest) {
        return NextResponse.json({
          reference: existingRequest.reference,
          service: existingRequest.service,
          amount: existingRequest.amount,
          status: existingRequest.status,
          result: existingRequest.result,
          refunded: existingRequest.refunded,
          message: "This request has already been received.",
        }, { status: existingRequest.status === "PROCESSING" ? 202 : 200 });
      }
    }
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

async function refundVerification(verificationId: string) {
  await prisma.$transaction(async (tx) => {
    const verification = await tx.identityVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification || verification.refunded) return;

    const claimed = await tx.identityVerification.updateMany({
      where: { id: verificationId, refunded: false },
      data: { refunded: true },
    });

    if (!claimed.count) return;

    await tx.user.update({
      where: { id: verification.userId },
      data: {
        walletBalance: { increment: verification.amount },
      },
    });

    await tx.transaction.create({
      data: {
        userId: verification.userId,
        type: "NIN",
        amount: verification.amount,
        description: `Refund for AgeVerify request (${verification.reference})`,
        status: "SUCCESS",
        reference: `REFUND-${verification.reference}`,
        provider: "AGEVERIFY",
        cost: 0,
        profit: 0,
      },
    });
  }, { maxWait: 10000, timeout: 20000 });
}





