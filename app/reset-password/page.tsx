"use client";

import { Suspense, useState } from "react";
import {
  useSearchParams,
  useRouter,
} from "next/navigation";
import Link from "next/link";
import {
  LockKeyhole,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleResetPassword(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!token) {
      toast.error(
        "Invalid or missing reset link."
      );
      return;
    }

    if (
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
        "Password must be at least 6 characters."
      );
      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      toast.error(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/auth/reset-password",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            token,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(
          data.message ||
            "Failed to reset password."
        );

        return;
      }

      toast.success(
        "Password reset successfully!"
      );

      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (error) {
      console.error(
        "RESET PASSWORD FRONTEND ERROR:",
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
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* HEADER */}

        <div className="mb-6 text-center">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg dark:bg-indigo-500">
            <ShieldCheck size={30} />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h1>

          <p className="mt-2 text-gray-500 dark:text-slate-400">
            Create a new password for your
            Brainfriend Global Tech account.
          </p>

        </div>

        {/* FORM CARD */}

        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-black/30 sm:p-8">

          <form
            onSubmit={
              handleResetPassword
            }
            className="space-y-5"
          >

            {/* NEW PASSWORD */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
                New Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                />

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter new password"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 dark:disabled:bg-slate-800/60"
                />

              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Password must contain at least
                6 characters.
              </p>

            </div>

            {/* CONFIRM PASSWORD */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">
                Confirm Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 dark:disabled:bg-slate-800/60"
                />

              </div>

            </div>

            {/* BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {loading
                ? "Resetting Password..."
                : "Reset Password"}
            </button>

          </form>

        </div>

        {/* BACK TO LOGIN */}

        <div className="mt-6 text-center">

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>

        </div>

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="text-center">

            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-500" />

            <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
              Loading reset password...
            </p>

          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}