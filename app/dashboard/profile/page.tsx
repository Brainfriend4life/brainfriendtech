
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
      const res = await fetch(
        "/api/profile"
      );

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

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />

          <p className="font-medium text-gray-600">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-gray-600">
            Unable to load profile.
          </p>
        </div>
      </div>
    );
  }

  const initials = user.fullName
    .split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* HEADER */}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          My Profile
        </h1>

        <p className="mt-1 text-gray-500">
          View your account information
          and wallet details.
        </p>
      </div>

      {/* PROFILE HERO */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

        {/* TOP BANNER */}

        <div className="h-32 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700" />

        {/* PROFILE INFORMATION */}

        <div className="relative px-6 pb-6">

          {/* AVATAR */}

          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div className="flex items-end gap-4">

              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg">
                {initials}
              </div>

              <div className="pb-1">

                <h2 className="text-2xl font-bold text-gray-900">
                  {user.fullName}
                </h2>

                <p className="text-sm text-gray-500">
                  {user.email}
                </p>

              </div>

            </div>

            {/* ACCOUNT BADGE */}

            <div className="flex items-center gap-2 self-start rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 sm:self-auto">
              <ShieldCheck size={17} />

              {user.role}
            </div>

          </div>

        </div>

      </div>

      {/* WALLET CARD */}

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg">

        <div className="relative z-10">

          <div className="flex items-center gap-2 text-indigo-100">
            <Wallet size={20} />

            <span className="text-sm font-medium">
              Wallet Balance
            </span>
          </div>

          <p className="mt-3 text-4xl font-bold">
            ₦
            {user.walletBalance.toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </p>

          <p className="mt-2 text-sm text-indigo-100">
            Available for airtime, data,
            electricity and other services.
          </p>

        </div>

        {/* DECORATIVE CIRCLE */}

        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />

        <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-white/5" />

      </div>

      {/* ACCOUNT INFORMATION */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="mb-6">

          <h2 className="text-xl font-bold text-gray-900">
            Account Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your registered account details.
          </p>

        </div>

        <div className="grid gap-4 md:grid-cols-2">

          {/* FULL NAME */}

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">

            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <User size={20} />
            </div>

            <p className="text-sm text-gray-500">
              Full Name
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {user.fullName}
            </p>

          </div>

          {/* EMAIL */}

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">

            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Mail size={20} />
            </div>

            <p className="text-sm text-gray-500">
              Email Address
            </p>

            <p className="mt-1 break-all font-semibold text-gray-900">
              {user.email}
            </p>

          </div>

          {/* PHONE */}

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">

            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Phone size={20} />
            </div>

            <p className="text-sm text-gray-500">
              Phone Number
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {user.phone}
            </p>

          </div>

          {/* ACCOUNT TYPE */}

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">

            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <ShieldCheck size={20} />
            </div>

            <p className="text-sm text-gray-500">
              Account Type
            </p>

            <span className="mt-2 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
              {user.role}
            </span>

          </div>

        </div>

      </div>

      {/* ACCOUNT CREATED */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
            <CalendarDays size={22} />
          </div>

          <div>

            <p className="text-sm text-gray-500">
              Account Created
            </p>

            <p className="mt-1 font-semibold text-gray-900">
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

