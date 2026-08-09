
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  examId: string;
};

export default function CreateSubjectForm({
  examId,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a subject name.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/cbt/subjects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            examId,
            name: trimmedName,
            description:
              description.trim() || null,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type");

      let data: {
        error?: string;
        success?: boolean;
      } = {};

      if (
        contentType?.includes(
          "application/json"
        )
      ) {
        data = await response.json();
      } else {
        throw new Error(
          "The server returned an unexpected response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create subject."
        );
      }

      router.push(
        `/dashboard/admin/cbt/${examId}`
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
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      {/* ERROR */}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* SUBJECT NAME */}

      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-semibold text-gray-700"
        >
          Subject Name
        </label>

        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="e.g. Biology"
          disabled={loading}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
        />
      </div>

      {/* DESCRIPTION */}

      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-semibold text-gray-700"
        >
          Description
          <span className="ml-1 font-normal text-gray-400">
            (Optional)
          </span>
        </label>

        <textarea
          id="description"
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Brief description of this subject..."
          rows={4}
          disabled={loading}
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
        />
      </div>

      {/* BUTTONS */}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/admin/cbt/${examId}`
            )
          }
          disabled={loading}
          className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating Subject..."
            : "Create Subject"}
        </button>

      </div>

    </form>
  );
}

