
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function WithdrawPage() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleWithdraw(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const withdrawalAmount = Number(amount);

    if (!withdrawalAmount || withdrawalAmount <= 0) {
      setError("Enter a valid withdrawal amount.");
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

    try {
      setLoading(true);

      const res = await fetch("/api/wallet/withdraw", {
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
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || "Failed to submit withdrawal."
        );
        return;
      }

      setSuccess(
        "Withdrawal request submitted successfully. It is now waiting for admin processing."
      );

      window.dispatchEvent(
        new Event("walletUpdated")
      );

      setAmount("");
      setAccountName("");
      setAccountNumber("");
      setBankName("");

      setTimeout(() => {
        router.push("/dashboard/wallet");
      }, 1800);
    } catch (error) {
      console.error(error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/wallet"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to Wallet
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Withdraw Money
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Enter your bank details and the amount you want
          to withdraw.
        </p>
      </div>

      <form
        onSubmit={handleWithdraw}
        className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

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
            placeholder="Account holder name"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
              setAccountNumber(e.target.value)
            }
            placeholder="10-digit account number"
            maxLength={10}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
            placeholder="Enter bank name"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Submitting..."
            : "Submit Withdrawal Request"}
        </button>
      </form>

      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
        <p className="text-sm text-yellow-800">
          <strong>Important:</strong> Withdrawal requests
          are processed by the administrator. Do not submit
          a request with incorrect bank details.
        </p>
      </div>
    </div>
  );
}
