import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  FileText,
  School,
  ChevronRight,
} from "lucide-react";

const educationServices = [
  {
    title: "JAMB CBT",
    description:
      "Practice JAMB UTME questions and prepare for your examination.",
    icon: GraduationCap,
    href: "/dashboard/education/jamb",
    label: "Start Practice",
  },
  {
    title: "WAEC CBT",
    description:
      "Practice WAEC examination questions across different subjects.",
    icon: BookOpen,
    href: "/dashboard/education/waec",
    label: "Start Practice",
  },
  {
    title: "NECO CBT",
    description:
      "Improve your preparation with NECO past questions and practice tests.",
    icon: FileText,
    href: "/dashboard/education/neco",
    label: "Start Practice",
  },
  {
    title: "University CBT",
    description:
      "Prepare for university examinations with interactive CBT practice.",
    icon: School,
    href: "/dashboard/education/university",
    label: "Start Practice",
  },
];

export default function EducationPage() {
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Education & CBT
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Practice, learn and prepare for your examinations with Brainfriend
          Tech.
        </p>
      </div>

      {/* INTRO CARD */}
      <div className="rounded-2xl bg-indigo-600 p-6 text-white shadow-md sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <GraduationCap className="h-6 w-6" />
            </div>

            <h2 className="text-xl font-bold sm:text-2xl">
              Prepare Smarter
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
              Choose an examination category below and start practicing with
              Brainfriend Tech's CBT platform.
            </p>
          </div>
        </div>
      </div>

      {/* EXAM CATEGORIES */}
      <div>
        <h2 className="mb-5 text-xl font-bold text-gray-900">
          Choose an Examination
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {educationServices.map((service) => {
            const Icon = service.icon;

            return (
              <Link
                key={service.title}
                href={service.href}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-indigo-600" />
                </div>

                <h3 className="mt-5 text-lg font-bold text-gray-900">
                  {service.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {service.description}
                </p>

                <div className="mt-5 text-sm font-semibold text-indigo-600">
                  {service.label} →
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* STUDY MATERIALS */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Study Materials
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Access useful learning materials and resources to improve your
              preparation.
            </p>
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 sm:w-auto"
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* CBT HISTORY */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Your CBT Performance
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Your completed CBT attempts and examination results will appear here.
        </p>

        <div className="mt-5 rounded-xl bg-gray-50 p-5 text-center">
          <p className="text-sm text-gray-500">
            No CBT attempts yet.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Complete your first practice test to see your performance here.
          </p>
        </div>
      </div>
    </div>
  );
}