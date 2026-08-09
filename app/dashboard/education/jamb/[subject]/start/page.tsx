import Link from "next/link";
import { ArrowLeft, Clock, FileQuestion } from "lucide-react";

export default async function StartCbtPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;

  const subjectName = subject
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href={`/dashboard/education/jamb/${subject}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <FileQuestion className="h-8 w-8 text-indigo-600" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">
            {subjectName} CBT
          </h1>

          <p className="mt-2 text-gray-500">
            You are about to start your JAMB CBT practice.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-5">
            <FileQuestion className="h-5 w-5 text-indigo-600" />

            <p className="mt-3 text-sm text-gray-500">
              Questions
            </p>

            <p className="mt-1 font-bold text-gray-900">
              CBT Questions
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-5">
            <Clock className="h-5 w-5 text-indigo-600" />

            <p className="mt-3 text-sm text-gray-500">
              Examination Mode
            </p>

            <p className="mt-1 font-bold text-gray-900">
              Timed
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-yellow-100 bg-yellow-50 p-5">
          <h2 className="font-semibold text-yellow-900">
            Important
          </h2>

          <ul className="mt-3 space-y-2 text-sm text-yellow-800">
            <li>• Make sure you have a stable internet connection.</li>
            <li>• Do not refresh the page while taking the test.</li>
            <li>• Your answers will be saved during the examination.</li>
            <li>• Your score will be calculated after submission.</li>
          </ul>
        </div>

        <div className="mt-8">
          <Link
            href={`/dashboard/education/jamb/${subject}/exam`}
            className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition hover:bg-indigo-700"
          >
            Start Examination
          </Link>
        </div>
      </div>
    </div>
  );
}