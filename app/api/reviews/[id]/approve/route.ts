import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const isAdmin =
    !!session?.user &&
    (session.user as { role?: Role }).role === Role.ADMIN;

  if (!isAdmin) {
    return NextResponse.json(
      {
        success: false,
        message: "Not authorized.",
      },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Review ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const approved = Boolean(body.approved);

    const updated = await prisma.review.update({
      where: {
        id,
      },
      data: {
        approved,
      },
    });

    return NextResponse.json({
      success: true,
      message: approved
        ? "Review approved successfully."
        : "Review rejected successfully.",
      review: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/reviews/[id]/approve error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update review.",
      },
      { status: 500 }
    );
  }
}