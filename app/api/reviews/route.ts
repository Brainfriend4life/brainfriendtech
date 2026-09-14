import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // adjust to your actual NextAuth config path
import { prisma } from "@/lib/prisma"; // adjust to your Prisma client singleton

const MIN_REVIEW_LENGTH = 10;
const MAX_REVIEW_LENGTH = 500;
const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE)
  );

  try {
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { approved: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          displayName: true,
          role: true,
          rating: true,
          review: true,
          verified: true,
          createdAt: true,
        },
      }),
      prisma.review.count({ where: { approved: true } }),
    ]);

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load reviews right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: "You must be logged in to leave a review." },
      { status: 401 }
    );
  }

  const userId = (session.user as { id?: string }).id;

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "You must be logged in to leave a review." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;
  const displayName = String(data?.displayName ?? "").trim().slice(0, 60);
  const role = String(data?.role ?? "").trim().slice(0, 60);
  const rating = Number(data?.rating);
  const review = String(data?.review ?? "").trim().slice(0, MAX_REVIEW_LENGTH);

  if (!displayName) {
    return NextResponse.json(
      {
        success: false,
        message: "Please enter a name to display with your review.",
      },
      { status: 400 }
    );
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { success: false, message: "Please select a star rating between 1 and 5." },
      { status: 400 }
    );
  }
  if (review.length < MIN_REVIEW_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        message: `Please write at least ${MIN_REVIEW_LENGTH} characters.`,
      },
      { status: 400 }
    );
  }

  try {
    // A reviewer counts as "verified" if they've completed at least one
    // real transaction (matches your Transaction.status === "SUCCESS").
    const successfulTransactionCount = await prisma.transaction.count({
      where: { userId, status: "SUCCESS", isTest: false },
    });

    await prisma.review.create({
      data: {
        displayName,
        role: role || null,
        rating,
        review,
        userId,
        verified: successfulTransactionCount > 0,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Thanks! Your review has been submitted and will appear once it's approved.",
    });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to submit your review." },
      { status: 500 }
    );
  }
}