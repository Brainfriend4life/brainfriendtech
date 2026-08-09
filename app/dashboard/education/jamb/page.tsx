import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileQuestion,
  ChevronRight,
} from "lucide-react";

const subjects = [
  {
    name: "English Language",
    description: "Practice comprehension, grammar, vocabulary and more.",
  },
  {
    name: "Mathematics",
    description: "Practice JAMB Mathematics questions and calculations.",
  },
  {
    name: "Biology",
    description: "Practice questions covering major Biology topics.",
  },
  {
    name: "Chemistry",
    description: "Practice Chemistry questions for UTME preparation.",
  },
  {
    name: "Physics",
    description: "Practice Physics questions and calculations.",
  },
  {
    name: "Economics",
    description: "Practice Economics concepts and UTME questions.",
  },
];

export default function JambPage() {
  return (
    <div className="space-y-8">
      {/* BACK BUTTON */}

      <Link
        href="/dashboard/education"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Education
      </Link>

      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          JAMB CBT Practice
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Prepare for your JAMB UTME examination with interactive CBT
          practice.
        </p>
      </div>

      {/* EXAM INFORMATION */}

      <div className="rounded-2xl bg-indigo-600 p-6 text-white shadow-md sm:p-8">
        <h2 className="text-xl font-bold sm:text-2xl">
          JAMB UTME Practice
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
          Select a subject below to begin your practice. Your questions,
          answers and results will be tracked automatically.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-4">
            <FileQuestion className="mb-2 h-5 w-5" />

            <p className="text-xs text-indigo-100">
              Questions
            </p>

            <p className="mt-1 font-bold">
              CBT Practice
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <Clock className="mb-2 h-5 w-5" />

            <p className="text-xs text-indigo-100">
              Mode
            </p>

            <p className="mt-1 font-bold">
              Timed Practice
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <BookOpen className="mb-2 h-5 w-5" />

            <p className="text-xs text-indigo-100">
              Results
            </p>

            <p className="mt-1 font-bold">
              Instant Score
            </p>
          </div>
        </div>
      </div>

      {/* SUBJECTS */}

      <div>
        <h2 className="mb-5 text-xl font-bold text-gray-900">
          Select a Subject
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Link
              key={subject.name}
              href={`/dashboard/education/jamb/${subject.name
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                  <BookOpen className="h-6 w-6 text-indigo-600" />
                </div>

                <ChevronRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-gray-900">
                {subject.name}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {subject.description}
              </p>

              <p className="mt-5 text-sm font-semibold text-indigo-600">
                Practice Now →
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* NOTICE */}

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <h3 className="font-semibold text-indigo-900">
          CBT Practice Notice
        </h3>

        <p className="mt-2 text-sm leading-6 text-indigo-700">
          Select a subject to begin. You will receive instructions before
          the examination starts. Your score will be calculated automatically
          after submission.
        </p>
      </div>
    </div>
  );
}