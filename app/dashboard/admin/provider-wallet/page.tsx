"use client";

import {
  Wallet,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useState } from "react";

type RevenueBreakdown = {
  AIRTIME: number;
  DATA: number;
  ELECTRICITY: number;
  CABLE: number;
  EXAM_PIN: number;
};

export default function ProviderWalletPage() {
  // =========================================================
  // CHEAPDATAHUB PROVIDER BALANCE
  // =========================================================

  const [providerBalance, setProviderBalance] =
    useState<number | null>(null);

  const [providerLoading, setProviderLoading] =
    useState(true);

  const [providerError, setProviderError] =
    useState("");

  // =========================================================
  // BRAINFOREND TECH REVENUE
  // =========================================================

  const [revenueBalance, setRevenueBalance] =
    useState<number | null>(null);

  const [revenueLoading, setRevenueLoading] =
    useState(true);

  const [revenueError, setRevenueError] =
    useState("");

  const [revenueBreakdown, setRevenueBreakdown] =
    useState<RevenueBreakdown>({
      AIRTIME: 0,
      DATA: 0,
      ELECTRICITY: 0,
      CABLE: 0,
      EXAM_PIN: 0,
    });

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  function formatMoney(value: number) {
    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // =========================================================
  // FETCH CHEAPDATAHUB BALANCE
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

      const result = await response.json();

      console.log(
        "CHEAPDATAHUB PROVIDER BALANCE:",
        result
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to fetch CheapDataHub balance."
        );
      }

      setProviderBalance(
        Number(result.balance)
      );
    } catch (error) {
      console.error(
        "CHEAPDATAHUB PROVIDER BALANCE ERROR:",
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
  // FETCH BRAINFOREND TECH REVENUE
  // =========================================================

  async function fetchRevenueBalance() {
    try {
      setRevenueLoading(true);
      setRevenueError("");

      const response = await fetch(
        "/api/admin/revenue/balance",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      console.log(
        "BRAINFOREND TECH REVENUE:",
        result
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to calculate revenue."
        );
      }

      setRevenueBalance(
        Number(result.totalRevenue ?? result.balance ?? 0)
      );

      setRevenueBreakdown({
        AIRTIME: Number(
          result.breakdown?.AIRTIME ?? 0
        ),
        DATA: Number(
          result.breakdown?.DATA ?? 0
        ),
        ELECTRICITY: Number(
          result.breakdown?.ELECTRICITY ?? 0
        ),
        CABLE: Number(
          result.breakdown?.CABLE ?? 0
        ),
        EXAM_PIN: Number(
          result.breakdown?.EXAM_PIN ?? 0
        ),
      });
    } catch (error) {
      console.error(
        "BRAINFOREND TECH REVENUE ERROR:",
        error
      );

      setRevenueError(
        error instanceof Error
          ? error.message
          : "Unable to calculate revenue."
      );
    } finally {
      setRevenueLoading(false);
    }
  }

  // =========================================================
  // REFRESH BOTH
  // =========================================================

  async function refreshAll() {
    await Promise.all([
      fetchProviderBalance(),
      fetchRevenueBalance(),
    ]);
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    refreshAll();

    const interval = setInterval(() => {
      refreshAll();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =========================================================
  // REFRESH WHEN TAB BECOMES ACTIVE
  // =========================================================

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible"
      ) {
        refreshAll();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  // =========================================================
  // SERVICE CARDS
  // =========================================================

  const services = [
    {
      name: "Airtime",
      value: revenueBreakdown.AIRTIME,
      icon: Smartphone,
      bg: "bg-blue-100",
      color: "text-blue-600",
    },
    {
      name: "Data",
      value: revenueBreakdown.DATA,
      icon: Wifi,
      bg: "bg-indigo-100",
      color: "text-indigo-600",
    },
    {
      name: "Electricity",
      value: revenueBreakdown.ELECTRICITY,
      icon: Zap,
      bg: "bg-yellow-100",
      color: "text-yellow-600",
    },
    {
      name: "Cable TV",
      value: revenueBreakdown.CABLE,
      icon: Tv,
      bg: "bg-purple-100",
      color: "text-purple-600",
    },
    {
      name: "Exam PIN",
      value: revenueBreakdown.EXAM_PIN,
      icon: GraduationCap,
      bg: "bg-green-100",
      color: "text-green-600",
    },
  ];

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-medium text-indigo-600">
          Admin Panel
        </p>

        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Provider & Revenue Wallet
            </h1>

            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Monitor your provider funds and Brainfriend
              Tech revenue separately.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshAll}
            disabled={
              providerLoading ||
              revenueLoading
            }
            className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                providerLoading ||
                revenueLoading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>
      </div>

      {/* =====================================================
          TWO DIFFERENT WALLETS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ===================================================
            CHEAPDATAHUB PROVIDER WALLET
        =================================================== */}

        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <Wallet className="h-6 w-6 text-blue-300" />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-300">
                  CheapDataHub
                </p>

                <p className="text-xs text-slate-400">
                  Provider Wallet
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={fetchProviderBalance}
              disabled={providerLoading}
              className="rounded-xl bg-white/10 p-3 transition hover:bg-white/20 disabled:opacity-50"
              title="Refresh CheapDataHub balance"
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

          {providerLoading &&
          providerBalance === null ? (
            <p className="mt-8 text-4xl font-bold">
              Loading...
            </p>
          ) : providerError ? (
            <div className="mt-8">
              <p className="text-sm text-red-300">
                {providerError}
              </p>

              <button
                type="button"
                onClick={fetchProviderBalance}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900"
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

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4" />

              <span>
                Actual balance in your CheapDataHub
                provider account.
              </span>
            </div>

          </div>

        </div>

        {/* ===================================================
            BRAINFOREND TECH REVENUE
        =================================================== */}

        <div className="rounded-3xl bg-indigo-700 p-6 text-white shadow-lg sm:p-8">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <TrendingUp className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold text-indigo-100">
                  Brainfriend Tech
                </p>

                <p className="text-xs text-indigo-300">
                  Service Revenue
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={fetchRevenueBalance}
              disabled={revenueLoading}
              className="rounded-xl bg-white/10 p-3 transition hover:bg-white/20 disabled:opacity-50"
              title="Refresh revenue"
            >
              <RefreshCw
                className={`h-5 w-5 ${
                  revenueLoading
                    ? "animate-spin"
                    : ""
                }`}
              />
            </button>

          </div>

          {revenueLoading &&
          revenueBalance === null ? (
            <p className="mt-8 text-4xl font-bold">
              Loading...
            </p>
          ) : revenueError ? (
            <div className="mt-8">
              <p className="text-sm text-red-200">
                {revenueError}
              </p>

              <button
                type="button"
                onClick={fetchRevenueBalance}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <p className="mt-8 text-4xl font-bold sm:text-5xl">
              {formatMoney(
                revenueBalance ?? 0
              )}
            </p>
          )}

          <div className="mt-8 border-t border-white/10 pt-4">

            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <ArrowUpRight className="h-4 w-4" />

              <span>
                Total successful service purchases
                recorded on your platform.
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          SERVICE REVENUE BREAKDOWN
      ===================================================== */}

      <div>

        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Brainfriend Tech Revenue Breakdown
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Money collected from successful user service
            purchases.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

          {services.map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.name}
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${service.bg}`}
                >
                  <Icon
                    className={`h-5 w-5 ${service.color}`}
                  />
                </div>

                <p className="mt-4 text-sm text-gray-500">
                  {service.name}
                </p>

                <p className="mt-2 text-xl font-bold text-gray-900">
                  {formatMoney(service.value)}
                </p>

              </div>
            );
          })}

        </div>

      </div>

      {/* =====================================================
          IMPORTANT DIFFERENCE
      ===================================================== */}

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">

        <div className="flex items-start gap-3">

          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

          <div>

            <h3 className="font-semibold text-indigo-900">
              These balances are separate
            </h3>

            <p className="mt-1 text-sm leading-6 text-indigo-700">
              The CheapDataHub balance is the actual money
              available with your service provider. The
              Brainfriend Tech Revenue figure is calculated
              from successful purchases made by your users.
              Funding a user's wallet does not increase your
              revenue balance.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}