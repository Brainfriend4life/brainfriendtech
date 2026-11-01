import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { av } from "@/lib/ageverify";
import { getAgeVerifyService } from "@/lib/ageverify-config";
import { isProviderUrl } from "@/lib/ageverify-public";

function findDocumentUrl(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;

  const pending: unknown[] = [result];

  while (pending.length) {
    const current = pending.pop();

    if (!current || typeof current !== "object") continue;

    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }

    const item = current as Record<string, unknown>;

    if (isProviderUrl(item.pdf_url)) return item.pdf_url;
    if (isProviderUrl(item.download_url)) return item.download_url;

    pending.push(...Object.values(item));
  }

  return null;
}

async function freshPersonalizationUrl(
  result: unknown,
): Promise<string | null> {
  if (!result || typeof result !== "object") return null;

  const root = result as Record<string, any>;
  const trackingId = root.tracking_id ?? root.data?.tracking_id;

  const service = getAgeVerifyService("personalization");

  if (!trackingId || !service?.endpoint) return null;

  const endpoint = String(service.endpoint);
  const basePath = endpoint
    .replace(/[^/]+\.php(?:\?.*)?$/, "")
    .replace(/\/+$/, "");

  const path = `${basePath}/personalization_status.php`.replace(
    /api\/v1\//,
    "api/v2/",
  );

  const response = await av(path, {
    method: "POST",
    body: JSON.stringify({ tracking_id: trackingId }),
  });

  const url = response.body?.data?.download_url;

  return isProviderUrl(url) ? url : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const { id } = await params;

    const verification = await prisma.identityVerification.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Document not available." },
        { status: 404 },
      );
    }

    if (verification.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Document not available." },
        { status: 404 },
      );
    }

    let url: string | null = null;

    if (verification.service === "personalization") {
      try {
        url = await freshPersonalizationUrl(verification.result);
      } catch (error) {
        console.error("PERSONALIZATION DOCUMENT REFRESH ERROR:", error);
      }
    }

    url = url ?? findDocumentUrl(verification.result);

    if (!url || !isProviderUrl(url)) {
      return NextResponse.json(
        { error: "Document not available." },
        { status: 404 },
      );
    }

    const upstream = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
    });

    if (!upstream.ok || !upstream.body) {
      console.error("DOCUMENT PROVIDER DOWNLOAD FAILED:", {
        status: upstream.status,
        verificationId: verification.id,
      });

      return NextResponse.json(
        {
          error: "Unable to fetch the document right now. Try again shortly.",
        },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/pdf";

    const extension = contentType.includes("png")
      ? "png"
      : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : "pdf";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${verification.reference}.${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("DOCUMENT FILE ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Unable to open the document." },
      { status: 500 },
    );
  }
}
