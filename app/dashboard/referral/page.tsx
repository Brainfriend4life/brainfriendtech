"use client";

import { useEffect, useState } from "react";

import {
  Copy,
  Check,
  Gift,
  Users,
  Wallet,
  ArrowRight,
  Share2,
  Sparkles,
  UserPlus,
  CalendarDays,
  ChevronRight,
} from "lucide-react";

import axios from "axios";
import toast from "react-hot-toast";

type Referral = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
};

type ReferralData = {
  referralCode: string | null;
  referralBalance: number;
  walletBalance: number;
  totalReferrals: number;
  referrals: Referral[];
};

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);

  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [copied, setCopied] = useState(false);

  // ============================================================
  // LOAD REFERRAL DATA
  // ============================================================

  async function loadReferralData() {
    try {
      setLoading(true);

      const response = await axios.get("/api/referral");

      if (response.data.success) {
        setData({
          referralCode: response.data.referralCode,

          referralBalance: Number(response.data.referralBalance || 0),

          walletBalance: Number(response.data.walletBalance || 0),

          totalReferrals: Number(response.data.totalReferrals || 0),

          referrals: Array.isArray(response.data.referrals)
            ? response.data.referrals
            : [],
        });
      }
    } catch (error) {
      console.error("LOAD REFERRAL ERROR:", error);

      toast.error("Unable to load referral information.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferralData();
  }, []);

  // ============================================================
  // REFERRAL LINK
  // ============================================================

  const referralLink =
    typeof window !== "undefined" && data?.referralCode
      ? `${window.location.origin}/register?ref=${encodeURIComponent(
          data.referralCode,
        )}`
      : "";

  // ============================================================
  // COPY
  // ============================================================

  async function copyReferralLink() {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);

      setCopied(true);

      toast.success("Referral link copied!");

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error("Unable to copy referral link.");
    }
  }

  // ============================================================
  // SHARE
  // ============================================================

  async function shareReferralLink() {
    if (!referralLink) return;

    const shareText =
      "Join Brainfriend Global Tech using my referral link and enjoy convenient digital services.";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "Join Brainfriend Global Tech",
          text: shareText,
          url: referralLink,
        });

        return;
      }

      await navigator.clipboard.writeText(referralLink);

      toast.success("Referral link copied. You can now share it.");
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast.error("Unable to share referral link.");
      }
    }
  }

  // ============================================================
  // TRANSFER TO WALLET
  // ============================================================

  async function transferToWallet() {
    if (!data) return;

    if (data.referralBalance <= 0) {
      toast.error("You have no referral earnings available.");

      return;
    }

    try {
      setTransferring(true);

      const response = await axios.post("/api/referral/transfer");

      if (!response.data.success) {
        throw new Error(response.data.message || "Transfer failed.");
      }

      setData((current) =>
        current
          ? {
              ...current,

              referralBalance: Number(response.data.referralBalance || 0),

              walletBalance: Number(response.data.walletBalance || 0),
            }
          : current,
      );

      toast.success(
        response.data.message || "Referral earnings transferred successfully.",
      );
    } catch (error: unknown) {
      console.error("TRANSFER REFERRAL ERROR:", error);

      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            "Unable to transfer referral earnings.",
        );
      } else {
        toast.error("Unable to transfer referral earnings.");
      }
    } finally {
      setTransferring(false);
    }
  }

  // ============================================================
  // FORMAT DATE
  // ============================================================

  function formatDate(date: string) {
    try {
      return new Date(date).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  }

  // ============================================================
  // INITIALS
  // ============================================================

  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-900" />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-900" />

          <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-900" />

          <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-900" />
        </div>

        <div className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-900" />
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
        <p className="font-semibold text-red-700 dark:text-red-300">
          Unable to load referral dashboard.
        </p>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60">
              <Gift
                size={19}
                className="text-indigo-600 dark:text-indigo-400"
              />
            </div>

            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              Referral Program
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Referral & Rewards
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
            Invite friends to Brainfriend Global Tech and earn rewards from
            their eligible transactions.
          </p>
        </div>
      </div>

      {/* ======================================================
          STATS
      ====================================================== */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* TOTAL REFERRALS */}

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60">
              <Users
                size={21}
                className="text-indigo-600 dark:text-indigo-400"
              />
            </div>

            <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              Referrals
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-gray-500 dark:text-slate-400">
            Total Referrals
          </p>

          <h2 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">
            {data.totalReferrals}
          </h2>

          <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
            People who joined using your link
          </p>
        </div>

        {/* REFERRAL EARNINGS */}

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
              <Gift
                size={21}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <Sparkles size={19} className="text-emerald-500" />
          </div>

          <p className="mt-5 text-sm font-medium text-gray-500 dark:text-slate-400">
            Referral Earnings
          </p>

          <h2 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">
            ₦
            {data.referralBalance.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>

          <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
            Available to transfer
          </p>
        </div>

        {/* WALLET */}

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/50">
              <Wallet size={21} className="text-blue-600 dark:text-blue-400" />
            </div>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              Main Wallet
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-gray-500 dark:text-slate-400">
            Wallet Balance
          </p>

          <h2 className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">
            ₦
            {data.walletBalance.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>

          <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
            Your current available balance
          </p>
        </div>
      </div>

      {/* ======================================================
          REFERRAL LINK
      ====================================================== */}

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60">
            <Share2
              size={21}
              className="text-indigo-600 dark:text-indigo-400"
            />
          </div>

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Invite friends & earn
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Share your unique referral link with friends and family.
            </p>
          </div>
        </div>

        {/* REFERRAL CODE */}

        <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
            Your referral code
          </p>

          <p className="mt-2 break-all text-xl font-extrabold tracking-wider text-indigo-700 dark:text-indigo-300">
            {data.referralCode || "Not available"}
          </p>
        </div>

        {/* LINK */}

        <div className="mt-4">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Your referral link
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="break-all text-sm text-gray-600 dark:text-slate-300">
                {referralLink}
              </p>
            </div>

            <button
              type="button"
              onClick={copyReferralLink}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-bold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              {copied ? (
                <>
                  <Check size={17} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={17} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* SHARE */}

        <button
          type="button"
          onClick={shareReferralLink}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-950/40 sm:w-auto"
        >
          <Share2 size={17} />
          Share Referral Link
        </button>
      </div>

      {/* ======================================================
          MY REFERRALS
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* HEADER */}

        <div className="border-b border-gray-200 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60">
                <Users
                  size={19}
                  className="text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">
                  My Referrals
                </h2>

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  People you have invited
                </p>
              </div>
            </div>

            <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-extrabold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              {data.totalReferrals}{" "}
              {data.totalReferrals === 1 ? "Referral" : "Referrals"}
            </span>
          </div>
        </div>

        {/* LIST */}

        {data.referrals.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-slate-800">
            {data.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-white dark:hover:bg-slate-800/50 sm:px-6"
              >
                {/* AVATAR */}

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  {getInitials(referral.fullName)}
                </div>

                {/* USER */}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {referral.fullName}
                    </p>

                    <span className="hidden text-gray-300 dark:text-slate-700 sm:inline">
                      •
                    </span>

                    <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                      {referral.email}
                    </p>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                    <CalendarDays size={13} />

                    <span>Joined {formatDate(referral.createdAt)}</span>
                  </div>
                </div>

                {/* STATUS */}

                <div className="hidden items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Joined
                </div>

                <ChevronRight
                  size={17}
                  className="shrink-0 text-gray-300 dark:text-slate-600"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/60">
              <UserPlus
                size={25}
                className="text-indigo-600 dark:text-indigo-400"
              />
            </div>

            <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
              No referrals yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-slate-400">
              You haven't referred anyone yet. Share your referral link with
              friends and start earning.
            </p>

            <button
              type="button"
              onClick={shareReferralLink}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <Share2 size={16} />
              Invite Friends
            </button>
          </div>
        )}
      </div>

      {/* ======================================================
          TRANSFER EARNINGS
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <div className="border-b border-indigo-100 px-5 py-5 dark:border-indigo-900/40 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/70">
              <Wallet
                size={19}
                className="text-indigo-600 dark:text-indigo-400"
              />
            </div>

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Transfer Earnings
              </h2>

              <p className="text-xs text-gray-500 dark:text-slate-400">
                Move your referral earnings into your main wallet.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 rounded-xl bg-white p-4 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                Amount available
              </p>

              <p className="mt-1 text-xl font-extrabold text-gray-900 dark:text-white">
                ₦
                {data.referralBalance.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <button
              type="button"
              onClick={transferToWallet}
              disabled={transferring || data.referralBalance <= 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wallet size={17} />

              {transferring ? "Transferring..." : "Transfer to Wallet"}

              {!transferring && <ArrowRight size={16} />}
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-slate-500">
            Your entire available referral balance will be transferred to your
            main wallet. The transfer is processed securely.
          </p>
        </div>
      </div>

      {/* ======================================================
          HOW IT WORKS
      ====================================================== */}

      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-5 text-white shadow-sm dark:from-slate-950 dark:to-slate-900 dark:ring-1 dark:ring-slate-800 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Sparkles size={19} />
          </div>

          <div>
            <h2 className="font-bold">How referrals work</h2>

            <p className="text-xs text-gray-400">Simple and straightforward</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-extrabold text-indigo-300">01</div>

            <p className="mt-2 text-sm font-bold">Share your link</p>

            <p className="mt-1 text-xs leading-5 text-gray-400">
              Send your unique referral link to friends and family.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-extrabold text-indigo-300">02</div>

            <p className="mt-2 text-sm font-bold">They register</p>

            <p className="mt-1 text-xs leading-5 text-gray-400">
              Their account is automatically connected to your referral.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-extrabold text-indigo-300">03</div>

            <p className="mt-2 text-sm font-bold">You earn</p>

            <p className="mt-1 text-xs leading-5 text-gray-400">
              Eligible transactions generate referral earnings for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
