"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertCircle,
  ReceiptText,
  ArrowLeft,
  Wallet,
} from "lucide-react";

type Transaction = {
  id: string;
  amount: number;
  description: string;
  status: string;
  reference: string;
  provider: string;
  createdAt: string;
  isTest: boolean;
};

function formatMoney(amount: number) {
  return `₦${Number(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusInfo(status: string) {
  const normalized = status.toUpperCase();

  if (
    normalized === "SUCCESS" ||
    normalized === "COMPLETED" ||
    normalized === "PAID"
  ) {
    return {
      label: "Successful",
      description:
        "Your deposit was successfully processed.",
      className:
        "border-green-200 bg-green-50 text-green-700",
      icon: (
        <CheckCircle2 className="h-6 w-6" />
      ),
    };
  }

  if (
    normalized === "FAILED" ||
    normalized === "REJECTED"
  ) {
    return {
      label: "Failed",
      description:
        "This deposit was not successfully processed.",
      className:
        "border-red-200 bg-red-50 text-red-700",
      icon: (
        <XCircle className="h-6 w-6" />
      ),
    };
  }

  return {
    label: "Pending",
    description:
      "Your deposit is still being processed.",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700",
    icon: (
      <Clock3 className="h-6 w-6" />
    ),
  };
}

export default function TransactionStatusPage() {
  const [reference, setReference] =
    useState("");

  const [transaction, setTransaction] =
    useState<Transaction | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function checkTransaction(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setTransaction(null);

    const cleanReference =
      reference.trim();

    if (!cleanReference) {
      setError(
        "Please enter your transaction reference."
      );
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams();

      params.set(
        "reference",
        cleanReference
      );

      const response = await fetch(
        `/api/transaction-status?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to find this deposit."
        );
      }

      setTransaction(
        data.transaction
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to check transaction."
      );
    } finally {
      setLoading(false);
    }
  }

  const status = transaction
    ? getStatusInfo(
        transaction.status
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        {/* HEADER */}

        <div className="mb-6">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <ReceiptText className="h-6 w-6 text-indigo-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Transaction Status
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Confirm your wallet deposit using
                your transaction reference.
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH */}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              Check Deposit
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter the transaction reference you
              received when making your deposit.
            </p>
          </div>

          <form
            onSubmit={checkTransaction}
            className="space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Transaction Reference
              </label>

              <input
                type="text"
                value={reference}
                onChange={(event) =>
                  setReference(
                    event.target.value
                  )
                }
                placeholder="e.g. BF-FUND-XXXXXXXX"
                autoComplete="off"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Check Transaction
                </>
              )}
            </button>
          </form>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Transaction not found
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* RESULT */}

        {transaction && status && (
          <div className="mt-6 space-y-4">

            {/* STATUS */}

            <div
              className={`rounded-2xl border p-5 ${status.className}`}
            >
              <div className="flex items-center gap-3">
                {status.icon}

                <div>
                  <p className="text-lg font-bold">
                    {status.label}
                  </p>

                  <p className="mt-1 text-sm">
                    {status.description}
                  </p>
                </div>
              </div>
            </div>

            {/* DEPOSIT DETAILS */}

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">

              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
                  <Wallet className="h-5 w-5 text-indigo-600" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Deposit Details
                  </h2>

                  <p className="text-sm text-gray-500">
                    Wallet funding transaction
                  </p>
                </div>
              </div>

              {/* AMOUNT */}

              <div className="mb-6 rounded-xl bg-gray-50 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Deposit Amount
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatMoney(
                    transaction.amount
                  )}
                </p>
              </div>

              {/* DETAILS */}

              <div className="space-y-4">

                <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-500">
                    Transaction Reference
                  </span>

                  <span className="break-all text-sm font-bold text-gray-900 sm:text-right">
                    {transaction.reference}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-sm text-gray-500">
                    Transaction Type
                  </span>

                  <span className="text-sm font-semibold text-gray-900">
                    Wallet Deposit
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-sm text-gray-500">
                    Payment Provider
                  </span>

                  <span className="text-sm font-semibold text-gray-900">
                    {transaction.provider}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-sm text-gray-500">
                    Date
                  </span>

                  <span className="text-sm font-semibold text-gray-900">
                    {formatDate(
                      transaction.createdAt
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Status
                  </span>

                  <span className="text-sm font-bold">
                    {status.label}
                  </span>
                </div>

              </div>

              {/* SUCCESS MESSAGE */}

              {transaction.status.toUpperCase() ===
                "SUCCESS" && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

                    <div>
                      <p className="font-semibold text-green-800">
                        Deposit confirmed
                      </p>

                      <p className="mt-1 text-sm text-green-700">
                        This wallet deposit was successfully
                        processed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}