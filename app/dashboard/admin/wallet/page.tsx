
"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Wallet,
  Plus,
  Minus,
  Settings2,
  RefreshCw,
  CheckCircle,
  XCircle,
  CreditCard,
  Clock,
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

type ActionType = "FUND" | "DEDUCT" | "SET";

type Withdrawal = {
  id: string;
  amount: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  status: string;
  reference: string;
  adminNote?: string | null;
  createdAt: string;
  processedAt?: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    walletBalance: number;
  };
};

export default function AdminWalletPage() {
  /* =========================
     USER WALLET MANAGEMENT
  ========================= */

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [amount, setAmount] = useState("");
  const [action, setAction] =
    useState<ActionType>("FUND");

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* =========================
     WITHDRAWALS
  ========================= */

  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [withdrawalsLoading, setWithdrawalsLoading] =
    useState(false);

  const [withdrawalError, setWithdrawalError] =
    useState("");

  const [processingWithdrawal, setProcessingWithdrawal] =
    useState<string | null>(null);

  const [adminNotes, setAdminNotes] =
    useState<Record<string, string>>({});

  /* =========================
     FORMAT MONEY
  ========================= */

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(value);
  }

  /* =========================
     SEARCH USERS
  ========================= */

  async function searchUsers() {
    if (!search.trim()) {
      setUsers([]);
      return;
    }

    setSearching(true);
    setError("");

    try {
      const query = encodeURIComponent(
        search.trim()
      );

      const response = await fetch(
        `/api/admin/wallet/search?q=${query}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to search users."
        );
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to search users."
      );

      setUsers([]);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  /* =========================
     SELECT USER
  ========================= */

  function selectUser(user: User) {
    setSelectedUser(user);
    setUsers([]);
    setAmount("");
    setMessage("");
    setError("");
  }

  /* =========================
     WALLET ACTION
  ========================= */

  async function handleWalletAction() {
    if (!selectedUser) {
      setError(
        "Please select a user first."
      );
      return;
    }

    const numericAmount = Number(amount);

    if (
      !amount ||
      !Number.isFinite(numericAmount)
    ) {
      setError(
        "Please enter a valid amount."
      );
      return;
    }

    if (numericAmount <= 0) {
      setError(
        "Amount must be greater than zero."
      );
      return;
    }

    if (
      action === "DEDUCT" &&
      numericAmount >
        selectedUser.walletBalance
    ) {
      setError(
        "The deduction cannot be greater than the user's wallet balance."
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
            userId: selectedUser.id,
            action,
            amount: numericAmount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Wallet action failed."
        );
      }

      setSelectedUser(data.user);
      setAmount("");

      setMessage(
        action === "FUND"
          ? "Wallet funded successfully."
          : action === "DEDUCT"
          ? "Wallet deduction completed successfully."
          : "Wallet balance updated successfully."
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

  /* =========================
     LOAD WITHDRAWALS
  ========================= */

  async function loadWithdrawals() {
    setWithdrawalsLoading(true);
    setWithdrawalError("");

    try {
      const response = await fetch(
        "/api/admin/withdrawals",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load withdrawals."
        );
      }

      setWithdrawals(
        data.withdrawals || []
      );
    } catch (err) {
      setWithdrawalError(
        err instanceof Error
          ? err.message
          : "Failed to load withdrawals."
      );
    } finally {
      setWithdrawalsLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawals();
  }, []);

  /* =========================
     UPDATE WITHDRAWAL STATUS
  ========================= */

  async function updateWithdrawal(
    withdrawalId: string,
    status: "APPROVED" | "REJECTED" | "PAID"
  ) {
    setProcessingWithdrawal(
      withdrawalId
    );

    setWithdrawalError("");

    try {
      const response = await fetch(
        `/api/admin/withdrawals/${withdrawalId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
            adminNote:
              adminNotes[withdrawalId] ||
              "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update withdrawal."
        );
      }

      await loadWithdrawals();
    } catch (err) {
      setWithdrawalError(
        err instanceof Error
          ? err.message
          : "Failed to update withdrawal."
      );
    } finally {
      setProcessingWithdrawal(null);
    }
  }

  /* =========================
     WITHDRAWAL STATUS STYLE
  ========================= */

  function withdrawalStatusStyle(
    status: string
  ) {
    switch (status) {
      case "APPROVED":
        return "bg-blue-100 text-blue-700";

      case "PAID":
        return "bg-green-100 text-green-700";

      case "REJECTED":
        return "bg-red-100 text-red-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  return (
    <div className="space-y-8">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Wallet Management
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Search users, manage wallet balances,
          and process withdrawal requests.
        </p>
      </div>

      {/* =========================
          USER WALLET MANAGEMENT
      ========================= */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
            <Wallet className="h-5 w-5 text-indigo-600" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              User Wallet Management
            </h2>

            <p className="text-sm text-gray-500">
              Fund, deduct, or manually set a user's wallet balance.
            </p>
          </div>
        </div>

        {/* SEARCH */}

        <div className="mt-6">

          <div className="relative">

            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name, email or phone..."
              className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            {searching && (
              <RefreshCw className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-indigo-600" />
            )}

          </div>

          {/* SEARCH RESULTS */}

          {users.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">

              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() =>
                    selectUser(user)
                  }
                  className="flex w-full items-center justify-between border-b border-gray-100 p-4 text-left transition last:border-b-0 hover:bg-gray-50"
                >

                  <div>
                    <p className="font-semibold text-gray-900">
                      {user.fullName}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {user.email}
                    </p>

                    <p className="text-xs text-gray-400">
                      {user.phone}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Balance
                    </p>

                    <p className="font-bold text-indigo-600">
                      {formatMoney(
                        user.walletBalance
                      )}
                    </p>
                  </div>

                </button>
              ))}

            </div>
          )}

          {search.trim() &&
            !searching &&
            users.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                No users found.
              </p>
            )}

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* SELECTED USER */}

        {selectedUser && (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100">
                  <Wallet className="h-5 w-5 text-indigo-600" />
                </div>

                <div>
                  <p className="font-bold text-gray-900">
                    {selectedUser.fullName}
                  </p>

                  <p className="text-sm text-gray-500">
                    {selectedUser.email}
                  </p>

                  <p className="text-xs text-gray-400">
                    {selectedUser.phone}
                  </p>
                </div>

              </div>

              <div className="rounded-xl bg-indigo-50 px-5 py-3">
                <p className="text-xs text-indigo-600">
                  Current Balance
                </p>

                <p className="text-xl font-bold text-indigo-700">
                  {formatMoney(
                    selectedUser.walletBalance
                  )}
                </p>
              </div>

            </div>

            {/* ACTION BUTTONS */}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <button
                type="button"
                onClick={() =>
                  setAction("FUND")
                }
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  action === "FUND"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Plus className="h-4 w-4" />
                Fund Wallet
              </button>

              <button
                type="button"
                onClick={() =>
                  setAction("DEDUCT")
                }
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  action === "DEDUCT"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Minus className="h-4 w-4" />
                Deduct Wallet
              </button>

              <button
                type="button"
                onClick={() =>
                  setAction("SET")
                }
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  action === "SET"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Settings2 className="h-4 w-4" />
                Set Balance
              </button>

            </div>

            {/* AMOUNT */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {action === "SET"
                  ? "New Wallet Balance"
                  : "Amount"}
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <button
                  type="button"
                  onClick={
                    handleWalletAction
                  }
                  disabled={loading}
                  className={`rounded-xl px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    action === "DEDUCT"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {loading
                    ? "Processing..."
                    : action === "FUND"
                    ? "Fund Wallet"
                    : action === "DEDUCT"
                    ? "Deduct Wallet"
                    : "Set Balance"}
                </button>

              </div>

            </div>

            {message && (
              <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {message}
              </div>
            )}

          </div>
        )}

      </div>

      {/* =========================
          WITHDRAWAL REQUESTS
      ========================= */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
              <CreditCard className="h-5 w-5 text-orange-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Withdrawal Requests
              </h2>

              <p className="text-sm text-gray-500">
                Review and process user withdrawal requests.
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={loadWithdrawals}
            disabled={withdrawalsLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                withdrawalsLoading
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </button>

        </div>

        {withdrawalError && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {withdrawalError}
          </div>
        )}

        {withdrawalsLoading ? (
          <div className="flex items-center justify-center py-12">

            <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />

          </div>
        ) : withdrawals.length === 0 ? (
          <div className="py-12 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Clock className="h-6 w-6 text-gray-400" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              No withdrawal requests
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              New withdrawal requests will appear here.
            </p>

          </div>
        ) : (
          <div className="mt-6 space-y-4">

            {withdrawals.map(
              (withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
                >

                  {/* USER + STATUS */}

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div>

                      <div className="flex items-center gap-3">

                        <h3 className="font-bold text-gray-900">
                          {withdrawal.user.fullName}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${withdrawalStatusStyle(
                            withdrawal.status
                          )}`}
                        >
                          {withdrawal.status}
                        </span>

                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {withdrawal.user.email}
                      </p>

                      <p className="text-xs text-gray-400">
                        {withdrawal.user.phone}
                      </p>

                    </div>

                    <div className="text-left lg:text-right">

                      <p className="text-xs text-gray-500">
                        Withdrawal Amount
                      </p>

                      <p className="text-2xl font-bold text-gray-900">
                        {formatMoney(
                          withdrawal.amount
                        )}
                      </p>

                    </div>

                  </div>

                  {/* BANK DETAILS */}

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs text-gray-500">
                        Bank
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {withdrawal.bankName}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs text-gray-500">
                        Account Number
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {withdrawal.accountNumber}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs text-gray-500">
                        Account Name
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {withdrawal.accountName}
                      </p>
                    </div>

                  </div>

                  {/* REFERENCE */}

                  <div className="mt-4 rounded-xl bg-white p-4">

                    <p className="text-xs text-gray-500">
                      Reference
                    </p>

                    <p className="mt-1 break-all font-mono text-xs text-gray-700">
                      {withdrawal.reference}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      Requested{" "}
                      {new Date(
                        withdrawal.createdAt
                      ).toLocaleString(
                        "en-NG"
                      )}
                    </p>

                  </div>

                  {/* ADMIN NOTE */}

                  {withdrawal.status ===
                    "PENDING" && (
                    <div className="mt-4">

                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Admin Note
                      </label>

                      <textarea
                        value={
                          adminNotes[
                            withdrawal.id
                          ] || ""
                        }
                        onChange={(event) =>
                          setAdminNotes(
                            (current) => ({
                              ...current,
                              [withdrawal.id]:
                                event.target
                                  .value,
                            })
                          )
                        }
                        placeholder="Optional note..."
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />

                    </div>
                  )}

                  {/* ACTIONS */}

                  <div className="mt-5 flex flex-wrap gap-3">

                    {withdrawal.status ===
                      "PENDING" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            updateWithdrawal(
                              withdrawal.id,
                              "APPROVED"
                            )
                          }
                          disabled={
                            processingWithdrawal ===
                            withdrawal.id
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateWithdrawal(
                              withdrawal.id,
                              "REJECTED"
                            )
                          }
                          disabled={
                            processingWithdrawal ===
                            withdrawal.id
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}

                    {withdrawal.status ===
                      "APPROVED" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateWithdrawal(
                            withdrawal.id,
                            "PAID"
                          )
                        }
                        disabled={
                          processingWithdrawal ===
                          withdrawal.id
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark as Paid
                      </button>
                    )}

                    {processingWithdrawal ===
                      withdrawal.id && (
                      <span className="inline-flex items-center gap-2 px-2 text-sm text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    )}

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </div>

    </div>
  );
}

