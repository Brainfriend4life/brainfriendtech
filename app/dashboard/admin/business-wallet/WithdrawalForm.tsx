
"use client";

import { useState } from "react";

type Props = {
  connected: boolean;
  onConnected: () => void;
};

export default function WithdrawalForm({
  connected,
  onConnected,
}: Props) {
  const [accountName, setAccountName] =
    useState("");

  const [accountNumber, setAccountNumber] =
    useState("");

  const [bankCode, setBankCode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function connectBankAccount() {
    setError("");
    setMessage("");

    if (!accountName.trim()) {
      setError("Enter the account name.");
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setError(
        "Enter a valid 10-digit Nigerian account number."
      );
      return;
    }

    if (!bankCode.trim()) {
      setError(
        "Enter the bank code."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/business-wallet/recipient",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            accountName:
              accountName.trim(),

            accountNumber:
              accountNumber.trim(),

            bankCode:
              bankCode.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to connect bank account."
        );
      }

      setMessage(
        data.message ||
          "Bank account connected successfully."
      );

      setAccountName("");
      setAccountNumber("");
      setBankCode("");

      onConnected();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect bank account."
      );
    } finally {
      setLoading(false);
    }
  }

  if (connected) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="font-semibold text-green-700">
          Bank account connected
        </p>

        <p className="mt-1 text-sm text-green-600">
          Your Paystack recipient is ready for withdrawals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700">
          Account Name
        </label>

        <input
          type="text"
          value={accountName}
          onChange={(event) =>
            setAccountName(
              event.target.value
            )
          }
          placeholder="Brainfriend Global Tech"
          disabled={loading}
          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Account Number
        </label>

        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={accountNumber}
          onChange={(event) =>
            setAccountNumber(
              event.target.value.replace(
                /\D/g,
                ""
              )
            )
          }
          placeholder="0123456789"
          disabled={loading}
          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Bank Code
        </label>

        <input
          type="text"
          value={bankCode}
          onChange={(event) =>
            setBankCode(
              event.target.value
            )
          }
          placeholder="e.g. 058"
          disabled={loading}
          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
        />

        <p className="mt-1 text-xs text-gray-400">
          Use the Paystack bank code for your bank.
        </p>
      </div>

      <button
        type="button"
        onClick={
          connectBankAccount
        }
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Connecting bank account..."
          : "Connect Bank Account"}
      </button>
    </div>
  );
}

