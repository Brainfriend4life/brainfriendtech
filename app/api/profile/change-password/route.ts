
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { compare, hash } from "bcryptjs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // CHECK AUTHENTICATION
    // ==========================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    // ==========================================
    // GET REQUEST DATA
    // ==========================================

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = await req.json();

    // ==========================================
    // VALIDATION
    // ==========================================

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill in all fields.",
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
            "New password must be at least 6 characters.",
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
          message: "New passwords do not match.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // FIND USER
    // ==========================================

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ==========================================
    // VERIFY CURRENT PASSWORD
    // ==========================================

    const passwordIsValid = await compare(
      currentPassword,
      user.password
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Current password is incorrect.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // PREVENT SAME PASSWORD
    // ==========================================

    const samePassword = await compare(
      newPassword,
      user.password
    );

    if (samePassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New password must be different from your current password.",
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
      },
    });

    // ==========================================
    // SUCCESS
    // ==========================================

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error(
      "CHANGE PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while changing your password.",
      },
      {
        status: 500,
      }
    );
  }
}

