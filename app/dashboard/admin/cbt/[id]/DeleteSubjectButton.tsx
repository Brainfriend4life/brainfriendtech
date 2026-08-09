"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type Props = {
  subjectId: string;
  subjectName: string;
};

export default function DeleteSubjectButton({
  subjectId,
  subjectName,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${subjectName}"?\n\nAll questions under this subject will also be deleted.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/cbt/subjects/${subjectId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete subject."
        );
      }

      router.refresh();
    } catch (error) {
      console.error("DELETE SUBJECT ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete subject."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />

      {loading ? "Deleting..." : "Delete Subject"}
    </button>
  );
}