import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { attemptId, answers } = body;

    if (!attemptId || !answers) {
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const attempt = await prisma.cbtAttempt.findUnique({
      where: {
        id: attemptId,
      },
      include: {
        exam: true,
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "CBT attempt not found." },
        { status: 404 }
      );
    }

    // Make sure this attempt belongs to the logged-in user
    if (attempt.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized attempt." },
        { status: 403 }
      );
    }

    // Prevent submitting the same attempt twice
    if (attempt.status === "completed") {
      return NextResponse.json(
        { error: "This examination has already been submitted." },
        { status: 400 }
      );
    }

    const questionIds = Object.keys(answers);

    const questions = await prisma.cbtQuestion.findMany({
      where: {
        id: {
          in: questionIds,
        },
        isActive: true,
      },
    });

    let score = 0;
    let totalMarks = 0;

    const answerRecords = [];

    for (const question of questions) {
      const selectedAnswer = answers[question.id];

      const isCorrect =
        selectedAnswer === question.correctAnswer;

      const marksAwarded = isCorrect ? question.marks : 0;

      totalMarks += question.marks;

      if (isCorrect) {
        score += question.marks;
      }

      answerRecords.push({
        attemptId: attempt.id,
        questionId: question.id,
        selectedAnswer: selectedAnswer || null,
        isCorrect,
        marksAwarded,
      });
    }

    const percentage =
      totalMarks > 0
        ? (score / totalMarks) * 100
        : 0;

    // Save answers and complete attempt
    await prisma.$transaction([
      prisma.cbtAnswer.deleteMany({
        where: {
          attemptId: attempt.id,
        },
      }),

      prisma.cbtAnswer.createMany({
        data: answerRecords,
      }),

      prisma.cbtAttempt.update({
        where: {
          id: attempt.id,
        },
        data: {
          status: "completed",
          score,
          totalMarks,
          percentage,
          completedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      score,
      totalMarks,
      percentage,
      attemptId: attempt.id,
    });
  } catch (error) {
    console.error("CBT SUBMISSION ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to submit examination.",
      },
      {
        status: 500,
      }
    );
  }
}