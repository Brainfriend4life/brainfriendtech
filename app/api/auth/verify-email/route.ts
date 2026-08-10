import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request
) {
  try {
    const { searchParams } =
      new URL(req.url);

    const token =
      searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Verification token is required.",
        },
        { status: 400 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          emailVerificationToken:
            token,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid verification link.",
        },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message:
          "Your email is already verified.",
      });
    }

    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires <
        new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This verification link has expired.",
        },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        emailVerified: true,

        emailVerificationToken:
          null,

        emailVerificationExpires:
          null,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error(
      "VERIFY EMAIL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to verify email.",
      },
      { status: 500 }
    );
  }
}