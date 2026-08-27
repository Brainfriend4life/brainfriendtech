import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest
) {
  try {
    const session = await getServerSession(
      authOptions
    );

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
      otp,
      newPin,
      confirmPin,
    } = body;

    if (!otp || !newPin || !confirmPin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please complete all required fields.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate OTP.
     */

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Verification code must be exactly 6 digits.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate PIN.
     */

    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New PIN must be exactly 4 digits.",
        },
        { status: 400 }
      );
    }

    if (newPin !== confirmPin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New PINs do not match.",
        },
        { status: 400 }
      );
    }

    const email = session.user.email
      .trim()
      .toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        transactionPinHash: true,
        transactionPinResetOtp: true,
        transactionPinResetOtpExpires: true,
        transactionPinResetAttempts: true,
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

    /*
     * Make sure an OTP was requested.
     */

    if (
      !user.transactionPinResetOtp ||
      !user.transactionPinResetOtpExpires
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No PIN reset request found. Please request a new verification code.",
        },
        { status: 400 }
      );
    }

    /*
     * Check OTP expiry.
     */

    if (
      user.transactionPinResetOtpExpires <
      new Date()
    ) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          transactionPinResetOtp: null,
          transactionPinResetOtpExpires:
            null,
          transactionPinResetAttempts: 0,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Verification code has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    /*
     * Limit incorrect OTP attempts.
     */

    const attempts =
      user.transactionPinResetAttempts || 0;

    if (attempts >= 5) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          transactionPinResetOtp: null,
          transactionPinResetOtpExpires:
            null,
          transactionPinResetAttempts: 0,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Too many incorrect attempts. Please request a new verification code.",
        },
        { status: 429 }
      );
    }

    /*
     * Compare OTP.
     */

    if (otp !== user.transactionPinResetOtp) {
      const newAttempts = attempts + 1;

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          transactionPinResetAttempts:
            newAttempts,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: `Incorrect verification code. ${
            5 - newAttempts
          } attempt${
            5 - newAttempts === 1
              ? ""
              : "s"
          } remaining.`,
        },
        { status: 400 }
      );
    }

    /*
     * If the new PIN happens to be the same
     * as the existing PIN, reject it.
     */

    if (user.transactionPinHash) {
      const samePin = await bcrypt.compare(
        newPin,
        user.transactionPinHash
      );

      if (samePin) {
        return NextResponse.json(
          {
            success: false,
            message:
              "New PIN must be different from your previous PIN.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Hash new PIN.
     */

    const hashedPin = await bcrypt.hash(
      newPin,
      12
    );

    /*
     * Update PIN and invalidate OTP.
     */

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

        transactionPinResetOtp: null,
        transactionPinResetOtpExpires:
          null,
        transactionPinResetAttempts: 0,
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
      "VERIFY TRANSACTION PIN RESET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to reset transaction PIN. Please try again.",
      },
      { status: 500 }
    );
  }
}