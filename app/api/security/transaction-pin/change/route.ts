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
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      currentPin,
      newPin,
      confirmPin,
    } = body;

    if (!currentPin || !newPin || !confirmPin) {
      return NextResponse.json(
        {
          success: false,
          message: "Please complete all PIN fields.",
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

    if (newPin !== confirmPin) {
      return NextResponse.json(
        {
          success: false,
          message: "New PINs do not match.",
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
        transactionPinEnabled: true,
        transactionPinAttempts: true,
        transactionPinLockedUntil: true,
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
            "You do not have a transaction PIN yet. Please create one first.",
        },
        { status: 400 }
      );
    }

    /*
     * Check whether the PIN is temporarily locked.
     */

    if (
      user.transactionPinLockedUntil &&
      user.transactionPinLockedUntil > new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your transaction PIN is temporarily locked. Please try again later.",
        },
        { status: 429 }
      );
    }

    /*
     * Verify current PIN.
     */

    const currentPinCorrect = await bcrypt.compare(
      currentPin,
      user.transactionPinHash
    );

    if (!currentPinCorrect) {
      const attempts =
        (user.transactionPinAttempts || 0) + 1;

      /*
       * Lock after 5 failed attempts.
       */

      if (attempts >= 5) {
        const lockedUntil = new Date(
          Date.now() + 15 * 60 * 1000
        );

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            transactionPinAttempts: 0,
            transactionPinLockedUntil:
              lockedUntil,
          },
        });

        return NextResponse.json(
          {
            success: false,
            message:
              "Too many incorrect attempts. Your transaction PIN has been locked for 15 minutes.",
          },
          { status: 429 }
        );
      }

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          transactionPinAttempts: attempts,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: `Incorrect current PIN. ${5 - attempts} attempt${
            5 - attempts === 1 ? "" : "s"
          } remaining.`,
        },
        { status: 400 }
      );
    }

    /*
     * Hash new PIN.
     */

    const newPinHash = await bcrypt.hash(
      newPin,
      12
    );

    /*
     * Update PIN.
     */

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        transactionPinHash: newPinHash,
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
          "Unable to change transaction PIN. Please try again.",
      },
      { status: 500 }
    );
  }
}