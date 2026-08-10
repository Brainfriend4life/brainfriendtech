"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  Wallet,
  ArrowDownToLine,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Smartphone,
  GraduationCap,
  Zap,
  Tv,
  Activity,
} from "lucide-react";

type RevenueData = {
  revenue: {
    total: number;
    today: number;
    week: number;
    month: number;
    totalTransactions: number;
    todayTransactions: number;
    weekTransactions: number;
    monthTransactions: number;
  };

  transactions: {
    successful: number;
    failed: number;
    pending: number;
  };

  wallet: {
    funding: number;
    fundingCount: number;
    withdrawals: number;
    withdrawalCount: number;
  };

  byType: {
    type: string;
    _sum: {
      amount: number | null;
    };
    _count: {
      id: number;
    };
  }[];

  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    description: string;
    status: string;
    reference: string;
    createdAt: string;
    provider: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
    };
  }[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function serviceName(type: string) {
  switch (type) {
    case "AIRTIME":
      return "Airtime";

    case "DATA":
      return "Data";

    case "ELECTRICITY":
      return "Electricity";

    case "CABLE":
      return "Cable TV";

    case "EXAM_PIN":
      return "Exam PIN";

    case "FUND_WALLET":
      return "Wallet Funding";

    case "WITHDRAWAL":
      return "Withdrawal";

    default:
      return type.replaceAll("_", " ");
  }
}

function ServiceIcon({ type }: { type: string }) {
  switch (type) {
    case "AIRTIME":
      return <Smartphone className="h-5 w-5" />;

    case "DATA":
      return <Activity className="h-5 w-5" />;

    case "ELECTRICITY":
      return <Zap className="h-5 w-5" />;

    case "CABLE":
      return <Tv className="h-5 w-5" />;

    case "EXAM_PIN":
      return <GraduationCap className="h-5 w-5" />;

    default:
      return <CreditCard className="h-5 w-5" />;
  }
}

export default function AdminRevenuePage() {
  const [data, setData] =
    useState<RevenueData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadRevenue() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/revenue",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to load revenue."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load revenue."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRevenue();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading revenue...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Revenue
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Monitor Brainfriend Tech's
            transactions and earnings.
          </p>
        </div>

        <div className="rounded-2xl bg-red-50 p-6 text-red-700">
          <p className="font-semibold">
            {error}
          </p>

          <button
            onClick={loadRevenue}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Revenue
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Monitor Brainfriend Tech's
            transactions and earnings.
          </p>
        </div>

        <button
          onClick={loadRevenue}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

      </div>


      {/* REVENUE CARDS */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* TOTAL */}

        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white shadow-sm">

          <div className="flex items-center justify-between">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <TrendingUp className="h-6 w-6" />
            </div>

          </div>

          <p className="mt-5 text-sm text-indigo-100">
            Total Business Revenue
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            {formatMoney(
              data.revenue.total
            )}
          </h2>

          <p className="mt-2 text-xs text-indigo-100">
            {data.revenue.totalTransactions}{" "}
            successful revenue transactions
          </p>

        </div>


        {/* TODAY */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Today
          </p>

          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {formatMoney(
              data.revenue.today
            )}
          </h2>

          <p className="mt-2 text-xs text-gray-500">
            {data.revenue.todayTransactions}{" "}
            transactions
          </p>

        </div>


        {/* WEEK */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>

          <p className="mt-5 text-sm text-gray-500">
            This Week
          </p>

          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {formatMoney(
              data.revenue.week
            )}
          </h2>

          <p className="mt-2 text-xs text-gray-500">
            {data.revenue.weekTransactions}{" "}
            transactions
          </p>

        </div>


        {/* MONTH */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100">
            <CreditCard className="h-6 w-6 text-purple-600" />
          </div>

          <p className="mt-5 text-sm text-gray-500">
            This Month
          </p>

          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {formatMoney(
              data.revenue.month
            )}
          </h2>

          <p className="mt-2 text-xs text-gray-500">
            {data.revenue.monthTransactions}{" "}
            transactions
          </p>

        </div>

      </div>


      {/* TRANSACTION OVERVIEW */}

      <div>

        <h2 className="text-xl font-bold text-gray-900">
          Transaction Overview
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Overall transaction performance.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Successful
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {data.transactions.successful}
                </p>
              </div>

            </div>

          </div>


          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Failed
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {data.transactions.failed}
                </p>
              </div>

            </div>

          </div>


          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Pending
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {data.transactions.pending}
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>


      {/* WALLET ACTIVITY */}

      <div>

        <h2 className="text-xl font-bold text-gray-900">
          Wallet Activity
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Money entering and leaving user wallets.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                <Wallet className="h-6 w-6 text-indigo-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Wallet Funding
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {formatMoney(
                    data.wallet.funding
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {data.wallet.fundingCount}{" "}
                  successful funding transactions
                </p>
              </div>

            </div>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                <ArrowDownToLine className="h-6 w-6 text-orange-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Withdrawals
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {formatMoney(
                    data.wallet.withdrawals
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {data.wallet.withdrawalCount}{" "}
                  successful withdrawals
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>


      {/* REVENUE BREAKDOWN */}

      <div>

        <h2 className="text-xl font-bold text-gray-900">
          Revenue Breakdown
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Revenue generated by each service.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {data.byType.length === 0 ? (

            <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm sm:col-span-2 lg:col-span-3">
              No revenue transactions yet.
            </div>

          ) : (

            data.byType.map((item) => (

              <div
                key={item.type}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <ServiceIcon
                        type={item.type}
                      />
                    </div>

                    <div>

                      <p className="font-semibold text-gray-900">
                        {serviceName(
                          item.type
                        )}
                      </p>

                      <p className="text-xs text-gray-500">
                        {item._count.id}{" "}
                        transactions
                      </p>

                    </div>

                  </div>

                </div>

                <p className="mt-4 text-xl font-bold text-gray-900">
                  {formatMoney(
                    item._sum.amount ?? 0
                  )}
                </p>

              </div>

            ))

          )}

        </div>

      </div>


      {/* RECENT TRANSACTIONS */}

      <div>

        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Recent Transactions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Latest activity across the platform.
            </p>
          </div>

        </div>


        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">

          {data.recentTransactions.length === 0 ? (

            <div className="p-10 text-center text-sm text-gray-500">
              No transactions found.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[850px]">

                <thead className="border-b border-gray-100 bg-gray-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      User
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Service
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reference
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {data.recentTransactions.map(
                    (transaction) => (

                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50"
                      >

                        <td className="px-5 py-4">

                          <p className="font-semibold text-gray-900">
                            {transaction.user.fullName}
                          </p>

                          <p className="text-xs text-gray-500">
                            {transaction.user.email}
                          </p>

                        </td>


                        <td className="px-5 py-4">

                          <p className="text-sm font-medium text-gray-800">
                            {serviceName(
                              transaction.type
                            )}
                          </p>

                          <p className="text-xs text-gray-400">
                            {transaction.provider}
                          </p>

                        </td>


                        <td className="px-5 py-4 text-sm font-bold text-gray-900">
                          {formatMoney(
                            transaction.amount
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              transaction.status.toLowerCase() ===
                              "success"
                                ? "bg-green-100 text-green-700"
                                : transaction.status.toLowerCase() ===
                                  "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {transaction.status}
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <p className="max-w-[180px] truncate text-xs font-medium text-gray-600">
                            {transaction.reference}
                          </p>

                        </td>


                        <td className="px-5 py-4 text-xs text-gray-500">
                          {formatDate(
                            transaction.createdAt
                          )}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

    </div>
  );
}