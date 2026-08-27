"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: string;
  provider: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/transactions", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message || "Failed to load transactions"
          );
        }

        const transactionList = Array.isArray(data)
          ? data
          : Array.isArray(data?.transactions)
          ? data.transactions
          : [];

        setTransactions(transactionList);
      } catch (err: any) {
        console.error("TRANSACTION LOAD ERROR:", err);

        setError(
          err?.message || "Failed to load transactions"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <div className="h-9 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="mt-3 h-5 w-80 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-4 p-6">
              <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * ERROR
   * ==========================================
   */

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-7xl space-y-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Transaction History
            </h1>

            <p className="mt-1 text-gray-500 dark:text-gray-400">
              View your wallet and service transactions.
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-semibold">
              Unable to load transactions
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ==========================================
            PAGE HEADER
        ========================================== */}

        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60">
              <span className="text-xl">💳</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Transaction History
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
                View your wallet and service transactions.
              </p>
            </div>
          </div>
        </div>

        {/* ==========================================
            SUMMARY
        ========================================== */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Transactions
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {transactions.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60">
              <span className="text-lg">📋</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            EMPTY STATE
        ========================================== */}

        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60">
              <span className="text-3xl">💳</span>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              No transactions yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
              Your transactions will appear here after you
              fund your wallet or purchase a service.
            </p>
          </div>
        ) : (
          /* ==========================================
             TRANSACTION TABLE
          ========================================== */

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                {/* TABLE HEADER */}

                <thead className="bg-gray-50 dark:bg-gray-800/70">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Type
                    </th>

                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Provider
                    </th>

                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Amount
                    </th>

                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Status
                    </th>

                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Description
                    </th>

                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                  </tr>
                </thead>

                {/* TABLE BODY */}

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {transactions.map((tx) => {
                    const status = String(
                      tx.status || ""
                    ).toLowerCase();

                    const isSuccess =
                      status === "success" ||
                      status === "successful" ||
                      status === "delivered" ||
                      status === "completed" ||
                      status === "paid";

                    const isFailed =
                      status === "failed" ||
                      status === "rejected";

                    return (
                      <tr
                        key={tx.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        {/* TYPE */}

                        <td className="px-4 py-4">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {tx.type}
                          </span>
                        </td>

                        {/* PROVIDER */}

                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {tx.provider || "-"}
                        </td>

                        {/* AMOUNT */}

                        <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                          ₦
                          {Number(
                            tx.amount || 0
                          ).toLocaleString("en-NG", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              isFailed
                                ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                : isSuccess
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                            }`}
                          >
                            {tx.status || "Pending"}
                          </span>
                        </td>

                        {/* DESCRIPTION */}

                        <td className="max-w-xs px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="max-w-xs truncate">
                            {tx.description || "-"}
                          </div>
                        </td>

                        {/* DATE */}

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {tx.createdAt
                            ? new Date(
                                tx.createdAt
                              ).toLocaleString("en-NG", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE TRANSACTIONS */}

            <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
              {transactions.map((tx) => {
                const status = String(
                  tx.status || ""
                ).toLowerCase();

                const isSuccess =
                  status === "success" ||
                  status === "successful" ||
                  status === "delivered" ||
                  status === "completed" ||
                  status === "paid";

                const isFailed =
                  status === "failed" ||
                  status === "rejected";

                return (
                  <div
                    key={`mobile-${tx.id}`}
                    className="p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {tx.type}
                        </p>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {tx.provider || "No provider"}
                        </p>
                      </div>

                      <p className="shrink-0 font-bold text-gray-900 dark:text-white">
                        ₦
                        {Number(
                          tx.amount || 0
                        ).toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          isFailed
                            ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                            : isSuccess
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        }`}
                      >
                        {tx.status || "Pending"}
                      </span>

                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tx.createdAt
                          ? new Date(
                              tx.createdAt
                            ).toLocaleString("en-NG", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "-"}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Description
                      </p>

                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {tx.description || "-"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}