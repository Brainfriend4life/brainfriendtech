
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "You do not have permission to perform this action.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      examId,
      name,
      description,
    } = body;

    if (!examId || !name?.trim()) {
      return NextResponse.json(
        {
          error:
            "Exam ID and subject name are required.",
        },
        { status: 400 }
      );
    }

    const exam =
      await prisma.cbtExam.findUnique({
        where: {
          id: examId,
        },
      });

    if (!exam) {
      return NextResponse.json(
        {
          error: "CBT examination not found.",
        },
        { status: 404 }
      );
    }

    const existingSubject =
      await prisma.cbtSubject.findUnique({
        where: {
          examId_name: {
            examId,
            name: name.trim(),
          },
        },
      });

    if (existingSubject) {
      return NextResponse.json(
        {
          error:
            "This subject already exists in this examination.",
        },
        { status: 409 }
      );
    }

    const subject =
      await prisma.cbtSubject.create({
        data: {
          examId,
          name: name.trim(),
          description:
            description?.trim() || null,
        },
      });

    return NextResponse.json(
      {
        success: true,
        subject,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE CBT SUBJECT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create CBT subject.",
      },
      { status: 500 }
    );
  }
}

