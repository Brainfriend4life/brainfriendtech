
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  FileQuestion,
  Pencil,
  Trash2,
} from "lucide-react";

type Props = {
  params: Promise<{
    id: string;
    subjectId: string;
  }>;
};

export default async function AdminQuestionsPage({
  params,
}: Props) {
  const { id, subjectId } = await params;

  const subject = await prisma.cbtSubject.findFirst({
    where: {
      id: subjectId,
      examId: id,
    },
    include: {
      exam: true,
      questions: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!subject) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-start gap-3">

          <Link
            href={`/dashboard/admin/cbt/${id}`}
            className="mt-1 rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {subject.name}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {subject.exam.name}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {subject.questions.length} question
              {subject.questions.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

        </div>


        {/* ADD QUESTION */}

        <Link
          href={`/dashboard/admin/cbt/${id}/subjects/${subjectId}/questions/create`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />

          Add Question
        </Link>

      </div>


      {/* DESCRIPTION */}

      {subject.description && (
        <div className="rounded-2xl bg-indigo-50 p-5">
          <p className="text-sm text-indigo-900">
            {subject.description}
          </p>
        </div>
      )}


      {/* NO QUESTIONS */}

      {subject.questions.length === 0 ? (

        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <FileQuestion className="h-8 w-8 text-indigo-600" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-gray-900">
            No questions yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Add your first question to this subject.
          </p>

          <Link
            href={`/dashboard/admin/cbt/${id}/subjects/${subjectId}/questions/create`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />

            Add First Question
          </Link>

        </div>

      ) : (

        /* QUESTIONS */

        <div className="space-y-5">

          {subject.questions.map(
            (question, index) => (

              <div
                key={question.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >

                {/* QUESTION HEADER */}

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-start gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                      {index + 1}
                    </div>

                    <div>
                      <h2 className="font-semibold text-gray-900">
                        Question {index + 1}
                      </h2>

                      <p className="mt-1 text-xs text-gray-500">
                        {question.marks} mark
                        {question.marks !== 1
                          ? "s"
                          : ""}
                      </p>
                    </div>

                  </div>


                  {/* STATUS */}

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      question.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {question.isActive
                      ? "Active"
                      : "Inactive"}
                  </span>

                </div>


                {/* QUESTION TEXT */}

                <div className="mt-5 rounded-xl bg-gray-50 p-4">

                  <p className="whitespace-pre-wrap text-gray-900">
                    {question.question}
                  </p>

                </div>


                {/* OPTIONS */}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  <div
                    className={`rounded-xl border p-4 ${
                      question.correctAnswer === "A"
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <span className="font-bold">
                      A.
                    </span>{" "}
                    {question.optionA}

                    {question.correctAnswer ===
                      "A" && (
                      <span className="ml-2 text-xs font-semibold text-green-700">
                        Correct Answer
                      </span>
                    )}
                  </div>


                  <div
                    className={`rounded-xl border p-4 ${
                      question.correctAnswer === "B"
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <span className="font-bold">
                      B.
                    </span>{" "}
                    {question.optionB}

                    {question.correctAnswer ===
                      "B" && (
                      <span className="ml-2 text-xs font-semibold text-green-700">
                        Correct Answer
                      </span>
                    )}
                  </div>


                  <div
                    className={`rounded-xl border p-4 ${
                      question.correctAnswer === "C"
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <span className="font-bold">
                      C.
                    </span>{" "}
                    {question.optionC}

                    {question.correctAnswer ===
                      "C" && (
                      <span className="ml-2 text-xs font-semibold text-green-700">
                        Correct Answer
                      </span>
                    )}
                  </div>


                  <div
                    className={`rounded-xl border p-4 ${
                      question.correctAnswer === "D"
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <span className="font-bold">
                      D.
                    </span>{" "}
                    {question.optionD}

                    {question.correctAnswer ===
                      "D" && (
                      <span className="ml-2 text-xs font-semibold text-green-700">
                        Correct Answer
                      </span>
                    )}
                  </div>

                </div>


                {/* EXPLANATION */}

                {question.explanation && (
                  <div className="mt-5 rounded-xl bg-blue-50 p-4">

                    <p className="text-xs font-semibold text-blue-700">
                      Explanation
                    </p>

                    <p className="mt-1 text-sm text-blue-900">
                      {question.explanation}
                    </p>

                  </div>
                )}


                {/* ACTIONS */}

                <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-5">

                  {/* EDIT */}

                  <Link
                    href={`/dashboard/admin/cbt/${id}/subjects/${subjectId}/questions/${question.id}/edit`}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <Pencil className="h-4 w-4" />

                    Edit Question
                  </Link>


                  {/* DELETE */}

                  <Link
                    href={`/dashboard/admin/cbt/${id}/subjects/${subjectId}/questions/${question.id}/delete`}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />

                    Delete Question
                  </Link>

                </div>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
}

