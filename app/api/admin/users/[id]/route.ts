import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User ID is required.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.json();

    const requestedStatus =
      body?.status;

    if (
      requestedStatus !== "ACTIVE" &&
      requestedStatus !== "SUSPENDED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Status must be ACTIVE or SUSPENDED.",
        },
        { status: 400 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id,
        },

        data: {
          status:
            requestedStatus,
        },

        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          walletBalance: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,

      message:
        requestedStatus ===
        "ACTIVE"
          ? "User activated successfully."
          : "User suspended successfully.",

      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "ADMIN USER STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update user status.",
      },
      { status: 500 }
    );
  }
}