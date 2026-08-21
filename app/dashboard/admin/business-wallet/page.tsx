"use client";

import {
  Wallet,
  Building2,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
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

    if (!Number.isFinite(withdrawalAmount)) {
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

      let data: any;

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

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-medium text-indigo-600">
          Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          Business Wallet
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Manage your business funds and withdraw
          available profit.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* LOADING */}

      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />

          <p className="mt-4 text-sm text-gray-500">
            Loading Brainfriend Global Tech revenue...
          </p>
        </div>
      ) : (
        <>
          {/* BALANCE */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-indigo-700 p-6 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-200">
                    Available Balance
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {formatMoney(
                      availableBalance
                    )}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>

              <p className="mt-4 text-xs text-indigo-200">
                Profit currently available for
                business withdrawal.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Total Revenue
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatMoney(totalRevenue)}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Total Withdrawn
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatMoney(totalWithdrawn)}
              </p>
            </div>
          </div>

          {/* BANK ACCOUNT */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Withdrawal Account
                </h2>

                <p className="text-sm text-gray-500">
                  Bank account that will receive your
                  business withdrawal.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-5">
              {wallet?.recipientCode ? (
                <>
                  <p className="text-sm text-gray-500">
                    Bank account
                  </p>

                  <p className="mt-1 font-semibold text-green-700">
                    Connected
                  </p>

                  <p className="mt-2 text-xs text-gray-400">
                    Paystack recipient connected successfully.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBankForm(true);
                    }}
                    className="mt-4 rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Change Bank Account
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Bank account
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    Not connected
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Connect your business bank account
                    before making a withdrawal.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBankForm(true);
                      setError("");
                      setMessage("");
                    }}
                    className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Connect Bank Account
                  </button>
                </>
              )}

              {showBankForm && (
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
              )}
            </div>
          </div>

          {/* WITHDRAWAL */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
                <ArrowDownToLine className="h-5 w-5 text-green-600" />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Withdraw Funds
                </h2>

                <p className="text-sm text-gray-500">
                  Withdraw available business profit to
                  your connected bank account.
                </p>
              </div>
            </div>

            <div className="mt-6 max-w-xl">
              <label className="text-sm font-medium text-gray-700">
                Withdrawal Amount
              </label>

              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-gray-500">
                  ₦
                </span>

                <input
                  type="number"
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
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Available:{" "}
                {formatMoney(
                  availableBalance
                )}
              </p>

              <button
                type="button"
                onClick={handleWithdrawal}
                disabled={
                  withdrawing ||
                  !wallet?.recipientCode ||
                  availableBalance < 100
                }
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {withdrawing
                  ? "Processing withdrawal..."
                  : "Withdraw Funds"}
              </button>

              {!wallet?.recipientCode && (
                <p className="mt-3 text-center text-xs text-gray-400">
                  Connect your bank account before
                  withdrawing.
                </p>
              )}
            </div>
          </div>

          {/* WITHDRAWAL HISTORY */}

          <div className="rounded-2xl bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5 sm:p-6">
              <h2 className="font-bold text-gray-900">
                Withdrawal History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your recent business withdrawals.
              </p>
            </div>

            {withdrawals.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowDownToLine className="mx-auto h-8 w-8 text-gray-300" />

                <p className="mt-3 text-sm text-gray-500">
                  No withdrawals yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {withdrawals.map(
                  (withdrawal) => {
                    const status =
                      withdrawal.status.toLowerCase();

                    return (
                      <div
                        key={withdrawal.id}
                        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {withdrawal.description ||
                              "Business withdrawal"}
                          </p>

                          <p className="mt-1 break-all text-xs text-gray-400">
                            {withdrawal.reference ||
                              "No reference"}
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />

                            {new Date(
                              withdrawal.createdAt
                            ).toLocaleString(
                              "en-NG"
                            )}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                          <p className="font-bold text-gray-900">
                            {formatMoney(
                              Number(
                                withdrawal.amount
                              )
                            )}
                          </p>

                          {status ===
                          "success" ? (
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600 sm:justify-end">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Successful
                            </p>
                          ) : status ===
                            "failed" ? (
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 sm:justify-end">
                              <XCircle className="h-3.5 w-3.5" />
                              Failed
                            </p>
                          ) : (
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-yellow-600 sm:justify-end">
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