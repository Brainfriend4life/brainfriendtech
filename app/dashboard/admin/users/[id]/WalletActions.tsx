"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  currentBalance: number;
};

type WalletAction = "FUND" | "DEDUCT";

export default function WalletActions({
  userId,
  currentBalance,
}: Props) {
  const router = useRouter();

  const [action, setAction] =
    useState<WalletAction>("FUND");
  const [amount, setAmount] = useState("");
  const [description, setDescription] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Please enter a valid amount greater than zero."
      );
      return;
    }

    if (
      action === "DEDUCT" &&
      numericAmount > currentBalance
    ) {
      setError(
        "Amount exceeds user's current wallet balance."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/admin/wallet",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            action,
            amount: numericAmount,
            description,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Something went wrong."
        );
      }

      setSuccess(data.message);
      setAmount("");
      setDescription("");
      router.refresh();
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to update wallet."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-gray-200 p-4"
    >
      <h3 className="font-semibold text-gray-900">
        Fund / Deduct Wallet
      </h3>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setAction("FUND")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            action === "FUND"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          Add Funds
        </button>

        <button
          type="button"
          onClick={() => setAction("DEDUCT")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            action === "DEDUCT"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          Remove Funds
        </button>
      </div>

      <div>
        <label className="text-sm text-gray-500">
          Amount (₦)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
          required
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="text-sm text-gray-500">
          Reason (optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="e.g. Support ticket #452 refund"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-600">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded-lg py-2 text-sm font-semibold text-white transition ${
          action === "FUND"
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
        } disabled:opacity-50`}
      >
        {loading
          ? "Processing..."
          : action === "FUND"
          ? "Add Funds"
          : "Remove Funds"}
      </button>
    </form>
  );
}