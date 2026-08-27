"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Wallet,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

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

  return (
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

              </div>

            </div>

            {/* ACCOUNT BADGE */}

            <div className="flex items-center gap-2 self-start rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-400 sm:self-auto">
              <ShieldCheck size={17} />

              {user.role}
            </div>

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

        </div>

        {/* DECORATIVE CIRCLES */}

        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />

        <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-white/5" />

      </div>

      {/* ======================================================
          ACCOUNT INFORMATION
      ====================================================== */}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">

        <div className="mb-6">

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Account Information
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your registered account details.
          </p>

        </div>

        <div className="grid gap-4 md:grid-cols-2">

          {/* ==================================================
              FULL NAME
          ================================================== */}

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

          {/* ==================================================
              EMAIL
          ================================================== */}

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

          {/* ==================================================
              PHONE
          ================================================== */}

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

          {/* ==================================================
              ACCOUNT TYPE
          ================================================== */}

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

    </div>
  );
}