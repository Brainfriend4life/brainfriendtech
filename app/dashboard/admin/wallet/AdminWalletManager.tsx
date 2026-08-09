"use client";

import { useState } from "react";
import {
  Search,
  Wallet,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";

type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  walletBalance: number;
  role: string;
  status: string;
};

export default function AdminWalletManager() {
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<User | null>(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [searching, setSearching] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function findUser() {
    setSearching(true);
    setMessage("");
    setError("");
    setUser(null);

    try {
      const response = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(
          search.trim()
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to search users."
        );
      }

      if (!data.users?.length) {
        throw new Error(
          "No user found."
        );
      }

      setUser(data.users[0]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSearching(false);
    }
  }

  async function updateWallet(
    action: "CREDIT" | "DEBIT"
  ) {
    if (!user) {
      setError("Select a user first.");
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid amount."
      );
      return;
    }

    if (
      action === "DEBIT" &&
      numericAmount >
        user.walletBalance
    ) {
      setError(
        "The user does not have enough wallet balance."
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/admin/wallet",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            action,
            amount: numericAmount,
            description,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update wallet."
        );
      }

      setUser(
        data.user
      );

      setAmount("");
      setDescription("");

      setMessage(
        action === "CREDIT"
          ? "Wallet credited successfully."
          : "Wallet debited successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* SEARCH */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Find User Wallet
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Search for a user by name, email,
          or phone number.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  findUser();
                }
              }}
              placeholder="Name, email or phone"
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={findUser}
            disabled={
              searching ||
              !search.trim()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find User
              </>
            )}
          </button>
        </div>
      </div>

      {/* MESSAGE */}

      {message && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* USER WALLET */}

      {user && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
                <Wallet className="h-7 w-7 text-indigo-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user.fullName}
                </h2>

                <p className="text-sm text-gray-500">
                  {user.email}
                </p>

                <p className="text-sm text-gray-500">
                  {user.phone}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50 px-6 py-4">
              <p className="text-sm text-indigo-600">
                Wallet Balance
              </p>

              <p className="mt-1 text-2xl font-bold text-indigo-700">
                ₦
                {user.walletBalance.toLocaleString(
                  "en-NG",
                  {
                    minimumFractionDigits: 2,
                  }
                )}
              </p>
            </div>
          </div>

          {/* WALLET ACTIONS */}

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-900">
              Wallet Actions
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Amount
                </label>

                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <input
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  placeholder="Optional description"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  updateWallet(
                    "CREDIT"
                  )
                }
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />

                {loading
                  ? "Processing..."
                  : "Credit Wallet"}
              </button>

              <button
                type="button"
                onClick={() =>
                  updateWallet(
                    "DEBIT"
                  )
                }
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Minus className="h-5 w-5" />

                {loading
                  ? "Processing..."
                  : "Debit Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}