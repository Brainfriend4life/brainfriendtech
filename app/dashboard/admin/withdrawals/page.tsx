"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Loader2,
  Wallet,
} from "lucide-react";
import Link from "next/link";

export default function WithdrawalPage() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadBalance() {
    try {
      const response = await fetch("/api/wallet", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load wallet balance."
        );
      }

      setBalance(Number(data.walletBalance || 0));
    } catch (err) {
      console.error(err);
      setError("Failed to load wallet balance.");
    } finally {
      setLoadingBalance(false);
    }
  }

  useState(() => {
    loadBalance();
  });

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

    const withdrawalAmount = Number(amount);

    if (
      !Number.isFinite(withdrawalAmount) ||
      withdrawalAmount <= 0
    ) {
      setError("Enter a valid withdrawal amount.");
      return;
    }

    if (
      balance !== null &&
      withdrawalAmount > balance
    ) {
      setError("Insufficient wallet balance.");
      return;
    }

    if (!accountName.trim()) {
      setError("Enter the account name.");
      return;
    }

    if (!accountNumber.trim()) {
      setError("Enter the account number.");
      return;
    }

    if (!bankName.trim()) {
      setError("Enter the bank name.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/withdrawals",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: withdrawalAmount,
            accountName: accountName.trim(),
            accountNumber: accountNumber.trim(),
            bankName: bankName.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to submit withdrawal request."
        );
      }

      setMessage(
        data?.message ||
          "Withdrawal request submitted successfully."
      );

      setAmount("");

      await loadBalance();

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">

        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Withdraw Funds
            </h1>

            <p className="text-sm text-gray-500">
              Withdraw money from your BrainFriend wallet.
            </p>
          </div>
        </div>

        {/* BALANCE */}

        <div className="mb-6 rounded-2xl bg-indigo-600 p-6 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Wallet className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm text-indigo-100">
                Available Balance
              </p>

              <p className="mt-1 text-2xl font-bold">
                {loadingBalance
                  ? "Loading..."
                  : `₦${(balance || 0).toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}`}
              </p>
            </div>
          </div>
        </div>

        {/* FORM */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
              <Banknote className="h-5 w-5 text-green-600" />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Bank Withdrawal
              </h2>

              <p className="text-sm text-gray-500">
                Enter the account details where you want
                to receive your money.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

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
                  setAmount(e.target.value)
                }
                placeholder="Enter amount"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
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
                  setAccountName(e.target.value)
                }
                placeholder="e.g. Emmanuel Oghenevovwero"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Account Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(
                    e.target.value.replace(/\D/g, "")
                  )
                }
                placeholder="10-digit account number"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
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
                  setBankName(e.target.value)
                }
                placeholder="e.g. Access Bank"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Banknote className="h-5 w-5" />
                  Request Withdrawal
                </>
              )}
            </button>

          </form>
        </div>

        <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>Important:</strong> Withdrawal requests are
          reviewed and processed by an administrator. Your
          money will not be sent automatically.
        </div>

      </div>
    </div>
  );
}