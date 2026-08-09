
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Only admins can add questions
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Admins only." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      subjectId,
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      marks,
    } = body;

    // Validate required fields
    if (
      !subjectId ||
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
            "Question, subject, all options and correct answer are required.",
        },
        { status: 400 }
      );
    }

    // Validate answer
    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      return NextResponse.json(
        { error: "Invalid correct answer." },
        { status: 400 }
      );
    }

    // Validate marks
    const questionMarks = Number(marks ?? 1);

    if (
      !Number.isInteger(questionMarks) ||
      questionMarks < 1
    ) {
      return NextResponse.json(
        { error: "Marks must be a whole number greater than 0." },
        { status: 400 }
      );
    }

    // Make sure the subject exists
    const subject = await prisma.cbtSubject.findUnique({
      where: {
        id: subjectId,
      },
      include: {
        exam: true,
      },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 }
      );
    }

    // Create question
    const newQuestion = await prisma.cbtQuestion.create({
      data: {
        subjectId,
        question: question.trim(),
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        optionC: optionC.trim(),
        optionD: optionD.trim(),
        correctAnswer,
        explanation:
          explanation?.trim() || null,
        marks: questionMarks,
        isActive: true,
      },
    });

    // Update total marks for the exam
    const subjects = await prisma.cbtSubject.findMany({
      where: {
        examId: subject.examId,
      },
      include: {
        questions: {
          where: {
            isActive: true,
          },
          select: {
            marks: true,
          },
        },
      },
    });

    const totalMarks = subjects.reduce(
      (total, currentSubject) => {
        return (
          total +
          currentSubject.questions.reduce(
            (subjectTotal, currentQuestion) =>
              subjectTotal + currentQuestion.marks,
            0
          )
        );
      },
      0
    );

    await prisma.cbtExam.update({
      where: {
        id: subject.examId,
      },
      data: {
        totalMarks,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Question added successfully.",
        question: newQuestion,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "ADMIN CBT QUESTION CREATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to add question.",
      },
      { status: 500 }
    );
  }
}

