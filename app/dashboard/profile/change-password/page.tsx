
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LockKeyhole,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleChangePassword(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      toast.error(
        "Please fill in all fields."
      );
      return;
    }

    if (newPassword.length < 6) {
      toast.error(
        "New password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        "New passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/profile/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(
          data.message ||
            "Failed to change password."
        );
        return;
      }

      toast.success(
        "Password changed successfully!"
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "CHANGE PASSWORD FRONTEND ERROR:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* HEADER */}

      <div>
        <Link
          href="/dashboard/profile"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={17} />
          Back to Profile
        </Link>

        <h1 className="text-3xl font-bold text-gray-900">
          Change Password
        </h1>

        <p className="mt-1 text-gray-500">
          Update your account password to keep
          your account secure.
        </p>
      </div>

      {/* SECURITY HEADER */}

      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white shadow-lg">

        <div className="flex items-center gap-4">

          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck size={28} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              Account Security
            </h2>

            <p className="mt-1 text-sm text-indigo-100">
              Choose a strong password that you
              don't use elsewhere.
            </p>
          </div>

        </div>

      </div>

      {/* FORM */}

      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">

        <form
          onSubmit={handleChangePassword}
          className="space-y-5"
        >

          {/* CURRENT PASSWORD */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Current Password
            </label>

            <div className="relative">

              <LockKeyhole
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value
                  )
                }
                placeholder="Enter your current password"
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

            </div>
          </div>

          {/* NEW PASSWORD */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              New Password
            </label>

            <div className="relative">

              <LockKeyhole
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                placeholder="Enter your new password"
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

            </div>

            <p className="mt-2 text-xs text-gray-500">
              Password must contain at least 6
              characters.
            </p>
          </div>

          {/* CONFIRM PASSWORD */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Confirm New Password
            </label>

            <div className="relative">

              <LockKeyhole
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm your new password"
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

            </div>
          </div>

          {/* BUTTON */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Changing Password..."
              : "Change Password"}
          </button>

        </form>

      </div>

      {/* SECURITY NOTE */}

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">

        <div className="flex gap-3">

          <ShieldCheck
            size={20}
            className="mt-0.5 shrink-0 text-indigo-600"
          />

          <div>

            <p className="font-semibold text-indigo-900">
              Keep your password secure
            </p>

            <p className="mt-1 text-sm text-indigo-700">
              Never share your password with anyone.
              Brainfriend VTU will never ask you to
              disclose your password.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

