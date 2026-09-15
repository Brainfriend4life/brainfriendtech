"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Wallet,
  ShieldCheck,
  CalendarDays,
  KeyRound,
  ArrowUpRight,
  PlusCircle,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  walletBalance: number;
  role: string;
  createdAt: string;
};

export default function ProfilePage() {
  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [deletePassword, setDeletePassword] =
    useState("");

  const [deleting, setDeleting] =
    useState(false);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(
          data.message ||
            "Failed to load profile"
        );
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error(
        "PROFILE FETCH ERROR:",
        error
      );

      toast.error(
        "Unable to load profile"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  /*
   * ============================================================
   * DELETE ACCOUNT
   * ============================================================
   */

  async function handleDeleteAccount() {
    if (!deletePassword.trim()) {
      toast.error(
        "Please enter your password to continue."
      );
      return;
    }

    try {
      setDeleting(true);

      const res = await fetch(
        "/api/account/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            password: deletePassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(
          data.message ||
            "Unable to delete your account."
        );

        return;
      }

      toast.success(
        "Your account has been permanently deleted."
      );

      setShowDeleteModal(false);
      setDeletePassword("");

      /*
       * Sign the user out after the account
       * has been successfully deleted.
       */
      await signOut({
        callbackUrl: "/login",
      });
    } catch (error) {
      console.error(
        "DELETE ACCOUNT ERROR:",
        error
      );

      toast.error(
        "Something went wrong while deleting your account. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  /*
   * ============================================================
   * LOADING STATE
   * ============================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-950 dark:border-t-indigo-400" />

          <p className="font-medium text-gray-600 dark:text-gray-300">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * NO USER
   * ============================================================
   */

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-transparent px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-medium text-gray-600 dark:text-gray-300">
            Unable to load profile.
          </p>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * INITIALS
   * ============================================================
   */

  const initials = user.fullName
    .split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const memberSince = new Date(
    user.createdAt
  ).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
  });

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ======================================================
            PAGE HEADER
        ====================================================== */}

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Profile
          </h1>

          <p className="mt-1 text-gray-500 dark:text-gray-400">
            View your account information
            and wallet details.
          </p>
        </div>

        {/* ======================================================
            PROFILE HERO
        ====================================================== */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

          {/* TOP BANNER */}

          <div className="h-32 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 dark:from-indigo-700 dark:via-indigo-800 dark:to-purple-900" />

          {/* PROFILE INFORMATION */}

          <div className="relative px-6 pb-6 dark:bg-gray-900">

            {/* AVATAR */}

            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              <div className="flex items-end gap-4">

                {/* AVATAR */}

                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg dark:border-gray-900">
                  {initials}
                </div>

                {/* NAME */}

                <div className="min-w-0 pb-1">

                  <h2 className="break-words text-2xl font-bold text-gray-900 dark:text-white">
                    {user.fullName}
                  </h2>

                  <p className="break-all text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    Member since {memberSince}
                  </p>

                </div>

              </div>

              {/* ACCOUNT BADGE */}

              <div className="flex items-center gap-2 self-start rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-400 sm:self-auto">
                <ShieldCheck size={17} />

                {user.role}
              </div>

            </div>

            {/* ACTIONS */}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">

              <Link
                href="/dashboard/profile/change-password"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
              >
                <KeyRound size={16} />
                Change Password
              </Link>

            </div>

          </div>

        </div>

        {/* ======================================================
            WALLET CARD
        ====================================================== */}

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg dark:from-indigo-700 dark:to-purple-900">

          <div className="relative z-10">

            <div className="flex items-center gap-2 text-indigo-100 dark:text-indigo-200">
              <Wallet size={20} />

              <span className="text-sm font-medium">
                Wallet Balance
              </span>
            </div>

            <p className="mt-3 text-4xl font-bold">
              ₦
              {Number(
                user.walletBalance || 0
              ).toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </p>

            <p className="mt-2 text-sm text-indigo-100 dark:text-indigo-200">
              Available for airtime, data,
              electricity and other services.
            </p>

            {/* ACTIONS */}

            <div className="mt-5 flex flex-wrap gap-3">

              <Link
                href="/dashboard/wallet/fund"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
              >
                <PlusCircle size={16} />
                Fund Wallet
              </Link>

              <Link
                href="/dashboard/wallet"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                View Wallet
                <ArrowUpRight size={16} />
              </Link>

            </div>

          </div>

          {/* DECORATIVE CIRCLES */}

          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />

          <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-white/5" />

        </div>

        {/* ======================================================
            ACCOUNT INFORMATION
        ====================================================== */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">

          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">

            <div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Account Information
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your registered account details.
              </p>

            </div>

            <Link
              href="/dashboard/profile/change-password"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <KeyRound size={15} />
              Change Password
            </Link>

          </div>

          <div className="grid gap-4 md:grid-cols-2">

            {/* FULL NAME */}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/60">

              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <User size={20} />
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Full Name
              </p>

              <p className="mt-1 break-words font-semibold text-gray-900 dark:text-white">
                {user.fullName}
              </p>

            </div>

            {/* EMAIL */}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/60">

              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Mail size={20} />
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Email Address
              </p>

              <p className="mt-1 break-all font-semibold text-gray-900 dark:text-white">
                {user.email}
              </p>

            </div>

            {/* PHONE */}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/60">

              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400">
                <Phone size={20} />
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Phone Number
              </p>

              <p className="mt-1 break-words font-semibold text-gray-900 dark:text-white">
                {user.phone}
              </p>

            </div>

            {/* ACCOUNT TYPE */}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/60">

              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <ShieldCheck size={20} />
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Account Type
              </p>

              <span className="mt-2 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                {user.role}
              </span>

            </div>

          </div>

        </div>

        {/* ======================================================
            ACCOUNT CREATED
        ====================================================== */}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <CalendarDays size={22} />
            </div>

            <div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Account Created
              </p>

              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {new Date(
                  user.createdAt
                ).toLocaleDateString(
                  "en-NG",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </p>

            </div>

          </div>

        </div>

        {/* ======================================================
            DANGER ZONE
        ====================================================== */}

        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-gray-900">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <Trash2 size={22} />
              </div>

              <div>

                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Delete Account
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Permanently delete your account and
                  associated account data. This action
                  cannot be undone.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowDeleteModal(true)
              }
              disabled={
                user.role === "ADMIN"
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 size={16} />
              Delete Account
            </button>

          </div>

          {user.role === "ADMIN" && (
            <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Admin accounts cannot be deleted from
              the dashboard.
            </p>
          )}

        </div>

      </div>

      {/* ========================================================
          DELETE ACCOUNT MODAL
      ======================================================== */}

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => {
            if (!deleting) {
              setShowDeleteModal(false);
              setDeletePassword("");
            }
          }}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <AlertTriangle size={20} />
                </div>

                <h2
                  id="delete-account-title"
                  className="text-lg font-bold text-gray-900 dark:text-white"
                >
                  Delete Account
                </h2>

              </div>

              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setShowDeleteModal(false);
                    setDeletePassword("");
                  }
                }}
                disabled={deleting}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>

            {/* MODAL CONTENT */}

            <div className="p-6">

              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">

                <div className="flex gap-3">

                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                  />

                  <div>

                    <p className="font-semibold text-red-800 dark:text-red-300">
                      This action is permanent.
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                      Deleting your account will permanently
                      remove your account and its associated
                      data. You will not be able to recover
                      the account afterward.
                    </p>

                  </div>

                </div>

              </div>

              <div className="mt-5">

                <label
                  htmlFor="delete-password"
                  className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  Enter your password to confirm
                </label>

                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(event) =>
                    setDeletePassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your account password"
                  disabled={deleting}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:disabled:bg-gray-800/50"
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !deleting
                    ) {
                      handleDeleteAccount();
                    }
                  }}
                />

              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() => {
                    if (!deleting) {
                      setShowDeleteModal(false);
                      setDeletePassword("");
                    }
                  }}
                  disabled={deleting}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={
                    deleting ||
                    !deletePassword.trim()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={17} />
                      Permanently Delete
                    </>
                  )}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}
    </>
  );
}