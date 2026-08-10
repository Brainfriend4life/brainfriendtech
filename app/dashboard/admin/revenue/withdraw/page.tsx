"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

type WithdrawalMethod = "MANUAL" | "PAYSTACK";

type WithdrawalStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "REVERSED";

type BusinessWithdrawal = {
  id: string;
  amount: number;
  method: WithdrawalMethod;
  accountName: string;
  accountNumber: string;
  bankName: string;
  reference: string;
  status: WithdrawalStatus;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RevenueData = {
  totalRevenue: number;
  reservedAmount: number;
  availableRevenue: number;
};

export default function AdminRevenueWithdrawPage() {
  const [revenue, setRevenue] =
    useState<RevenueData>({
      totalRevenue: 0,
      reservedAmount: 0,
      availableRevenue: 0,
    });

  const [withdrawals, setWithdrawals] =
    useState<BusinessWithdrawal[]>([]);

  const [method, setMethod] =
    useState<WithdrawalMethod>("MANUAL");

  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] =
    useState("");
  const [accountNumber, setAccountNumber] =
    useState("");
  const [bankName, setBankName] =
    useState("");
  const [adminNote, setAdminNote] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function loadWithdrawals() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/revenue/withdraw",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load withdrawal data."
        );
      }

      setRevenue(
        data.revenue || {
          totalRevenue: 0,
          reservedAmount: 0,
          availableRevenue: 0,
        }
      );

      setWithdrawals(
        data.withdrawals || []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load withdrawal data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  function formatMoney(value: number) {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
      }
    ).format(value);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function getStatusClass(
    status: WithdrawalStatus
  ) {
    switch (status) {
      case "SUCCESS":
        return "bg-green-100 text-green-700";

      case "PROCESSING":
        return "bg-blue-100 text-blue-700";

      case "FAILED":
        return "bg-red-100 text-red-700";

      case "REVERSED":
        return "bg-orange-100 text-orange-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  function getStatusIcon(
    status: WithdrawalStatus
  ) {
    switch (status) {
      case "SUCCESS":
        return (
          <CheckCircle2 className="h-4 w-4" />
        );

      case "FAILED":
      case "REVERSED":
        return (
          <XCircle className="h-4 w-4" />
        );

      case "PROCESSING":
        return (
          <Loader2 className="h-4 w-4" />
        );

      default:
        return (
          <Clock3 className="h-4 w-4" />
        );
    }
  }

  async function createWithdrawal() {
    setMessage("");
    setError("");

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid withdrawal amount."
      );
      return;
    }

    if (
      numericAmount >
      revenue.availableRevenue
    ) {
      setError(
        "Withdrawal amount is greater than your available revenue."
      );
      return;
    }

    if (!accountName.trim()) {
      setError(
        "Enter the account name."
      );
      return;
    }

    if (!accountNumber.trim()) {
      setError(
        "Enter the account number."
      );
      return;
    }

    if (!bankName.trim()) {
      setError(
        "Enter the bank name."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/admin/revenue/withdraw",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount: numericAmount,
            method,
            accountName:
              accountName.trim(),
            accountNumber:
              accountNumber.trim(),
            bankName:
              bankName.trim(),
            adminNote:
              adminNote.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create withdrawal."
        );
      }

      setMessage(
        "Withdrawal request created successfully."
      );

      setAmount("");
      setAdminNote("");

      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create withdrawal."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateWithdrawal(
    withdrawalId: string,
    action:
      | "APPROVE"
      | "REJECT"
      | "MARK_PAID"
  ) {
    setMessage("");
    setError("");
    setActionId(withdrawalId);

    try {
      const response = await fetch(
        "/api/admin/revenue/withdraw",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            withdrawalId,
            action,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update withdrawal."
        );
      }

      setMessage(
        action === "APPROVE"
          ? "Withdrawal approved successfully."
          : action === "REJECT"
          ? "Withdrawal rejected successfully."
          : "Withdrawal marked as paid successfully."
      );

      await loadWithdrawals();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update withdrawal."
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard/admin/revenue"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Revenue
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Withdraw Revenue
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Withdraw Brainfriend Tech business
              revenue to your bank account.
            </p>
          </div>

          <button
            type="button"
            onClick={loadWithdrawals}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
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

        {/* MESSAGES */}
        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* REVENUE CARDS */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-medium text-gray-500">
              Total Revenue
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatMoney(
                revenue.totalRevenue
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-medium text-gray-500">
              Reserved / Withdrawn
            </p>

            <p className="mt-2 text-2xl font-bold text-orange-600">
              {formatMoney(
                revenue.reservedAmount
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg">
            <p className="text-sm font-medium text-indigo-100">
              Available to Withdraw
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatMoney(
                revenue.availableRevenue
              )}
            </p>
          </div>
        </div>

        {/* WITHDRAW FORM */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Banknote className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                New Withdrawal
              </h2>

              <p className="text-sm text-gray-500">
                Choose how you want to withdraw.
              </p>
            </div>
          </div>

          {/* METHOD */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2">

            <button
              type="button"
              onClick={() =>
                setMethod("MANUAL")
              }
              className={`rounded-xl border p-4 text-left transition ${
                method === "MANUAL"
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <p className="font-bold text-gray-900">
                Manual Bank Transfer
              </p>

              <p className="mt-1 text-xs text-gray-500">
                You make the bank transfer yourself.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setMethod("PAYSTACK")
              }
              className={`rounded-xl border p-4 text-left transition ${
                method === "PAYSTACK"
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900">
                  Paystack
                </p>

                <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700">
                  UNAVAILABLE
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Available after Paystack enables payouts.
              </p>
            </button>
          </div>

          {/* FORM */}
          <div className="grid gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Amount
              </label>

              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                placeholder="Enter amount"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Bank Name
              </label>

              <input
                type="text"
                value={bankName}
                onChange={(e) =>
                  setBankName(
                    e.target.value
                  )
                }
                placeholder="e.g. GTBank"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Account Name
              </label>

              <input
                type="text"
                value={accountName}
                onChange={(e) =>
                  setAccountName(
                    e.target.value
                  )
                }
                placeholder="Account name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Account Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(
                    e.target.value
                  )
                }
                placeholder="10-digit account number"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Admin Note
              </label>

              <textarea
                value={adminNote}
                onChange={(e) =>
                  setAdminNote(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Optional note..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-gray-500">
              Available:{" "}
              <span className="font-bold text-gray-900">
                {formatMoney(
                  revenue.availableRevenue
                )}
              </span>
            </p>

            <button
              type="button"
              onClick={createWithdrawal}
              disabled={
                submitting ||
                method === "PAYSTACK"
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {method === "PAYSTACK"
                ? "Paystack Unavailable"
                : submitting
                ? "Creating..."
                : "Request Withdrawal"}
            </button>
          </div>
        </div>

        {/* HISTORY */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">

          <div className="border-b border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900">
              Withdrawal History
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage your business revenue withdrawals.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No business withdrawals yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">

              {withdrawals.map(
                (withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="p-5"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* DETAILS */}
                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-bold text-gray-900">
                            {formatMoney(
                              withdrawal.amount
                            )}
                          </p>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              withdrawal.status
                            )}`}
                          >
                            {getStatusIcon(
                              withdrawal.status
                            )}

                            {withdrawal.status}
                          </span>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                            {withdrawal.method}
                          </span>

                        </div>

                        <p className="mt-2 text-sm text-gray-600">
                          {withdrawal.bankName} •{" "}
                          {withdrawal.accountName}
                        </p>

                        <p className="text-sm text-gray-500">
                          Account:{" "}
                          {withdrawal.accountNumber}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Ref:{" "}
                          {withdrawal.reference}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(
                            withdrawal.createdAt
                          )}
                        </p>

                        {withdrawal.adminNote && (
                          <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                            Note:{" "}
                            {withdrawal.adminNote}
                          </p>
                        )}

                      </div>

                      {/* ACTIONS */}
                      <div className="flex flex-wrap gap-2">

                        {withdrawal.status ===
                          "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={
                                actionId ===
                                withdrawal.id
                              }
                              onClick={() =>
                                updateWithdrawal(
                                  withdrawal.id,
                                  "APPROVE"
                                )
                              }
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionId ===
                              withdrawal.id
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                actionId ===
                                withdrawal.id
                              }
                              onClick={() =>
                                updateWithdrawal(
                                  withdrawal.id,
                                  "REJECT"
                                )
                              }
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {withdrawal.status ===
                          "PROCESSING" && (
                          <button
                            type="button"
                            disabled={
                              actionId ===
                              withdrawal.id
                            }
                            onClick={() =>
                              updateWithdrawal(
                                withdrawal.id,
                                "MARK_PAID"
                              )
                            }
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {actionId ===
                            withdrawal.id
                              ? "Processing..."
                              : "Mark as Paid"}
                          </button>
                        )}

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}