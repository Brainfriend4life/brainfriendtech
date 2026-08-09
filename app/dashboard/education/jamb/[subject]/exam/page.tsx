import { redirect } from "next/navigation";
import CbtExamClient from "./CbtExamClient";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function CbtExamPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const subjectName = subject
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");

  const cbtSubject =
    await prisma.cbtSubject.findFirst({
      where: {
        name: {
          equals: subjectName,
          mode: "insensitive",
        },
      },
      include: {
        exam: true,
        questions: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            question: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
          },
        },
      },
    });

  if (!cbtSubject) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          Subject Not Available
        </h1>

        <p className="mt-2 text-gray-500">
          This CBT subject has not been created yet.
        </p>
      </div>
    );
  }

  if (cbtSubject.questions.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          No Questions Yet
        </h1>

        <p className="mt-2 text-gray-500">
          Questions for {cbtSubject.name} have not been
          added yet.
        </p>
      </div>
    );
  }

  const attempt = await prisma.cbtAttempt.create({
    data: {
      userId: user.id,
      examId: cbtSubject.examId,
      status: "in_progress",
      totalMarks: cbtSubject.questions.length,
    },
  });

  return (
    <CbtExamClient
      attemptId={attempt.id}
      questions={cbtSubject.questions}
      duration={cbtSubject.exam.duration}
    />
  );
}