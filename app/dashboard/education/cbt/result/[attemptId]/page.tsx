import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, Trophy } from "lucide-react";

type Props = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function CbtResultPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { attemptId } = await params;

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const attempt = await prisma.cbtAttempt.findUnique({
    where: {
      id: attemptId,
    },
    include: {
      exam: true,
    },
  });

  if (!attempt) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          Result Not Found
        </h1>

        <p className="mt-2 text-gray-500">
          This examination result could not be found.
        </p>
      </div>
    );
  }

  if (attempt.userId !== user.id) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-red-600">
          Unauthorized
        </h1>

        <p className="mt-2 text-gray-500">
          You are not authorized to view this result.
        </p>
      </div>
    );
  }

  const percentage = Number(attempt.percentage);

  let remark = "Keep practicing!";
  let remarkColor = "text-orange-600";

  if (percentage >= 70) {
    remark = "Excellent performance!";
    remarkColor = "text-green-600";
  } else if (percentage >= 50) {
    remark = "Good performance. Keep improving!";
    remarkColor = "text-blue-600";
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Examination Result
        </h1>

        <p className="mt-1 text-gray-500">
          {attempt.exam.name}
        </p>
      </div>

      {/* RESULT CARD */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="bg-indigo-600 px-6 py-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Trophy className="h-8 w-8" />
          </div>

          <h2 className="mt-4 text-xl font-bold">
            Examination Completed
          </h2>

          <p className="mt-1 text-sm text-indigo-100">
            Your result is ready.
          </p>
        </div>

        {/* SCORE */}

        <div className="p-6 sm:p-8">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Your Score
            </p>

            <p className="mt-2 text-5xl font-bold text-gray-900">
              {attempt.score}
              <span className="text-2xl text-gray-400">
                {" "}
                / {attempt.totalMarks}
              </span>
            </p>

            <p className="mt-3 text-2xl font-bold text-indigo-600">
              {percentage.toFixed(1)}%
            </p>

            <p className={`mt-2 font-semibold ${remarkColor}`}>
              {remark}
            </p>
          </div>

          {/* DETAILS */}

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Score
              </p>

              <p className="mt-1 text-lg font-bold text-gray-900">
                {attempt.score}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Total Marks
              </p>

              <p className="mt-1 text-lg font-bold text-gray-900">
                {attempt.totalMarks}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Percentage
              </p>

              <p className="mt-1 text-lg font-bold text-gray-900">
                {percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* COMPLETED DATE */}

          {attempt.completedAt && (
            <p className="mt-6 text-center text-xs text-gray-400">
              Completed on{" "}
              {new Date(
                attempt.completedAt
              ).toLocaleString("en-NG")}
            </p>
          )}

          {/* ACTIONS */}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard/education"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Back to Education
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}

      <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

        <div>
          <p className="font-semibold text-green-800">
            Result saved successfully
          </p>

          <p className="mt-1 text-sm text-green-700">
            Your examination result has been saved to your account.
          </p>
        </div>
      </div>
    </div>
  );
}