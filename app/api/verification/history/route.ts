
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in first." },
        { status: 401 },
      );
    }

    const [verifications, downloads] = await Promise.all([
      prisma.identityVerification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          service: true,
          reference: true,
          amount: true,
          status: true,
          refunded: true,
          createdAt: true,
          result: true,
        },
      }),

      prisma.transaction.findMany({
        where: {
          userId: user.id,
          provider: "AGEVERIFY",
          type: "NIN",
          description: {
            contains: "purchase",
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          reference: true,
          amount: true,
          description: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const verificationRecords = verifications.map((record) => ({
      ...record,
      recordType: "verification",
    }));

    const downloadRecords = downloads.map((record) => ({
      id: record.id,
      service: record.description.split(" purchase ")[0],
      reference: record.reference,
      amount: record.amount,
      status: record.status,
      refunded: record.status === "FAILED",
      createdAt: record.createdAt,
      result: null,
      recordType: "document-download",
    }));

    const records = [...verificationRecords, ...downloadRecords]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .slice(0, 100);

    return NextResponse.json({ records });
  } catch (error) {
    console.error("AGEVERIFY HISTORY ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load verification history." },
      { status: 500 },
    );
  }
}
