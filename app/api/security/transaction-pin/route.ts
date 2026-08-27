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
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        {
          success: false,
          message: "PIN is required",
        },
        { status: 400 }
      );
    }

    if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        {
          success: false,
          message: "PIN must be exactly 4 digits",
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
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // A user who already has a PIN must use the change-PIN route.
    if (user.transactionPinHash) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Transaction PIN already exists. Use change PIN instead.",
        },
        { status: 400 }
      );
    }

    const hashedPin = await bcrypt.hash(pin, 12);

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
        message: "Transaction PIN created successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("CREATE TRANSACTION PIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}