import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Admin access required.",
        },
        { status: 403 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        {
          error: "Your account is suspended.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      name,
      description,
      duration,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        {
          error:
            "Examination name is required.",
        },
        { status: 400 }
      );
    }

    const durationNumber = Number(duration);

    if (
      !Number.isInteger(durationNumber) ||
      durationNumber <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Duration must be a positive number.",
        },
        { status: 400 }
      );
    }

    const exam =
      await prisma.cbtExam.create({
        data: {
          name: String(name).trim(),
          description:
            description
              ? String(description).trim()
              : null,
          duration: durationNumber,
          totalMarks: 0,
          isActive: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        exam,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE CBT EXAM ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create examination.",
      },
      { status: 500 }
    );
  }
}