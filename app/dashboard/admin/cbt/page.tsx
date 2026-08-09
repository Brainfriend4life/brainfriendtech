import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Plus,
  GraduationCap,
  Clock,
  BookOpen,
  FileQuestion,
} from "lucide-react";

export default async function AdminCbtPage() {
  const exams = await prisma.cbtExam.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      subjects: {
        include: {
          questions: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
  });

  const getQuestionCount = (exam: (typeof exams)[number]) => {
    return exam.subjects.reduce(
      (total, subject) =>
        total + subject.questions.length,
      0
    );
  };

  return (
    <div className="space-y-8">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            CBT Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage your CBT examinations,
            subjects and questions.
          </p>
        </div>

        <Link
          href="/dashboard/admin/cbt/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />

          Create New Exam
        </Link>

      </div>


      {/* EXAMS */}

      {exams.length === 0 ? (

        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">

            <GraduationCap className="h-8 w-8 text-indigo-600" />

          </div>

          <h2 className="mt-5 text-lg font-bold text-gray-900">
            No CBT examinations yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Create your first CBT examination to start
            adding subjects and questions.
          </p>

          <Link
            href="/dashboard/admin/cbt/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />

            Create Examination
          </Link>

        </div>

      ) : (

        <div className="grid gap-6 lg:grid-cols-2">

          {exams.map((exam) => {

            const questionCount =
              getQuestionCount(exam);

            const subjectCount =
              exam.subjects.length;

            return (
              <div
                key={exam.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >

                {/* TITLE */}

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">

                      <GraduationCap className="h-6 w-6 text-indigo-600" />

                    </div>

                    <div>

                      <h2 className="text-lg font-bold text-gray-900">
                        {exam.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {exam.description ||
                          "No description provided."}
                      </p>

                    </div>

                  </div>


                  {/* STATUS */}

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      exam.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {exam.isActive
                      ? "Active"
                      : "Inactive"}
                  </span>

                </div>


                {/* STATS */}

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

                  <div className="rounded-xl bg-gray-50 p-3">

                    <Clock className="h-4 w-4 text-indigo-600" />

                    <p className="mt-2 text-xs text-gray-500">
                      Duration
                    </p>

                    <p className="font-semibold text-gray-900">
                      {exam.duration} min
                    </p>

                  </div>


                  <div className="rounded-xl bg-gray-50 p-3">

                    <BookOpen className="h-4 w-4 text-indigo-600" />

                    <p className="mt-2 text-xs text-gray-500">
                      Subjects
                    </p>

                    <p className="font-semibold text-gray-900">
                      {subjectCount}
                    </p>

                  </div>


                  <div className="rounded-xl bg-gray-50 p-3">

                    <FileQuestion className="h-4 w-4 text-indigo-600" />

                    <p className="mt-2 text-xs text-gray-500">
                      Questions
                    </p>

                    <p className="font-semibold text-gray-900">
                      {questionCount}
                    </p>

                  </div>


                  <div className="rounded-xl bg-gray-50 p-3">

                    <GraduationCap className="h-4 w-4 text-indigo-600" />

                    <p className="mt-2 text-xs text-gray-500">
                      Attempts
                    </p>

                    <p className="font-semibold text-gray-900">
                      {exam._count.attempts}
                    </p>

                  </div>

                </div>


                {/* ACTIONS */}

                <div className="mt-6 flex flex-wrap gap-3">

                  <Link
                    href={`/dashboard/admin/cbt/${exam.id}`}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Manage Exam
                  </Link>

                </div>

              </div>
            );
          })}

        </div>

      )}

    </div>
  );
}