
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  Clock,
  XCircle,
  Trophy,
} from "lucide-react";

export default async function AdminResultsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const attempts = await prisma.cbtAttempt.findMany({
    orderBy: {
      startedAt: "desc",
    },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      exam: {
        select: {
          id: true,
          name: true,
          totalMarks: true,
        },
      },
    },
  });

  const completed = attempts.filter(
    (attempt) => attempt.status === "completed"
  );

  const passed = completed.filter(
    (attempt) => attempt.percentage >= 50
  );

  const pending = attempts.filter(
    (attempt) => attempt.status === "pending"
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/admin"
            className="mt-1 rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              CBT Results
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Monitor students' examination attempts and results.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <GraduationCap className="h-6 w-6 text-indigo-600" />

          <p className="mt-3 text-sm text-gray-500">
            Total Attempts
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {attempts.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <CheckCircle2 className="h-6 w-6 text-green-600" />

          <p className="mt-3 text-sm text-gray-500">
            Completed
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {completed.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <Trophy className="h-6 w-6 text-blue-600" />

          <p className="mt-3 text-sm text-gray-500">
            Passed
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {passed.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <Clock className="h-6 w-6 text-yellow-600" />

          <p className="mt-3 text-sm text-gray-500">
            Pending
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pending.length}
          </p>
        </div>
      </div>

      {/* RESULTS */}
      {attempts.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <GraduationCap className="h-8 w-8 text-indigo-600" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-gray-900">
            No CBT results yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Student examination attempts will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Student
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Examination
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Score
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Percentage
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {attempts.map((attempt) => {
                  const isCompleted =
                    attempt.status === "completed";

                  const isPassed =
                    isCompleted && attempt.percentage >= 50;

                  return (
                    <tr
                      key={attempt.id}
                      className="transition hover:bg-gray-50"
                    >
                      {/* STUDENT */}
                      <td className="px-5 py-4">
                        <div className="min-w-[190px]">
                          <p className="font-semibold text-gray-900">
                            {attempt.user.fullName}
                          </p>

                          <p className="text-xs text-gray-500">
                            {attempt.user.email}
                          </p>
                        </div>
                      </td>

                      {/* EXAM */}
                      <td className="px-5 py-4">
                        <p className="min-w-[180px] font-medium text-gray-900">
                          {attempt.exam.name}
                        </p>
                      </td>

                      {/* SCORE */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-gray-900">
                          {attempt.score} /{" "}
                          {attempt.totalMarks ||
                            attempt.exam.totalMarks}
                        </p>
                      </td>

                      {/* PERCENTAGE */}
                      <td className="px-5 py-4">
                        <span
                          className={`font-bold ${
                            isPassed
                              ? "text-green-600"
                              : isCompleted
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {attempt.percentage.toFixed(1)}%
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">
                        {isCompleted ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                              isPassed
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isPassed ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}

                            {isPassed ? "Passed" : "Failed"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                            <Clock className="h-3.5 w-3.5" />
                            {attempt.status}
                          </span>
                        )}
                      </td>

                      {/* DATE */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="text-sm text-gray-700">
                          {new Date(
                            attempt.startedAt
                          ).toLocaleDateString("en-NG", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>

                        <p className="text-xs text-gray-400">
                          {new Date(
                            attempt.startedAt
                          ).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

