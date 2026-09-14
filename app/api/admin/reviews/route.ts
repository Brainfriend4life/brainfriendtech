import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // adjust to your actual NextAuth config path
import { prisma } from "@/lib/prisma"; // adjust to your Prisma client singleton
import { Role } from "@prisma/client";

// File location: app/api/admin/reviews/route.ts
//
// Lists reviews for the admin queue. Defaults to pending (approved: false)
// since that's the actionable list; pass ?status=approved or ?status=all
// for the other views.

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    !!session?.user && (session.user as { role?: Role }).role === Role.ADMIN;

  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: "Not authorized." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const where =
    status === "approved"
      ? { approved: true }
      : status === "all"
      ? {}
      : { approved: false };

  try {
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayName: true,
        role: true,
        rating: true,
        review: true,
        approved: true,
        verified: true,
        createdAt: true,
        userId: true,
        user: {
          select: { email: true, fullName: true },
        },
      },
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load reviews." },
      { status: 500 }
    );
  }
}