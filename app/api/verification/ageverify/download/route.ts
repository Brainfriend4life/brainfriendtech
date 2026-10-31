import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { av } from "@/lib/ageverify";
import { verifyUserTransactionPin } from "@/lib/security/verifyUserTransactionPin";

const DOWNLOADS: Record<string, { title: string; priceEnv: string }> = {
  "nin-standard-slip": {
    title: "NIN Standard Slip",
    priceEnv: "AGEVERIFY_NIN_STANDARD_SLIP_PRICE",
  },
  "nin-premium-slip": {
    title: "NIN Premium Slip",
    priceEnv: "AGEVERIFY_NIN_PREMIUM_SLIP_PRICE",
  },
  "nin-long-slip": {
    title: "NIN Long Slip",
    priceEnv: "AGEVERIFY_NIN_LONG_SLIP_PRICE",
  },
  "nin-datapage": {
    title: "NIN Datapage",
    priceEnv: "AGEVERIFY_NIN_DATAPAGE_PRICE",
  },
};

function findDocument(value: any): {
  documentUrl?: string;
  documentBase64?: string;
} {
  const urlKeys = [
    "pdf_url", "document_url", "download_url",
    "file_url", "download_link", "document_link",
  ];

  const base64Keys = [
    "pdf_base64", "document_base64", "file_base64",
    "base64_pdf", "pdf_data",
  ];

  function search(item: any): {
    documentUrl?: string;
    documentBase64?: string;
  } {
    if (!item || typeof item !== "object") return {};

    for (const [key, val] of Object.entries(item)) {
      const normalizedKey = key.toLowerCase();

      if (
        urlKeys.includes(normalizedKey) &&
        typeof val === "string" &&
        val.startsWith("https://")
      ) {
        return { documentUrl: val };
      }

      if (
        base64Keys.includes(normalizedKey) &&
        typeof val === "string"
      ) {
        const cleaned = val.replace(/^data:application\/pdf;base64,/i, "");
        if (cleaned.startsWith("JVBERi0")) {
          return { documentBase64: cleaned };
        }
      }
    }

    for (const val of Object.values(item)) {
      if (val && typeof val === "object") {
        const found = search(val);
        if (found.documentUrl || found.documentBase64) return found;
      }
    }

    return {};
  }

  return search(value);
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Separate document purchases are no longer supported. Use the PDF link returned by your AgeVerify verification.",
    },
    { status: 410 },
  );
}
async function refundDownload(
  userId: string,
  reference: string,
  amount: number,
) {
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { reference },
    });

    if (!transaction || transaction.status !== "PENDING") return;

    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
    });

    await tx.transaction.update({
      where: { reference },
      data: {
        status: "FAILED",
        description: `Refunded failed AgeVerify download (${reference})`,
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: "NIN",
        amount,
        description: `Refund for AgeVerify download (${reference})`,
        status: "SUCCESS",
        reference: `REFUND-${reference}`,
        provider: "AGEVERIFY",
        cost: 0,
        profit: 0,
      },
    });
  });
}

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const prices: Record<string, number | null> = {};

    for (const [slug, service] of Object.entries(DOWNLOADS)) {
      const value = Number(process.env[service.priceEnv]);
      prices[slug] =
        Number.isFinite(value) && value > 0 ? value : null;
    }

    const verificationPrice = Number(process.env.AGEVERIFY_NIN_VERIFY_PRICE);
    prices["nin-verification"] =
      Number.isFinite(verificationPrice) && verificationPrice > 0
        ? verificationPrice
        : null;

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("AGEVERIFY DOWNLOAD PRICE ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load document prices." },
      { status: 500 },
    );
  }
}
