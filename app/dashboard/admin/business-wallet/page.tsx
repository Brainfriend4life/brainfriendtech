
"use client";

import {
  Wallet,
  Building2,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  Landmark,
  RefreshCw,
} from "lucide-react";

import { useEffect, useState } from "react";

import BankAccountForm from "./BankAccountForm";

function formatMoney(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type WalletData = {
  wallet: {
    id: string;
    name: string;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    withdrawnProfit: number;
    availableProfit: number;
    balance: number;
    recipientCode: string | null;
  };

  withdrawals: {
    total: number;
    count: number;
  };

  withdrawalsList?: Withdrawal[];
};

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
};

export default function BusinessWalletPage() {
  const [walletData, setWalletData] =
    useState<WalletData | null>(null);

  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] =
    useState(false);

  const [showBankForm, setShowBankForm] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadWallet() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/business-wallet",
        {
          cache: "no-store",
        }
      );

      const text = await response.text();

      let data: WalletData & {
        success?: boolean;
        message?: string;
      };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Business wallet API returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load business wallet."
        );
      }

      setWalletData(data);

      setWithdrawals(
        data.withdrawalsList || []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load business wallet."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  async function handleWithdrawal() {
    setError("");
    setMessage("");

    const withdrawalAmount =
      Number(amount);

    if (
      !amount ||
      !Number.isFinite(withdrawalAmount)
    ) {
      setError(
        "Please enter a valid withdrawal amount."
      );
      return;
    }

    if (withdrawalAmount < 100) {
      setError(
        "Minimum withdrawal amount is ₦100."
      );
      return;
    }

    const available =
      Number(
        walletData?.wallet?.availableProfit || 0
      );

    if (withdrawalAmount > available) {
      setError(
        `You can only withdraw up to ${formatMoney(
          available
        )}.`
      );
      return;
    }

    if (!walletData?.wallet?.recipientCode) {
      setError(
        "Please connect a bank account before withdrawing."
      );
      return;
    }

    const confirmed = window.confirm(
      `Withdraw ${formatMoney(
        withdrawalAmount
      )} to the connected business bank account?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setWithdrawing(true);

      const response = await fetch(
        "/api/admin/business-wallet/withdraw",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount: withdrawalAmount,
          }),
        }
      );

      const text = await response.text();

      let data: {
        success?: boolean;
        message?: string;
      };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Withdrawal API returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Withdrawal failed."
        );
      }

      setMessage(
        data.message ||
          "Withdrawal initiated successfully."
      );

      setAmount("");

      await loadWallet();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Withdrawal failed."
      );
    } finally {
      setWithdrawing(false);
    }
  }

  const wallet = walletData?.wallet;

  const availableBalance =
    Number(wallet?.availableProfit || 0);

  const totalRevenue =
    Number(wallet?.totalRevenue || 0);

  const totalWithdrawn =
    Number(wallet?.withdrawnProfit || 0);

  const totalProfit =
    Number(wallet?.totalProfit || 0);

  return (
    <div className="min-h-full space-y-6 bg-transparent text-gray-900 transition-colors dark:text-gray-100">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
          Business Wallet
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400 sm:text-base">
          Manage your business funds, monitor revenue,
          connect your bank account and withdraw available
          profit.
        </p>
      </div>

      {/* =====================================================
          ALERTS
      ===================================================== */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Something went wrong
            </p>

            <p className="mt-1 leading-5">
              {error}
            </p>
          </div>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700 shadow-sm dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Successful
            </p>

            <p className="mt-1 leading-5">
              {message}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>

          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            Loading business wallet...
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Please wait while we retrieve your latest wallet information.
          </p>
        </div>
      ) : (
        <>
          {/* =====================================================
              WALLET SUMMARY
          ===================================================== */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* AVAILABLE BALANCE */}

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-6 text-white shadow-lg shadow-indigo-500/10 dark:from-indigo-700 dark:via-indigo-800 dark:to-purple-900 dark:shadow-none">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />

              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-indigo-100">
                    Available Profit
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {formatMoney(
                      availableBalance
                    )}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>

              <div className="relative mt-5 border-t border-white/15 pt-4">
                <p className="text-xs leading-5 text-indigo-100">
                  Profit currently available for
                  business withdrawal.
                </p>
              </div>
            </div>

            {/* TOTAL REVENUE */}

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Revenue
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                    {formatMoney(totalRevenue)}
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
                  <TrendingUpIcon />
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-500">
                Total revenue generated from successful
                platform services.
              </p>
            </div>

            {/* TOTAL WITHDRAWN */}

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Withdrawn
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                    {formatMoney(totalWithdrawn)}
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                  <ArrowDownToLine className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-500">
                Total profit already withdrawn from the
                business wallet.
              </p>
            </div>
          </div>

          {/* =====================================================
              PROFIT SUMMARY
          ===================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Business Profit
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
                  {formatMoney(totalProfit)}
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Revenue minus recorded provider costs.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70">
                <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Available to withdraw
                  </p>

                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatMoney(availableBalance)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              BANK ACCOUNT
          ===================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

            <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6">
              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                  <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-950 dark:text-white">
                    Withdrawal Account
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Bank account that will receive your
                    business withdrawals.
                  </p>
                </div>

              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/60">

                {wallet?.recipientCode ? (
                  <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/10">
                          <Landmark className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Bank account
                          </p>

                          <p className="mt-0.5 font-semibold text-green-700 dark:text-green-400">
                            Connected
                          </p>
                        </div>

                      </div>

                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Paystack Connected
                      </span>

                    </div>

                    <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                        Your business bank account is connected
                        and ready to receive withdrawals.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowBankForm(true);
                        setError("");
                        setMessage("");
                      }}
                      className="mt-4 inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/50"
                    >
                      Change Bank Account
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-800">
                        <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Bank account
                        </p>

                        <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                          Not connected
                        </p>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                          Connect your business bank account
                          before making a withdrawal.
                        </p>
                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowBankForm(true);
                        setError("");
                        setMessage("");
                      }}
                      className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      Connect Bank Account
                    </button>
                  </>
                )}

                {showBankForm && (
                  <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-800">
                    <BankAccountForm
                      onCancel={() =>
                        setShowBankForm(false)
                      }
                      onSuccess={async () => {
                        setShowBankForm(false);

                        setMessage(
                          "Bank account connected successfully."
                        );

                        await loadWallet();
                      }}
                    />
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* =====================================================
              WITHDRAW FUNDS
          ===================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

            <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6">
              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
                  <ArrowDownToLine className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-950 dark:text-white">
                    Withdraw Funds
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Withdraw available business profit to
                    your connected bank account.
                  </p>
                </div>

              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="max-w-xl">

                <label
                  htmlFor="withdrawal-amount"
                  className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Withdrawal Amount
                </label>

                <div className="relative mt-2">

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500 dark:text-gray-400">
                    ₦
                  </span>

                  <input
                    id="withdrawal-amount"
                    type="number"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    min="100"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    disabled={
                      withdrawing ||
                      !wallet?.recipientCode
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-10 pr-4 text-gray-950 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-600 dark:hover:border-gray-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/10 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                  />

                </div>

                <div className="mt-3 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-gray-500 dark:text-gray-400">
                    Minimum withdrawal:{" "}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      ₦100.00
                    </span>
                  </p>

                  <p className="text-gray-500 dark:text-gray-400">
                    Available:{" "}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {formatMoney(
                        availableBalance
                      )}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleWithdrawal}
                  disabled={
                    withdrawing ||
                    !wallet?.recipientCode ||
                    availableBalance < 100
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-500/20"
                >
                  {withdrawing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing withdrawal...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="h-4 w-4" />
                      Withdraw Funds
                    </>
                  )}
                </button>

                {!wallet?.recipientCode && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <p className="text-center text-xs leading-5 text-amber-700 dark:text-amber-300">
                      Connect your bank account before
                      withdrawing funds.
                    </p>
                  </div>
                )}

                {wallet?.recipientCode &&
                  availableBalance < 100 && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                      <p className="text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
                        You need at least ₦100.00 of
                        available profit before you can
                        make a withdrawal.
                      </p>
                    </div>
                  )}

              </div>
            </div>
          </div>

          {/* =====================================================
              WITHDRAWAL HISTORY
          ===================================================== */}

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

            <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6">
              <div className="flex items-center justify-between gap-4">

                <div>
                  <h2 className="font-bold text-gray-950 dark:text-white">
                    Withdrawal History
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Your recent business withdrawals.
                  </p>
                </div>

                <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-gray-50 sm:flex dark:bg-gray-800">
                  <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>

              </div>
            </div>

            {withdrawals.length === 0 ? (
              <div className="p-10 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <ArrowDownToLine className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>

                <p className="mt-4 font-medium text-gray-700 dark:text-gray-300">
                  No withdrawals yet
                </p>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                  Your withdrawal transactions will appear
                  here.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">

                {withdrawals.map(
                  (withdrawal) => {
                    const status =
                      withdrawal.status.toLowerCase();

                    return (
                      <div
                        key={withdrawal.id}
                        className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                      >

                        <div className="min-w-0">

                          <div className="flex items-start gap-3">

                            <div
                              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                status === "success"
                                  ? "bg-green-50 dark:bg-green-500/10"
                                  : status === "failed"
                                  ? "bg-red-50 dark:bg-red-500/10"
                                  : "bg-yellow-50 dark:bg-yellow-500/10"
                              }`}
                            >
                              {status ===
                              "success" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : status ===
                                "failed" ? (
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              )}
                            </div>

                            <div className="min-w-0">

                              <p className="font-semibold text-gray-950 dark:text-white">
                                {withdrawal.description ||
                                  "Business withdrawal"}
                              </p>

                              <p className="mt-1 break-all text-xs text-gray-400 dark:text-gray-500">
                                {withdrawal.reference ||
                                  "No reference"}
                              </p>

                              <p className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                <Clock className="h-3 w-3" />

                                {new Date(
                                  withdrawal.createdAt
                                ).toLocaleString(
                                  "en-NG"
                                )}
                              </p>

                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-5 border-t border-gray-100 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">

                          <p className="text-lg font-bold text-gray-950 dark:text-white">
                            {formatMoney(
                              Number(
                                withdrawal.amount
                              )
                            )}
                          </p>

                          {status ===
                          "success" ? (
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 sm:justify-end">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Successful
                            </p>
                          ) : status ===
                            "failed" ? (
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 sm:justify-end">
                              <XCircle className="h-3.5 w-3.5" />
                              Failed
                            </p>
                          ) : (
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 sm:justify-end">
                              <Clock className="h-3.5 w-3.5" />
                              Pending
                            </p>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   SMALL ICON COMPONENT
   ========================================================= */

function TrendingUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-green-600 dark:text-green-400"
      aria-hidden="true"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

