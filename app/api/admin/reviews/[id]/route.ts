import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
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

    await prisma.review.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/reviews/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete this review.",
      },
      { status: 500 }
    );
  }
}