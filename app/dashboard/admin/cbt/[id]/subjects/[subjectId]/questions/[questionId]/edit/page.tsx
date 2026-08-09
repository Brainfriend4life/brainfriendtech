
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import EditQuestionForm from "./EditQuestionForm";

type Props = {
  params: Promise<{
    id: string;
    subjectId: string;
    questionId: string;
  }>;
};

export default async function EditQuestionPage({
  params,
}: Props) {
  const {
    id,
    subjectId,
    questionId,
  } = await params;

  const question =
    await prisma.cbtQuestion.findFirst({
      where: {
        id: questionId,
        subjectId,
      },
      include: {
        subject: {
          include: {
            exam: true,
          },
        },
      },
    });

  if (!question) {
    notFound();
  }

  if (question.subject.examId !== id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* HEADER */}

      <div className="flex items-start gap-3">
        <Link
          href={`/dashboard/admin/cbt/${id}/subjects/${subjectId}/questions`}
          className="mt-1 rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Question
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Update this question in{" "}
            <span className="font-semibold text-indigo-600">
              {question.subject.name}
            </span>
          </p>
        </div>
      </div>

      {/* FORM */}

      <EditQuestionForm
        examId={id}
        subjectId={subjectId}
        questionId={question.id}
        subjectName={question.subject.name}
        initialQuestion={question.question}
        initialOptionA={question.optionA}
        initialOptionB={question.optionB}
        initialOptionC={question.optionC}
        initialOptionD={question.optionD}
        initialCorrectAnswer={
          question.correctAnswer
        }
        initialMarks={question.marks}
        initialExplanation={
          question.explanation || ""
        }
        initialIsActive={question.isActive}
      />
    </div>
  );
}

