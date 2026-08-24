"use client";

import {
  Banknote,
  CheckCircle2,
  Clock3,
  XCircle,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  reference: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    fullName: string | null;
    email: string;
    phone: string | null;
    referralCode: string | null;
    referralBalance: number;
    walletBalance: number;
  };
};

function formatMoney(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReferralWithdrawalsPage() {
  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  async function loadWithdrawals() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/referral/withdrawals",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load withdrawals."
        );
      }

      setWithdrawals(
        data.withdrawals || []
      );
    } catch (error) {
      console.error(
        "LOAD REFERRAL WITHDRAWALS ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const filtered = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) return withdrawals;

    return withdrawals.filter(
      (withdrawal) =>
        withdrawal.user.fullName
          ?.toLowerCase()
          .includes(value) ||
        withdrawal.user.email
          ?.toLowerCase()
          .includes(value) ||
        withdrawal.reference
          ?.toLowerCase()
          .includes(value)
    );
  }, [withdrawals, search]);

  const pending = withdrawals.filter(
    (item) =>
      item.status === "PENDING"
  ).length;

  const approved = withdrawals.filter(
    (item) =>
      item.status === "APPROVED"
  ).length;

  const rejected = withdrawals.filter(
    (item) =>
      item.status === "REJECTED"
  ).length;

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-semibold text-indigo-600">
          Referral System
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          Referral Withdrawals
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Review requests to move referral
          earnings into user wallets.
        </p>
      </div>

      {/* STATISTICS */}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <Clock3 className="h-5 w-5 text-yellow-600" />

          <p className="mt-4 text-sm text-gray-500">
            Pending
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pending}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-green-600" />

          <p className="mt-4 text-sm text-gray-500">
            Approved
          </p>

          <p className="mt-1 text-2xl font-bold text-green-600">
            {approved}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <XCircle className="h-5 w-5 text-red-600" />

          <p className="mt-4 text-sm text-gray-500">
            Rejected
          </p>

          <p className="mt-1 text-2xl font-bold text-red-600">
            {rejected}
          </p>
        </div>
      </div>

      {/* SEARCH */}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search user, email or withdrawal reference..."
            className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading withdrawals...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Banknote className="mx-auto h-10 w-10 text-gray-300" />

            <p className="mt-3 font-semibold text-gray-900">
              No withdrawal requests
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Referral withdrawal requests
              will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4">
                    User
                  </th>

                  <th className="px-5 py-4">
                    Amount
                  </th>

                  <th className="px-5 py-4">
                    Referral Balance
                  </th>

                  <th className="px-5 py-4">
                    Reference
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Date
                  </th>

                  <th className="px-5 py-4">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filtered.map(
                  (withdrawal) => (
                    <tr
                      key={withdrawal.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {withdrawal.user
                            .fullName ||
                            "Unnamed User"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {withdrawal.user
                            .email}
                        </p>

                        <p className="mt-1 text-xs font-bold text-indigo-600">
                          {withdrawal.user
                            .referralCode ||
                            "N/A"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-900">
                          {formatMoney(
                            withdrawal.amount
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-green-600">
                          {formatMoney(
                            withdrawal.user
                              .referralBalance
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-500">
                          {withdrawal.reference}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            withdrawal.status ===
                            "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : withdrawal.status ===
                                "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {withdrawal.status ===
                          "APPROVED" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : withdrawal.status ===
                            "REJECTED" ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Clock3 className="h-3.5 w-3.5" />
                          )}

                          {withdrawal.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500">
                        {new Date(
                          withdrawal.createdAt
                        ).toLocaleString(
                          "en-NG"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {withdrawal.status ===
                        "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Completed
                          </span>
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
  );
}