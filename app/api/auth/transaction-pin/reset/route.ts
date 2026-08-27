import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { newPin } = body;

    if (typeof newPin !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "New PIN is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        {
          success: false,
          message: "PIN must be exactly 4 digits.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        transactionPinHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    const hashedPin = await bcrypt.hash(
      newPin,
      12
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        transactionPinHash: hashedPin,
        transactionPinEnabled: true,
        transactionPinAttempts: 0,
        transactionPinLockedUntil: null,
        transactionPinSetAt: new Date(),
        lastTransactionPinCheck: null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Transaction PIN reset successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "RESET TRANSACTION PIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while resetting your transaction PIN.",
      },
      { status: 500 }
    );
  }
}