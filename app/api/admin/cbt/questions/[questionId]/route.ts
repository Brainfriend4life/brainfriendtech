import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    questionId: string;
  }>;
};

export async function PUT(
  request: Request,
  { params }: Props
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { questionId } = await params;

    const body = await request.json();

    const {
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      marks,
      isActive,
    } = body;

    if (
      !question ||
      !optionA ||
      !optionB ||
      !optionC ||
      !optionD ||
      !correctAnswer
    ) {
      return NextResponse.json(
        {
          error:
            "Question, all options and correct answer are required.",
        },
        { status: 400 }
      );
    }

    const updatedQuestion =
      await prisma.cbtQuestion.update({
        where: {
          id: questionId,
        },
        data: {
          question,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswer,
          explanation:
            explanation || null,
          marks: Number(marks) || 1,
          isActive:
            typeof isActive === "boolean"
              ? isActive
              : true,
        },
      });

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error(
      "UPDATE QUESTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update question.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: Props
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { questionId } = await params;

    const question =
      await prisma.cbtQuestion.findUnique({
        where: {
          id: questionId,
        },
      });

    if (!question) {
      return NextResponse.json(
        {
          error: "Question not found.",
        },
        { status: 404 }
      );
    }

    await prisma.cbtQuestion.delete({
      where: {
        id: questionId,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Question deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE QUESTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete question.",
      },
      { status: 500 }
    );
  }
}