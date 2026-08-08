
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const {
      token,
      newPassword,
      confirmPassword,
    } = await req.json();

    // ==========================================
    // VALIDATION
    // ==========================================

    if (
      !token ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 6 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Passwords do not match.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // FIND USER WITH RESET TOKEN
    // ==========================================

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid or expired reset link.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // CHECK TOKEN EXPIRATION
    // ==========================================

    if (
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This reset link has expired. Please request a new one.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // HASH NEW PASSWORD
    // ==========================================

    const hashedPassword = await hash(
      newPassword,
      12
    );

    // ==========================================
    // UPDATE PASSWORD
    // ==========================================

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,

        // Invalidate the token immediately
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // ==========================================
    // SUCCESS
    // ==========================================

    return NextResponse.json({
      success: true,
      message:
        "Password reset successfully.",
    });
  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while resetting your password.",
      },
      {
        status: 500,
      }
    );
  }
}

