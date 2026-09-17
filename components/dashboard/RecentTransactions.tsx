"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  XCircle,
  Receipt,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  provider: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const res = await fetch("/api/transactions", {
          cache: "no-store",
        });

        const data = await res.json();

        if (Array.isArray(data)) {
          setTransactions(data.slice(0, 5));
        } else {
          setTransactions([]);
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  function formatMoney(amount: number) {
    return `₦${Number(amount || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function getStatus(status: string) {
    const normalized = status.toLowerCase();

    if (
      normalized.includes("failed") ||
      normalized.includes("cancelled") ||
      normalized.includes("canceled")
    ) {
      return {
        label: status,
        className:
          "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
        icon: XCircle,
      };
    }

    if (normalized.includes("pending") || normalized.includes("processing")) {
      return {
        label: status,
        className:
          "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
        icon: Clock3,
      };
    }

    return {
      label: status || "Successful",
      className:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
      icon: CheckCircle2,
    };
  }

  function formatDate(date: string) {
    try {
      return new Date(date).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  return (
    <section className="w-full">
      {/* HEADER */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Activity
          </p>

          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Recent Transactions
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Keep track of your latest account activity.
          </p>
        </div>

        <Link
          href="/dashboard/transactions"
          className="group hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 sm:flex"
        >
          View all
          <ArrowUpRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>

      {/* TRANSACTION CARD */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* DESKTOP TABLE */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Service
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />

                      <p className="text-sm text-muted-foreground">
                        Loading transactions...
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Receipt size={22} className="text-muted-foreground" />
                      </div>

                      <p className="font-medium text-foreground">
                        No transactions yet
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Your recent transactions will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                transactions.map((tx) => {
                  const status = getStatus(tx.status);
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                    >
                      {/* SERVICE */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                            <Receipt
                              size={17}
                              className="text-indigo-600 dark:text-indigo-400"
                            />
                          </div>

                          <div>
                            <p className="font-semibold text-card-foreground">
                              {tx.provider || tx.type || "Transaction"}
                            </p>

                            {tx.provider &&
                              tx.type &&
                              tx.provider !== tx.type && (
                                <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                                  {tx.type}
                                </p>
                              )}
                          </div>
                        </div>
                      </td>

                      {/* AMOUNT */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-card-foreground">
                          {formatMoney(tx.amount)}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                        >
                          <StatusIcon size={14} />
                          <span className="capitalize">{status.label}</span>
                        </span>
                      </td>

                      {/* DATE */}
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* MOBILE LIST */}
        <div className="md:hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center px-5 py-12">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />

              <p className="text-sm text-muted-foreground">
                Loading transactions...
              </p>
            </div>
          )}

          {!loading && transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Receipt size={22} className="text-muted-foreground" />
              </div>

              <p className="font-medium text-foreground">No transactions yet</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Your recent transactions will appear here.
              </p>
            </div>
          )}

          {!loading &&
            transactions.map((tx) => {
              const status = getStatus(tx.status);
              const StatusIcon = status.icon;

              return (
                <div
                  key={tx.id}
                  className="border-b border-border p-4 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* LEFT */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                        <Receipt
                          size={18}
                          className="text-indigo-600 dark:text-indigo-400"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-card-foreground">
                          {tx.provider || tx.type || "Transaction"}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* AMOUNT */}
                    <p className="shrink-0 text-sm font-bold text-card-foreground">
                      {formatMoney(tx.amount)}
                    </p>
                  </div>

                  {/* STATUS */}
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                    >
                      <StatusIcon size={13} />
                      <span className="capitalize">{status.label}</span>
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* MOBILE VIEW ALL */}
        <div className="border-t border-border p-3 sm:hidden">
          <Link
            href="/dashboard/transactions"
            className="group flex w-full items-center justify-center gap-1 rounded-xl bg-muted/50 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
          >
            View all transactions
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
