import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { av } from "@/lib/ageverify";

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
      where: { reference, userId: user.id },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Verification record not found." },
        { status: 404 },
      );
    }

    if (record.status === "COMPLETED" || record.status === "FAILED") {
      return NextResponse.json({
        reference: record.reference,
        status: record.status,
        result: record.result,
        refunded: record.refunded,
      });
    }

    const endpoint = STATUS_ENDPOINTS[record.service];

    if (!endpoint) {
      return NextResponse.json({
        error: "Status checking is not available for this service.",
        reference,
        status: record.status,
      }, { status: 400 });
    }

    const savedResult = record.result as Record<string, any> | null;
    const upstreamRef = record.upstreamRef;

    if (!upstreamRef) {
      return NextResponse.json({
        error: "Provider reference is not available yet. Please contact support.",
        reference,
        status: record.status,
      }, { status: 409 });
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
      return NextResponse.json({
        error: response.body?.message || "Unable to retrieve provider status.",
        reference,
        status: record.status,
      }, { status: response.status || 502 });
    }

    const providerData = response.body?.data ?? {};
    const providerStatus = String(providerData.status ?? "").toLowerCase();

    const completedStatuses = [
      "completed", "complete", "success", "successful",
      "approved", "cleared", "done",
    ];

    const failedStatuses = [
      "failed", "failure", "rejected", "declined",
    ];

    let newStatus = record.status;

    if (completedStatuses.includes(providerStatus)) {
      newStatus = "COMPLETED";
    } else if (failedStatuses.includes(providerStatus)) {
      newStatus = "FAILED";
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

    return NextResponse.json({
      reference: updated.reference,
      status: updated.status,
      result: updated.result,
      refunded: updated.refunded,
      message: response.body?.message,
    });
  } catch (error) {
    console.error("AGEVERIFY STATUS ERROR:", error);

    return NextResponse.json({
      error: "Unable to check verification status.",
    }, { status: 500 });
  }
}
