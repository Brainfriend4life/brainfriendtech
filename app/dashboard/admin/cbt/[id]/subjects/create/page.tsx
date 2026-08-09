
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import CreateSubjectForm from "./CreateSubjectForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CreateSubjectPage({
  params,
}: Props) {
  const { id } = await params;

  const exam = await prisma.cbtExam.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!exam) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* HEADER */}

      <div className="flex items-start gap-3">

        <Link
          href={`/dashboard/admin/cbt/${exam.id}`}
          className="mt-1 rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Add Subject
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Add a subject to{" "}
            <span className="font-semibold text-gray-700">
              {exam.name}
            </span>
          </p>
        </div>

      </div>

      {/* FORM CARD */}

      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
          <BookOpen className="h-7 w-7 text-indigo-600" />
        </div>

        <h2 className="text-lg font-bold text-gray-900">
          Subject Information
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Enter the subject name and an optional description.
        </p>

        <div className="mt-6">
          <CreateSubjectForm examId={exam.id} />
        </div>

      </div>

    </div>
  );
}

