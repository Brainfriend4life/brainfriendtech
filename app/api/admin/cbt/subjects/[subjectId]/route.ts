import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    subjectId: string;
  }>;
};

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

    const { subjectId } = await params;

    const subject = await prisma.cbtSubject.findUnique({
      where: {
        id: subjectId,
      },
      include: {
        questions: true,
      },
    });

    if (!subject) {
      return NextResponse.json(
        {
          error: "Subject not found.",
        },
        { status: 404 }
      );
    }

    await prisma.cbtSubject.delete({
      where: {
        id: subjectId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE SUBJECT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to delete subject.",
      },
      { status: 500 }
    );
  }
}