import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    await prisma.dataPlan.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data plan deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE DATA PLAN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete data plan.",
      },
      { status: 500 }
    );
  }
}