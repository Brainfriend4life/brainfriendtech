
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },

        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          walletBalance: true,
          role: true,
          createdAt: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "PROFILE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load profile",
      },
      {
        status: 500,
      }
    );
  }
}

