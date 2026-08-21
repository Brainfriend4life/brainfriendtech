
"use client";

import {
  Wallet,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Database,
  Smartphone,
  Zap,
  Tv,
  GraduationCap,
  ReceiptText,
} from "lucide-react";
import { useEffect, useState } from "react";

type WalletData = {
  revenue: number;
  transactionCount: number;

  airtimeRevenue: number;
  dataRevenue: number;
  electricityRevenue: number;
  cableRevenue: number;
  examPinRevenue: number;
};

type ProviderResponse = {
  success?: boolean;
  balance?: number;
  message?: string;
};

export default function AdminWalletPage() {
  // =========================================================
  // PROVIDER WALLET
  // =========================================================

  const [providerBalance, setProviderBalance] =
    useState<number | null>(null);

  const [providerLoading, setProviderLoading] =
    useState(true);

  const [providerError, setProviderError] =
    useState("");

  // =========================================================
  // BRAINFRIEND REVENUE WALLET
  // =========================================================

  const [wallet, setWallet] =
    useState<WalletData | null>(null);

  const [walletLoading, setWalletLoading] =
    useState(true);

  const [walletError, setWalletError] =
    useState("");

  // =========================================================
  // FETCH CHEAPDATAHUB PROVIDER BALANCE
  // =========================================================

  async function fetchProviderBalance() {
    try {
      setProviderLoading(true);
      setProviderError("");

      const response = await fetch(
        "/api/admin/cheapdatahub/balance",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result: ProviderResponse =
        await response.json();

      console.log(
        "CHEAPDATAHUB PROVIDER BALANCE:",
        result
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to fetch provider balance."
        );
      }

      setProviderBalance(
        Number(result.balance ?? 0)
      );
    } catch (error) {
      console.error(
        "PROVIDER BALANCE ERROR:",
        error
      );

      setProviderError(
        error instanceof Error
          ? error.message
          : "Unable to fetch provider balance."
      );
    } finally {
      setProviderLoading(false);
    }
  }

  // =========================================================
  // FETCH BRAINFOEND TECH REVENUE
  // =========================================================

  async function fetchRevenueWallet() {
    try {
      setWalletLoading(true);
      setWalletError("");

      const response = await fetch(
  "/api/admin/business-wallet",
  {
    method: "GET",
    cache: "no-store",
  }
);

      const result = await response.json();

      console.log(
        "BRAINFOEND REVENUE WALLET:",
        result
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to fetch revenue wallet."
        );
      }

      setWallet(result.wallet);
    } catch (error) {
      console.error(
        "REVENUE WALLET ERROR:",
        error
      );

      setWalletError(
        error instanceof Error
          ? error.message
          : "Unable to fetch revenue wallet."
      );
    } finally {
      setWalletLoading(false);
    }
  }

  // =========================================================
  // LOAD BOTH WALLETS
  // =========================================================

  async function refreshBothWallets() {
    await Promise.all([
      fetchProviderBalance(),
      fetchRevenueWallet(),
    ]);
  }

  useEffect(() => {
    refreshBothWallets();

    const interval = setInterval(() => {
      refreshBothWallets();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  function formatMoney(value: number) {
    return `₦${Number(value || 0).toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  // =========================================================
  // CALCULATED VALUES
  // =========================================================

  const totalRevenue =
    Number(wallet?.revenue ?? 0);

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="pl-14 lg:pl-0">

        <p className="text-sm font-medium text-indigo-600">
          Admin Panel
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          Wallet Activity
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Manage your provider balance and Brainfriend Global Tech
          revenue separately.
        </p>

      </div>

      {/* =====================================================
          REFRESH ALL
      ===================================================== */}

      <div className="flex justify-end">

        <button
          type="button"
          onClick={refreshBothWallets}
          disabled={
            providerLoading ||
            walletLoading
          }
          className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
        >

          <RefreshCw
            className={`h-4 w-4 ${
              providerLoading ||
              walletLoading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh Wallets

        </button>

      </div>

      {/* =====================================================
          TWO WALLETS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ===================================================
            CHEAPDATAHUB PROVIDER WALLET
        =================================================== */}

        <div className="rounded-3xl bg-indigo-700 p-6 text-white shadow-lg sm:p-8">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Database className="h-6 w-6" />
              </div>

              <div>

                <p className="text-sm font-semibold text-indigo-100">
                  CheapDataHub Provider Wallet
                </p>

                <p className="text-xs text-indigo-300">
                  Provider funds
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={fetchProviderBalance}
              disabled={providerLoading}
              className="rounded-xl bg-white/10 p-3 transition hover:bg-white/20 disabled:opacity-50"
              title="Refresh provider balance"
            >

              <RefreshCw
                className={`h-5 w-5 ${
                  providerLoading
                    ? "animate-spin"
                    : ""
                }`}
              />

            </button>

          </div>

          {/* PROVIDER BALANCE */}

          {providerLoading &&
          providerBalance === null ? (

            <p className="mt-8 text-4xl font-bold">
              Loading...
            </p>

          ) : providerError ? (

            <div className="mt-8">

              <p className="text-sm text-red-200">
                {providerError}
              </p>

              <button
                type="button"
                onClick={fetchProviderBalance}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Try Again
              </button>

            </div>

          ) : (

            <p className="mt-8 text-4xl font-bold sm:text-5xl">
              {formatMoney(
                providerBalance ?? 0
              )}
            </p>

          )}

          <div className="mt-8 border-t border-white/10 pt-4">

            <div className="flex items-start gap-2">

              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-200" />

              <p className="text-xs leading-5 text-indigo-200">
                This is the actual balance available in
                your CheapDataHub account. It is used to
                process provider services such as airtime
                and data.
              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            BRAINFOEND TECH REVENUE WALLET
        =================================================== */}

        <div className="rounded-3xl bg-green-600 p-6 text-white shadow-lg sm:p-8">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Wallet className="h-6 w-6" />
              </div>

              <div>

                <p className="text-sm font-semibold text-green-100">
                  Brainfriend Global Tech Revenue Wallet
                </p>

                <p className="text-xs text-green-200">
                  Platform revenue
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={fetchRevenueWallet}
              disabled={walletLoading}
              className="rounded-xl bg-white/10 p-3 transition hover:bg-white/20 disabled:opacity-50"
              title="Refresh revenue"
            >

              <RefreshCw
                className={`h-5 w-5 ${
                  walletLoading
                    ? "animate-spin"
                    : ""
                }`}
              />

            </button>

          </div>

          {/* REVENUE */}

          {walletLoading &&
          wallet === null ? (

            <p className="mt-8 text-4xl font-bold">
              Loading...
            </p>

          ) : walletError ? (

            <div className="mt-8">

              <p className="text-sm text-red-100">
                {walletError}
              </p>

              <button
                type="button"
                onClick={fetchRevenueWallet}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
              >
                Try Again
              </button>

            </div>

          ) : (

            <p className="mt-8 text-4xl font-bold sm:text-5xl">
              {formatMoney(totalRevenue)}
            </p>

          )}

          <div className="mt-8 border-t border-white/10 pt-4">

            <div className="flex items-start gap-2">

              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-100" />

              <p className="text-xs leading-5 text-green-100">
                This represents successful service revenue
                recorded by Brainfriend Global Tech. It is separate
                from the CheapDataHub provider balance.
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          WALLET DIFFERENCE EXPLANATION
      ===================================================== */}

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">

        <div className="flex items-start gap-3">

          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-indigo-600" />

          <div>

            <h2 className="font-bold text-indigo-900">
              These wallets are completely separate
            </h2>

            <div className="mt-3 space-y-3 text-sm leading-6 text-indigo-800">

              <p>
                <strong>CheapDataHub Provider Wallet</strong>
                {" "}is the money you put into CheapDataHub.
                CheapDataHub deducts from it when services are
                processed.
              </p>

              <p>
                <strong>Brainfriend Global Tech Revenue Wallet</strong>
                {" "}records the money generated from successful
                transactions on your platform.
              </p>

              <p>
                <strong>User Wallet</strong>
                {" "}is completely different again. Money a
                customer funds into their account belongs to
                that customer until they use it to purchase a
                service.
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          REVENUE BREAKDOWN
      ===================================================== */}

      <div className="rounded-2xl bg-white shadow-sm">

        <div className="border-b border-gray-100 p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <ReceiptText className="h-5 w-5 text-indigo-600" />
            </div>

            <div>

              <h2 className="font-bold text-gray-900">
                Brainfriend Revenue Breakdown
              </h2>

              <p className="text-sm text-gray-500">
                Successful transactions by service.
              </p>

            </div>

          </div>

        </div>

        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5">

          {/* AIRTIME */}

          <div className="p-6">

            <div className="flex items-center gap-2">

              <Smartphone className="h-4 w-4 text-blue-600" />

              <p className="text-sm text-gray-500">
                Airtime
              </p>

            </div>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {formatMoney(
                wallet?.airtimeRevenue ?? 0
              )}
            </p>

          </div>

          {/* DATA */}

          <div className="p-6">

            <div className="flex items-center gap-2">

              <Database className="h-4 w-4 text-indigo-600" />

              <p className="text-sm text-gray-500">
                Data
              </p>

            </div>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {formatMoney(
                wallet?.dataRevenue ?? 0
              )}
            </p>

          </div>

          {/* ELECTRICITY */}

          <div className="p-6">

            <div className="flex items-center gap-2">

              <Zap className="h-4 w-4 text-yellow-600" />

              <p className="text-sm text-gray-500">
                Electricity
              </p>

            </div>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {formatMoney(
                wallet?.electricityRevenue ?? 0
              )}
            </p>

          </div>

          {/* CABLE */}

          <div className="p-6">

            <div className="flex items-center gap-2">

              <Tv className="h-4 w-4 text-purple-600" />

              <p className="text-sm text-gray-500">
                Cable TV
              </p>

            </div>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {formatMoney(
                wallet?.cableRevenue ?? 0
              )}
            </p>

          </div>

          {/* EXAM PIN */}

          <div className="p-6">

            <div className="flex items-center gap-2">

              <GraduationCap className="h-4 w-4 text-green-600" />

              <p className="text-sm text-gray-500">
                Exam PIN
              </p>

            </div>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {formatMoney(
                wallet?.examPinRevenue ?? 0
              )}
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          PROVIDER COST / PROFIT NOTICE
      ===================================================== */}

      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6">

        <div className="flex items-start gap-3">

          <TrendingDown className="mt-1 h-5 w-5 shrink-0 text-orange-600" />

          <div>

            <h2 className="font-bold text-orange-900">
              About your actual profit
            </h2>

            <p className="mt-2 text-sm leading-6 text-orange-800">
              Revenue and profit are not automatically the
              same thing. For example, if a customer pays
              ₦100 for data and CheapDataHub deducts ₦97,
              your gross profit is ₦3.
            </p>

            <p className="mt-3 text-sm font-semibold text-orange-900">
              Actual Profit = Customer Payment − Provider Cost
            </p>

            <p className="mt-2 text-xs leading-5 text-orange-700">
              To calculate this automatically, your
              Transaction records need to store the actual
              provider cost for each successful service.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

