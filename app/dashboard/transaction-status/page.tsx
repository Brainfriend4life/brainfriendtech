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
        "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400",
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
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400",
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
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-400",
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

  const [checkingMessage, setCheckingMessage] =
    useState("");

  async function checkTransaction(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setTransaction(null);
    setCheckingMessage("");

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

      const maxAttempts = 3;

      let lastError =
        "Unable to verify this transaction.";

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
      ) {
        try {
          setCheckingMessage(
            attempt === 1
              ? "Checking your transaction..."
              : `Still checking your transaction... (${attempt}/${maxAttempts})`
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
            response.ok &&
            data.success &&
            data.transaction
          ) {
            setTransaction(
              data.transaction
            );

            setError("");
            setCheckingMessage("");

            return;
          }

          if (
            data.found &&
            data.transaction
          ) {
            setTransaction(
              data.transaction
            );

            setError("");
            setCheckingMessage("");

            return;
          }

          lastError =
            data.error ||
            data.message ||
            "Unable to verify this transaction.";

          if (
            attempt === maxAttempts
          ) {
            break;
          }

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                2000
              )
          );
        } catch (requestError) {
          lastError =
            requestError instanceof Error
              ? requestError.message
              : "Unable to check transaction.";

          if (
            attempt === maxAttempts
          ) {
            break;
          }

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                2000
              )
          );
        }
      }

      setError(
        lastError ||
          "Unable to verify this transaction. Please try again."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to check transaction."
      );
    } finally {
      setLoading(false);
      setCheckingMessage("");
    }
  }

  const status = transaction
    ? getStatusInfo(
        transaction.status
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        {/* HEADER */}

        <div className="mb-6">

          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/50">
              <ReceiptText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                Transaction Status
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Confirm your wallet deposit using
                your transaction reference.
              </p>

            </div>

          </div>

        </div>

        {/* SEARCH */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 sm:p-6">

          <div className="mb-5">

            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Check Deposit
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the transaction reference you
              received when making your deposit.
            </p>

          </div>

          <form
            onSubmit={checkTransaction}
            className="space-y-4"
          >

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Transaction Reference
              </label>

              <input
                type="text"
                value={reference}
                onChange={(event) => {
                  setReference(
                    event.target.value
                  );

                  setError("");
                  setTransaction(null);
                  setCheckingMessage("");
                }}
                placeholder="e.g. BF-FUND-XXXXXXXX"
                autoComplete="off"
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-800 dark:focus:ring-indigo-500/20"
              />

            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* CHECKING */}

        {loading && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30">

            <div className="flex items-center gap-3">

              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />

              <div>

                <p className="font-semibold text-indigo-800 dark:text-indigo-300">
                  Verifying transaction
                </p>

                <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-400">
                  {checkingMessage ||
                    "Please wait while we verify your payment with Paystack."}
                </p>

              </div>

            </div>

          </div>
        )}

        {/* ERROR */}

        {error && !loading && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">

            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>

              <p className="font-semibold">
                Unable to verify transaction
              </p>

              <p className="mt-1">
                {error}
              </p>

              <button
                type="button"
                onClick={() => {
                  if (
                    reference.trim()
                  ) {
                    const fakeEvent =
                      {
                        preventDefault:
                          () => {},
                      } as FormEvent<HTMLFormElement>;

                    checkTransaction(
                      fakeEvent
                    );
                  }
                }}
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
              >
                Try Again
              </button>

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

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/50">

                  <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

                </div>

                <div>

                  <h2 className="font-bold text-gray-900 dark:text-white">
                    Deposit Details
                  </h2>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Wallet funding transaction
                  </p>

                </div>

              </div>

              {/* AMOUNT */}

              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-5 text-center dark:border-gray-800 dark:bg-gray-800/70">

                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Deposit Amount
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(
                    transaction.amount
                  )}
                </p>

              </div>

              {/* DETAILS */}

              <div className="space-y-4">

                <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Transaction Reference
                  </span>

                  <span className="break-all text-sm font-bold text-gray-900 dark:text-white sm:text-right">
                    {transaction.reference}
                  </span>

                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Transaction Type
                  </span>

                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Wallet Deposit
                  </span>

                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Payment Provider
                  </span>

                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {transaction.provider}
                  </span>

                </div>

                <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Date
                  </span>

                  <span className="text-sm font-semibold text-gray-900 dark:text-white sm:text-right">
                    {formatDate(
                      transaction.createdAt
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Status
                  </span>

                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {status.label}
                  </span>

                </div>

              </div>

              {/* SUCCESS MESSAGE */}

              {transaction.status.toUpperCase() ===
                "SUCCESS" && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">

                  <div className="flex items-start gap-3">

                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />

                    <div>

                      <p className="font-semibold text-green-800 dark:text-green-300">
                        Deposit confirmed
                      </p>

                      <p className="mt-1 text-sm text-green-700 dark:text-green-400">
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