import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sanitizeDescription } from "@/lib/transactionLabel";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Never send internal fulfillment details to the client:
    // - `provider` reveals which backend vendor handled the transaction
    // - `cost` / `profit` reveal your internal margins
    // `description` is sanitized as a safety net in case it was ever
    // generated with a vendor name embedded in it.
    const sanitized = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      description: sanitizeDescription(tx.description),
      status: tx.status,
      reference: tx.reference,
      createdAt: tx.createdAt,
    }));

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}