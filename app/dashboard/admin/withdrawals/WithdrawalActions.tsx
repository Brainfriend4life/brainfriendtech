"use client";

import { useState } from "react";
import { Check, X, Banknote, Loader2 } from "lucide-react";

type Props = {
  withdrawalId: string;
  status: string;
};

export default function WithdrawalActions({
  withdrawalId,
  status,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function processWithdrawal(
    action: "APPROVE" | "REJECT" | "PAID"
  ) {
    const message =
      action === "APPROVE"
        ? "Approve this withdrawal?"
        : action === "REJECT"
          ? "Reject this withdrawal and refund the user's wallet?"
          : "Have you actually transferred the money to the user's bank account?";

    if (!confirm(message)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/withdrawals",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            withdrawalId,
            action,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to process withdrawal."
        );
      }

      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );

      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Processing...
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            processWithdrawal("APPROVE")
          }
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <Check className="h-4 w-4" />
          Approve
        </button>

        <button
          onClick={() =>
            processWithdrawal("REJECT")
          }
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            processWithdrawal("PAID")
          }
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
        >
          <Banknote className="h-4 w-4" />
          Mark as Paid
        </button>

        <button
          onClick={() =>
            processWithdrawal("REJECT")
          }
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
      </div>
    );
  }

  if (status === "PAID") {
    return (
      <span className="text-sm font-semibold text-green-600">
        ✓ Payment completed
      </span>
    );
  }

  return (
    <span className="text-sm font-semibold text-red-600">
      ✕ Withdrawal rejected
    </span>
  );
}