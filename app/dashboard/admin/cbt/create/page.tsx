"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

export default function CreateCbtExamPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Please enter an examination name.");
      return;
    }

    const durationNumber = Number(duration);

    if (
      !durationNumber ||
      durationNumber <= 0
    ) {
      setError("Please enter a valid duration.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/cbt/exams",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim() || null,
            duration: durationNumber,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create examination."
        );
      }

      router.push(
        `/dashboard/admin/cbt/${data.exam.id}`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex items-center gap-3">

        <Link
          href="/dashboard/admin/cbt"
          className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create CBT Examination
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create an examination before adding
            subjects and questions.
          </p>
        </div>

      </div>

      {/* FORM */}

      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">

        <div className="mb-6 flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
            <GraduationCap className="h-6 w-6 text-indigo-600" />
          </div>

          <div>
            <h2 className="font-bold text-gray-900">
              Examination Details
            </h2>

            <p className="text-sm text-gray-500">
              Enter the basic information for this CBT.
            </p>
          </div>

        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* NAME */}

          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Examination Name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="e.g. JAMB Biology CBT"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Brief description of the examination..."
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* DURATION */}

          <div>
            <label
              htmlFor="duration"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Duration (minutes)
            </label>

            <input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) =>
                setDuration(e.target.value)
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            />

            <p className="mt-2 text-xs text-gray-500">
              Example: 60 minutes.
            </p>
          </div>

          {/* BUTTONS */}

          <div className="flex flex-col gap-3 pt-3 sm:flex-row">

            <Link
              href="/dashboard/admin/cbt"
              className="flex-1 rounded-xl border border-gray-300 px-5 py-3 text-center font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Examination"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}