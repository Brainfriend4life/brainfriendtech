"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

import {
  Users,
  Wallet,
  TrendingUp,
  Clock,
  RefreshCw,
  Search,
  Copy,
  Check,
} from "lucide-react";

type Referral = {
  id: string;
  amount: number | string;
  status: string;
  createdAt: string;

  referrer: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    referralCode?: string | null;
    walletBalance?: number | string;
  };

  referred: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
};

type Stats = {
  totalReferrals: number;
  totalEarned: number;
  pendingEarned: number;
  paidEarned: number;
};

type TopReferrer = {
  userId: string;
  name: string;
  email: string;
  referralCode: string | null;
  referrals: number;
  earnings: number;
  walletBalance: number;
};

export default function AdminReferralPage() {
  const [referrals, setReferrals] =
    useState<Referral[]>([]);

  const [stats, setStats] =
    useState<Stats>({
      totalReferrals: 0,
      totalEarned: 0,
      pendingEarned: 0,
      paidEarned: 0,
    });

  const [topReferrers, setTopReferrers] =
    useState<TopReferrer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [copied, setCopied] =
    useState<string | null>(null);

  async function loadReferralData() {
    try {
      setLoading(true);

      const response = await axios.get(
        "/api/admin/referral"
      );

      setReferrals(
        response.data.referrals || []
      );

      setStats(
        response.data.stats || {
          totalReferrals: 0,
          totalEarned: 0,
          pendingEarned: 0,
          paidEarned: 0,
        }
      );

      setTopReferrers(
        response.data.topReferrers || []
      );
    } catch (error) {
      console.error(
        "LOAD ADMIN REFERRAL ERROR:",
        error
      );

      toast.error(
        "Unable to load referral data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferralData();
  }, []);

  function formatMoney(
    value: number | string
  ) {
    return `₦${Number(
      value || 0
    ).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(
        code
      );

      setCopied(code);

      setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch {
      toast.error(
        "Unable to copy referral code."
      );
    }
  }

  const filteredReferrals =
    referrals.filter((referral) => {
      const query =
        search.trim().toLowerCase();

      if (!query) return true;

      return (
        referral.referrer.fullName
          ?.toLowerCase()
          .includes(query) ||
        referral.referrer.email
          ?.toLowerCase()
          .includes(query) ||
        referral.referred.fullName
          ?.toLowerCase()
          .includes(query) ||
        referral.referred.email
          ?.toLowerCase()
          .includes(query) ||
        referral.referrer.referralCode
          ?.toLowerCase()
          .includes(query)
      );
    });

  return (
    <div className="space-y-7">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-sm font-semibold text-indigo-600">
            Referral Management
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Referral Program
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Monitor referral activity and
            referral earnings.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReferralData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>

      </div>

      {/* STAT CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Total Referrals"
          value={stats.totalReferrals.toLocaleString()}
          description="Registered referrals"
          icon={Users}
        />

        <StatCard
          title="Total Earned"
          value={formatMoney(
            stats.totalEarned
          )}
          description="Total referral earnings"
          icon={TrendingUp}
        />

        <StatCard
          title="Pending Earnings"
          value={formatMoney(
            stats.pendingEarned
          )}
          description="Pending rewards"
          icon={Clock}
        />

        <StatCard
          title="Credited Earnings"
          value={formatMoney(
            stats.paidEarned
          )}
          description="Credited to wallets"
          icon={Wallet}
        />

      </div>

      {/* TOP REFERRERS */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">

          <h2 className="text-lg font-bold text-gray-900">
            Top Referrers
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Users with the highest referral
            earnings.
          </p>

        </div>

        {topReferrers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No referral activity yet.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[750px]">

              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    User
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Referral Code
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Referrals
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Earnings
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Wallet
                  </th>

                </tr>
              </thead>

              <tbody>

                {topReferrers.map(
                  (user) => (
                    <tr
                      key={user.userId}
                      className="border-b border-gray-100 last:border-0"
                    >

                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-gray-900">
                          {user.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {user.email}
                        </p>

                      </td>

                      <td className="px-5 py-4">

                        {user.referralCode ? (
                          <button
                            type="button"
                            onClick={() =>
                              copyCode(
                                user.referralCode!
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            {user.referralCode}

                            {copied ===
                            user.referralCode ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            —
                          </span>
                        )}

                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                        {user.referrals}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-emerald-600">
                        {formatMoney(
                          user.earnings
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                        {formatMoney(
                          user.walletBalance
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* SEARCH */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="relative">

          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search name, email or referral code..."
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />

        </div>

      </section>

      {/* REFERRAL ACTIVITY */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">

          <h2 className="text-lg font-bold text-gray-900">
            Referral Activity
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Complete referral activity across
            the platform.
          </p>

        </div>

        {loading ? (
          <div className="px-6 py-16 text-center">

            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-indigo-600" />

            <p className="mt-3 text-sm text-gray-500">
              Loading referral activity...
            </p>

          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="px-6 py-16 text-center">

            <Users className="mx-auto h-10 w-10 text-gray-300" />

            <p className="mt-3 text-sm font-semibold text-gray-700">
              No referrals found
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Referral records will appear
              here when users refer others.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[950px]">

              <thead>

                <tr className="border-b border-gray-100 bg-gray-50 text-left">

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Referrer
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Referred User
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Referral Code
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Date
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredReferrals.map(
                  (referral) => (
                    <tr
                      key={referral.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >

                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-gray-900">
                          {
                            referral.referrer
                              .fullName
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            referral.referrer
                              .email
                          }
                        </p>

                      </td>

                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-gray-800">
                          {
                            referral.referred
                              .fullName
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            referral.referred
                              .email
                          }
                        </p>

                      </td>

                      <td className="px-5 py-4">

                        <span className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-700">
                          {referral.referrer
                            .referralCode ||
                            "—"}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <span className="text-sm font-bold text-emerald-600">
                          {formatMoney(
                            referral.amount
                          )}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <StatusBadge
                          status={
                            referral.status
                          }
                        />

                      </td>

                      <td className="px-5 py-4">

                        <span className="text-xs font-medium text-gray-600">
                          {new Date(
                            referral.createdAt
                          ).toLocaleDateString(
                            "en-NG",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-semibold text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>

      </div>

    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const value = status.toUpperCase();

  if (
    value === "PAID" ||
    value === "CREDITED" ||
    value === "COMPLETED"
  ) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        {status}
      </span>
    );
  }

  if (value === "PENDING") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
      {status}
    </span>
  );
}