"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  currentRole: string;
  currentStatus: string;
};

export default function UserActions({
  userId,
  currentRole,
  currentStatus,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState<
    "role" | "status" | null
  >(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function changeRole() {
    setLoading("role");
    setMessage("");
    setError("");

    try {
      const newRole =
        currentRole === "ADMIN"
          ? "USER"
          : "ADMIN";

      const response = await fetch(
        "/api/admin/users/change-role",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            role: newRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to change role."
        );
      }

      setMessage(
        `User role changed to ${newRole}.`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(null);
    }
  }

  async function changeStatus() {
    setLoading("status");
    setMessage("");
    setError("");

    try {
      const newStatus =
        currentStatus === "SUSPENDED"
          ? "ACTIVE"
          : "SUSPENDED";

      const response = await fetch(
        "/api/admin/users/change-status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to change user status."
        );
      }

      setMessage(
        newStatus === "SUSPENDED"
          ? "User suspended successfully."
          : "User unsuspended successfully."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {/* ADMIN */}

        <button
          type="button"
          onClick={changeRole}
          disabled={loading !== null}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "role"
            ? "Updating..."
            : currentRole === "ADMIN"
            ? "Remove Admin Role"
            : "Make Admin"}
        </button>

        {/* SUSPEND / UNSUSPEND */}

        <button
          type="button"
          onClick={changeStatus}
          disabled={loading !== null}
          className={`rounded-xl px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            currentStatus === "SUSPENDED"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {loading === "status"
            ? "Updating..."
            : currentStatus === "SUSPENDED"
            ? "Unsuspend User"
            : "Suspend User"}
        </button>
      </div>
    </div>
  );
}