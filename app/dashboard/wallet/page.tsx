"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  reference: string;
  provider: string;
  cost: number;
  profit: number;
  createdAt: string;
};

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // =====================================================
  // FETCH WALLET
  // =====================================================

  async function fetchWallet() {
    try {
      const res = await fetch("/api/wallet", {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setBalance(Number(data.walletBalance) || 0);
      }
    } catch (error) {
      console.error("Wallet fetch error:", error);
    }
  }

  // =====================================================
  // FETCH TRANSACTIONS
  // =====================================================

  async function fetchTransactions() {
    try {
      setLoadingTransactions(true);

      const res = await fetch("/api/wallet/transactions", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to load transactions."
        );
      }

      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Transaction fetch error:", error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }

  // =====================================================
  // REFRESH
  // =====================================================

  async function refreshWallet() {
    await Promise.all([
      fetchWallet(),
      fetchTransactions(),
    ]);
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    refreshWallet();

    const handleWalletUpdate = () => {
      refreshWallet();
    };

    window.addEventListener(
      "walletUpdated",
      handleWalletUpdate
    );

    return () => {
      window.removeEventListener(
        "walletUpdated",
        handleWalletUpdate
      );
    };
  }, []);

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  function formatMoney(value: number) {
    return `₦${Number(value || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // =====================================================
  // TRANSACTION ICON
  // =====================================================

  function getTransactionIcon(type: string) {
    if (type === "FUND_WALLET") {
      return (
        <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
      );
    }

    return (
      <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
    );
  }

  // =====================================================
  // TRANSACTION BACKGROUND
  // =====================================================

  function getTransactionBackground(type: string) {
    if (type === "FUND_WALLET") {
      return "bg-green-100 dark:bg-green-950/50";
    }

    return "bg-red-100 dark:bg-red-950/50";
  }

  // =====================================================
  // STATUS STYLE
  // =====================================================

  function getStatusStyle(status: string) {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400";

      case "PROCESSING":
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400";

      case "FAILED":
      case "REJECTED":
        return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";

      default:
        return "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300";
    }
  }

  // =====================================================
  // STATUS ICON
  // =====================================================

  function getStatusIcon(status: string) {
    switch (status.toUpperCase()) {
      case "SUCCESS":
        return <CheckCircle className="h-3.5 w-3.5" />;

      case "FAILED":
      case "REJECTED":
        return <XCircle className="h-3.5 w-3.5" />;

      case "PROCESSING":
      case "PENDING":
        return <Clock className="h-3.5 w-3.5" />;

      default:
        return null;
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Wallet
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Manage your wallet and view your transaction activity.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshWallet}
          disabled={loadingTransactions}
          className="
            inline-flex items-center justify-center gap-2
            rounded-xl
            bg-gray-100
            px-4 py-2.5
            text-sm font-semibold
            text-gray-700
            transition
            hover:bg-gray-200
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:bg-slate-800
            dark:text-slate-200
            dark:hover:bg-slate-700
          "
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loadingTransactions ? "animate-spin" : ""
            }`}
          />

          Refresh
        </button>

      </div>

      {/* =====================================================
          WALLET BALANCE
      ===================================================== */}

      <div
        className="
          rounded-2xl
          bg-gradient-to-r
          from-indigo-600
          to-purple-600
          p-6
          text-white
          shadow-lg
          sm:p-8
        "
      >

        <p className="text-sm text-indigo-100 sm:text-lg">
          Available Balance
        </p>

        <h2 className="mt-2 text-3xl font-bold sm:text-5xl">
          {formatMoney(balance)}
        </h2>

        <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">

          <Link
            href="/dashboard/wallet/fund"
            className="
              inline-flex
              rounded-lg
              bg-white
              px-5 py-3
              text-sm
              font-semibold
              text-indigo-700
              transition
              hover:bg-gray-100
              sm:px-6
            "
          >
            Fund Wallet
          </Link>

          <Link
            href="/dashboard/wallet/withdraw"
            className="
              inline-flex
              rounded-lg
              border
              border-white/30
              bg-white/10
              px-5 py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-white/20
              sm:px-6
            "
          >
            Withdraw Money
          </Link>

        </div>

      </div>

      {/* =====================================================
          WITHDRAWAL NOTICE
      ===================================================== */}

      <div
        className="
          rounded-2xl
          border
          border-yellow-200
          bg-yellow-50
          p-5
          dark:border-yellow-900/60
          dark:bg-yellow-950/30
        "
      >

        <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
          Withdrawal Notice
        </h3>

        <p className="mt-1 text-sm leading-6 text-yellow-700 dark:text-yellow-400">
          Withdrawals are reviewed and processed by the administrator.
          Your wallet balance will be updated when the withdrawal is
          processed.
        </p>

      </div>

      {/* =====================================================
          WALLET ACTIVITY
      ===================================================== */}

      <div
        className="
          rounded-2xl
          border
          border-gray-100
          bg-white
          p-5
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
          sm:p-6
        "
      >

        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Wallet Activity
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Your recent wallet transactions.
            </p>
          </div>

        </div>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {loadingTransactions ? (

          <div className="flex justify-center py-12">

            <RefreshCw className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />

          </div>

        ) : transactions.length === 0 ? (

          /* ===================================================
             EMPTY
          =================================================== */

          <div className="py-12 text-center">

            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-gray-100
                dark:bg-slate-800
              "
            >
              <Clock className="h-6 w-6 text-gray-400 dark:text-slate-500" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
              No transactions yet
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Your wallet activity will appear here.
            </p>

          </div>

        ) : (

          /* ===================================================
             TRANSACTIONS
          =================================================== */

          <div className="mt-6 divide-y divide-gray-100 dark:divide-slate-800">

            {transactions.map((transaction) => {

              const isFunding =
                transaction.type === "FUND_WALLET";

              return (
                <div
                  key={transaction.id}
                  className="
                    flex
                    flex-col
                    gap-4
                    py-5
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >

                  {/* =================================================
                      LEFT
                  ================================================= */}

                  <div className="flex min-w-0 items-start gap-3">

                    <div
                      className={`
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        ${getTransactionBackground(
                          transaction.type
                        )}
                      `}
                    >
                      {getTransactionIcon(transaction.type)}
                    </div>

                    <div className="min-w-0">

                      <p className="break-words font-semibold text-gray-900 dark:text-white">
                        {transaction.description}
                      </p>

                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Provider:{" "}
                        <span className="text-gray-600 dark:text-slate-300">
                          {transaction.provider}
                        </span>
                      </p>

                      <p className="mt-1 break-all font-mono text-[11px] text-gray-400 dark:text-slate-500">
                        Ref: {transaction.reference}
                      </p>

                      <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                        {formatDate(transaction.createdAt)}
                      </p>

                    </div>

                  </div>

                  {/* =================================================
                      RIGHT
                  ================================================= */}

                  <div className="text-left sm:shrink-0 sm:text-right">

                    <p
                      className={`
                        text-lg
                        font-bold
                        ${
                          isFunding
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-900 dark:text-white"
                        }
                      `}
                    >
                      {isFunding ? "+" : "-"}
                      {formatMoney(transaction.amount)}
                    </p>

                    <span
                      className={`
                        mt-2
                        inline-flex
                        items-center
                        gap-1
                        rounded-full
                        px-2.5
                        py-1
                        text-xs
                        font-semibold
                        ${getStatusStyle(transaction.status)}
                      `}
                    >
                      {getStatusIcon(transaction.status)}

                      {transaction.status}
                    </span>

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>

    </div>
  );
}