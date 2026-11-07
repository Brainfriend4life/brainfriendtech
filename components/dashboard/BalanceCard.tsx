"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Copy,
  Check,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
} from "lucide-react";

type VirtualAccount = {
  accountNumber: string | null;
  accountName: string | null;
  bankName: string | null;
  bankSlug: string | null;
  status: string;
  identificationStatus: string;
  assignmentStatus: string;
};

export default function BalanceCard() {
  const [balance, setBalance] = useState(0);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoadingAccount(true);

      const [walletRes, accountRes] = await Promise.all([
        fetch("/api/wallet", { cache: "no-store" }),
        fetch("/api/paystack/dedicated-account", { cache: "no-store" }),
      ]);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setBalance(Number(walletData.balance ?? walletData.walletBalance ?? 0));
      }

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        setVirtualAccount(accountData.virtualAccount ?? null);
      }
    } catch (error) {
      console.error("BALANCE CARD ERROR:", error);
    } finally {
      setLoading(false);
      setLoadingAccount(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleWalletUpdate = () => fetchData();

    window.addEventListener("walletUpdated", handleWalletUpdate);

    return () => {
      window.removeEventListener("walletUpdated", handleWalletUpdate);
    };
  }, [fetchData]);

  const copyAccountNumber = async () => {
    if (!virtualAccount?.accountNumber) return;

    try {
      await navigator.clipboard.writeText(virtualAccount.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Unable to copy account number");
    }
  };

  const accountAssigned =
    virtualAccount?.status === "ASSIGNED" &&
    Boolean(virtualAccount?.accountNumber);

  return (
    <div className="w-full overflow-hidden rounded-xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 p-3 text-white shadow-lg sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Wallet size={17} />
          </div>

          <div>
            <p className="text-xs font-medium text-indigo-100">My Wallet</p>
            <p className="text-[10px] text-indigo-200">Available balance</p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loadingAccount}
          className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20 disabled:opacity-50"
          aria-label="Refresh wallet"
        >
          <RefreshCw
            size={15}
            className={loadingAccount ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Balance */}
      <div className="mt-3">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {loading
            ? "Loading..."
            : `₦${balance.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
        </h2>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <Link
          href="/dashboard/wallet"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-50"
        >
          <ArrowDownToLine size={14} />
          Fund Wallet
        </Link>

        <Link
          href="/dashboard/wallet"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
        >
          <ArrowUpFromLine size={14} />
          Withdraw
        </Link>
      </div>

      {/* Virtual Account */}
      <div className="mt-3 rounded-lg border border-white/15 bg-white/10 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-indigo-200" />
            <span className="text-[11px] font-semibold">Virtual Account</span>
          </div>

          {accountAssigned && (
            <span className="rounded-full bg-green-400/20 px-2 py-0.5 text-[9px] font-medium text-green-200">
              Active
            </span>
          )}
        </div>

        {accountAssigned ? (
          <>
            <p className="text-[10px] text-indigo-200">
              {virtualAccount?.bankName || "Bank"}
            </p>

            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-lg font-bold tracking-wider">
                {virtualAccount?.accountNumber}
              </p>

              <button
                type="button"
                onClick={copyAccountNumber}
                className="flex shrink-0 items-center gap-1 rounded-md bg-white/15 px-2 py-1.5 text-[10px] font-medium transition hover:bg-white/25"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <p className="mt-1 truncate text-[10px] text-indigo-200">
              {virtualAccount?.accountName}
            </p>
          </>
        ) : virtualAccount?.status === "PROCESSING" ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-indigo-100">
              Account assignment is processing.
            </p>
            <button
              type="button"
              onClick={fetchData}
              className="shrink-0 text-[10px] font-semibold underline"
            >
              Check
            </button>
          </div>
        ) : virtualAccount?.status === "FAILED" ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-red-200">
              Account assignment failed.
            </p>
            <Link
              href="/dashboard/wallet/virtual-account"
              className="shrink-0 text-[10px] font-semibold underline"
            >
              Retry
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-indigo-100">
              Get your personal transfer account.
            </p>
            <Link
              href="/dashboard/wallet/virtual-account"
              className="shrink-0 rounded-md bg-white px-2.5 py-1.5 text-[10px] font-semibold text-indigo-800 transition hover:bg-indigo-50"
            >
              Get Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
