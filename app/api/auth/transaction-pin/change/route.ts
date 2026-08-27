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

    const { currentPin, newPin } = body;

    if (
      typeof currentPin !== "string" ||
      typeof newPin !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Current PIN and new PIN are required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(currentPin)) {
      return NextResponse.json(
        {
          success: false,
          message: "Current PIN must be exactly 4 digits.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        {
          success: false,
          message: "New PIN must be exactly 4 digits.",
        },
        { status: 400 }
      );
    }

    if (currentPin === newPin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New PIN must be different from your current PIN.",
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

    if (!user.transactionPinHash) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have a transaction PIN yet. Set one first.",
        },
        { status: 400 }
      );
    }

    const validCurrentPin = await bcrypt.compare(
      currentPin,
      user.transactionPinHash
    );

    if (!validCurrentPin) {
      return NextResponse.json(
        {
          success: false,
          message: "Current PIN is incorrect.",
        },
        { status: 400 }
      );
    }

    const newHashedPin = await bcrypt.hash(
      newPin,
      12
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        transactionPinHash: newHashedPin,
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
          "Transaction PIN changed successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "CHANGE TRANSACTION PIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while changing your transaction PIN.",
      },
      { status: 500 }
    );
  }
}