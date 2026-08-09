import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileQuestion,
  GraduationCap,
  Plus,
  Pencil,
  ListChecks,
} from "lucide-react";

import DeleteQuestionButton from "./DeleteQuestionButton";
import DeleteSubjectButton from "./DeleteSubjectButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminManageCbtPage({
  params,
}: Props) {
  const { id } = await params;

  const exam = await prisma.cbtExam.findUnique({
    where: {
      id,
    },
    include: {
      subjects: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          questions: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
  });

  if (!exam) {
    notFound();
  }

  const questionCount = exam.subjects.reduce(
    (total, subject) =>
      total + subject.questions.length,
    0
  );

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/admin/cbt"
            className="mt-1 rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {exam.name}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {exam.description ||
                "Manage this CBT examination."}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/admin/cbt/${exam.id}/subjects/create`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          Add Subject
        </Link>
      </div>

      {/* EXAM SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* DURATION */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <Clock className="h-5 w-5 text-indigo-600" />

          <p className="mt-3 text-sm text-gray-500">
            Duration
          </p>

          <p className="mt-1 text-xl font-bold text-gray-900">
            {exam.duration} minutes
          </p>
        </div>

        {/* SUBJECTS */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <BookOpen className="h-5 w-5 text-indigo-600" />

          <p className="mt-3 text-sm text-gray-500">
            Subjects
          </p>

          <p className="mt-1 text-xl font-bold text-gray-900">
            {exam.subjects.length}
          </p>
        </div>

        {/* QUESTIONS */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <FileQuestion className="h-5 w-5 text-indigo-600" />

          <p className="mt-3 text-sm text-gray-500">
            Questions
          </p>

          <p className="mt-1 text-xl font-bold text-gray-900">
            {questionCount}
          </p>
        </div>

        {/* ATTEMPTS */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <GraduationCap className="h-5 w-5 text-indigo-600" />

          <p className="mt-3 text-sm text-gray-500">
            Attempts
          </p>

          <p className="mt-1 text-xl font-bold text-gray-900">
            {exam._count.attempts}
          </p>
        </div>
      </div>

      {/* SUBJECTS */}
      <div className="space-y-5">

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Subjects
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add subjects and manage their questions.
          </p>
        </div>

        {/* NO SUBJECTS */}
        {exam.subjects.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
              <BookOpen className="h-8 w-8 text-indigo-600" />
            </div>

            <h3 className="mt-5 text-lg font-bold text-gray-900">
              No subjects yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Add your first subject before creating
              examination questions.
            </p>

            <Link
              href={`/dashboard/admin/cbt/${exam.id}/subjects/create`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              Add Subject
            </Link>
          </div>
        ) : (

          <div className="space-y-6">

            {exam.subjects.map((subject) => (
              <div
                key={subject.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >

                {/* SUBJECT HEADER */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                  <div className="flex items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                      <BookOpen className="h-6 w-6 text-indigo-600" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {subject.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {subject.description ||
                          "No description provided."}
                      </p>

                      <p className="mt-2 text-sm font-medium text-indigo-600">
                        {subject.questions.length}{" "}
                        {subject.questions.length === 1
                          ? "question"
                          : "questions"}
                      </p>
                    </div>
                  </div>

                  {/* SUBJECT ACTIONS */}
                  <div className="flex flex-wrap gap-3">

                    {/* VIEW QUESTIONS */}
                    <Link
                      href={`/dashboard/admin/cbt/${exam.id}/subjects/${subject.id}/questions`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      <ListChecks className="h-4 w-4" />
                      View Questions
                    </Link>

                    {/* ADD QUESTION */}
                    <Link
                      href={`/dashboard/admin/cbt/${exam.id}/subjects/${subject.id}/questions/create`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Question
                    </Link>

                    {/* DELETE SUBJECT */}
                    <DeleteSubjectButton
                      subjectId={subject.id}
                      subjectName={subject.name}
                    />
                  </div>
                </div>

                {/* QUESTIONS */}
                {subject.questions.length > 0 && (
                  <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">

                    {subject.questions.map(
                      (question, index) => (
                        <div
                          key={question.id}
                          className="rounded-xl border border-gray-100 bg-gray-50 p-5"
                        >

                          {/* QUESTION TOP */}
                          <div className="flex items-start justify-between gap-4">

                            <div className="flex min-w-0 items-start gap-3">

                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600">
                                {index + 1}
                              </div>

                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">
                                  {question.question}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {question.marks}{" "}
                                  {question.marks === 1
                                    ? "mark"
                                    : "marks"}
                                </p>
                              </div>
                            </div>

                            {/* QUESTION ACTIONS */}
                            <div className="flex shrink-0 items-center gap-2">

                              {/* EDIT */}
                              <Link
                                href={`/dashboard/admin/cbt/${exam.id}/subjects/${subject.id}/questions/${question.id}/edit`}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Link>

                              {/* DELETE */}
                              <DeleteQuestionButton
                                questionId={question.id}
                              />
                            </div>
                          </div>

                          {/* OPTIONS */}
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">

                            {/* OPTION A */}
                            <div
                              className={`rounded-lg border p-3 text-sm ${
                                question.correctAnswer === "A"
                                  ? "border-green-300 bg-green-50 text-green-800"
                                  : "border-gray-200 bg-white text-gray-600"
                              }`}
                            >
                              <span className="font-bold">
                                A:
                              </span>{" "}
                              {question.optionA}
                            </div>

                            {/* OPTION B */}
                            <div
                              className={`rounded-lg border p-3 text-sm ${
                                question.correctAnswer === "B"
                                  ? "border-green-300 bg-green-50 text-green-800"
                                  : "border-gray-200 bg-white text-gray-600"
                              }`}
                            >
                              <span className="font-bold">
                                B:
                              </span>{" "}
                              {question.optionB}
                            </div>

                            {/* OPTION C */}
                            <div
                              className={`rounded-lg border p-3 text-sm ${
                                question.correctAnswer === "C"
                                  ? "border-green-300 bg-green-50 text-green-800"
                                  : "border-gray-200 bg-white text-gray-600"
                              }`}
                            >
                              <span className="font-bold">
                                C:
                              </span>{" "}
                              {question.optionC}
                            </div>

                            {/* OPTION D */}
                            <div
                              className={`rounded-lg border p-3 text-sm ${
                                question.correctAnswer === "D"
                                  ? "border-green-300 bg-green-50 text-green-800"
                                  : "border-gray-200 bg-white text-gray-600"
                              }`}
                            >
                              <span className="font-bold">
                                D:
                              </span>{" "}
                              {question.optionD}
                            </div>
                          </div>

                          {/* QUESTION INFO */}
                          <div className="mt-4 flex flex-wrap gap-2">

                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Correct:{" "}
                              {question.correctAnswer}
                            </span>

                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                              {question.marks}{" "}
                              {question.marks === 1
                                ? "mark"
                                : "marks"}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                question.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {question.isActive
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>

                          {/* EXPLANATION */}
                          {question.explanation && (
                            <div className="mt-4 rounded-lg bg-blue-50 p-3">
                              <p className="text-xs font-semibold text-blue-700">
                                Explanation
                              </p>

                              <p className="mt-1 text-sm text-blue-900">
                                {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}