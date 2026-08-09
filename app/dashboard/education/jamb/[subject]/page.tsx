import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  FileQuestion,
  CheckCircle,
} from "lucide-react";

const subjectNames: Record<string, string> = {
  "english-language": "English Language",
  mathematics: "Mathematics",
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
  economics: "Economics",
};

export default async function JambSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;

  const subjectName =
    subjectNames[subject] || "JAMB Subject";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* BACK */}

      <Link
        href="/dashboard/education/jamb"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to JAMB Subjects
      </Link>

      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {subjectName}
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          JAMB CBT practice for {subjectName}.
        </p>
      </div>

      {/* INSTRUCTIONS */}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-gray-900">
          Before You Start
        </h2>

        <div className="mt-6 space-y-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <FileQuestion className="h-5 w-5 text-indigo-600" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                Multiple Choice Questions
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Answer each question by selecting one of the available
                options.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                Time Limit
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                The examination will have a time limit. The timer will
                continue after you start.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <CheckCircle className="h-5 w-5 text-indigo-600" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                Automatic Result
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Your answers will be marked automatically and your score
                will be displayed after submission.
              </p>
            </div>
          </div>
        </div>

        {/* CURRENT STATUS */}

        <div className="mt-8 rounded-xl bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-700">
            Practice status
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Questions for this subject will be loaded from the Brainfriend
            CBT database.
          </p>
        </div>

        {/* START BUTTON */}

        <div className="mt-8">
          <Link
            href={`/dashboard/education/jamb/${subject}/start`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            Start CBT Practice
          </Link>
        </div>
      </div>
    </div>
  );
}