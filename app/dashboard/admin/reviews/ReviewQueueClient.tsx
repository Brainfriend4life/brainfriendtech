"use client";

import { useEffect, useState } from "react";
import { Star, BadgeCheck, Check, Trash2, RotateCcw } from "lucide-react";

type AdminReview = {
  id: string;
  displayName: string;
  role: string | null;
  rating: number;
  review: string;
  approved: boolean;
  verified: boolean;
  createdAt: string;
  userId: string | null;
  user: { email: string; fullName: string } | null;
};

type StatusFilter = "pending" | "approved" | "all";

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MiniStars({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex" aria-label={`${clamped} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`h-4 w-4 ${
            star <= clamped
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

const TABS: { key: StatusFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "all", label: "All" },
];

export default function ReviewQueueClient() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const loadReviews = async (status: StatusFilter) => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/admin/reviews?status=${status}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setReviews(result.reviews || []);
      } else {
        setError(result?.message || "Unable to load reviews.");
      }
    } catch {
      setError("Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const setApproved = async (id: string, approved: boolean) => {
    setPendingActionId(id);
    setError("");
    try {
      const response = await fetch(`/api/reviews/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Unable to update this review.");
      }

      // Optimistically drop it from the current filtered view rather than
      // refetching the whole list.
      setReviews((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update this review.");
    } finally {
      setPendingActionId(null);
    }
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm("Permanently delete this review? This can't be undone.")) {
      return;
    }

    setPendingActionId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Unable to delete this review.");
      }

      setReviews((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete this review.");
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              statusFilter === tab.key
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      )}

      {!loading && reviews.length === 0 && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nothing here right now.
        </p>
      )}

      <div className="space-y-4">
        {reviews.map((item) => {
          const isBusy = pendingActionId === item.id;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {item.displayName}
                    </span>
                    {item.role && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {item.role}
                      </span>
                    )}
                    {item.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Verified
                      </span>
                    )}
                  </div>
                  {item.user && (
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {item.user.fullName} · {item.user.email}
                    </p>
                  )}
                </div>
                <MiniStars rating={item.rating} />
              </div>

              <p className="mb-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {item.review}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(item.createdAt)} ·{" "}
                  {item.approved ? "Approved" : "Pending"}
                </p>

                <div className="flex gap-2">
                  {!item.approved && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setApproved(item.id, true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </button>
                  )}

                  {item.approved && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setApproved(item.id, false)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Unapprove
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => deleteReview(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}