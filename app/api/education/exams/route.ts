import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const exams = await prisma.cbtExam.findMany({
      where: {
        isActive: true,
      },
      include: {
        subjects: {
          where: {
            questions: {
              some: {
                isActive: true,
              },
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      exams,
    });
  } catch (error) {
    console.error("GET CBT EXAMS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load CBT exams.",
      },
      {
        status: 500,
      }
    );
  }
}