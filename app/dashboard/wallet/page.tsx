
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);

  async function fetchWallet() {
    try {
      const res = await fetch("/api/wallet");

      const data = await res.json();

      setBalance(Number(data.walletBalance) || 0);
    } catch (error) {
      console.log("Wallet fetch error:", error);
    }
  }

  useEffect(() => {
    fetchWallet();

    window.addEventListener("walletUpdated", fetchWallet);

    return () => {
      window.removeEventListener("walletUpdated", fetchWallet);
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Wallet
      </h1>

      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
        <p className="text-lg">
          Available Balance
        </p>

        <h2 className="mt-2 text-5xl font-bold">
          ₦
          {balance.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
          })}
        </h2>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard/wallet/fund">
            <span className="inline-flex cursor-pointer rounded-lg bg-white px-6 py-3 font-semibold text-indigo-700 transition hover:bg-gray-100">
              Fund Wallet
            </span>
          </Link>

          <Link href="/dashboard/wallet/withdraw">
            <span className="inline-flex cursor-pointer rounded-lg border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20">
              Withdraw Money
            </span>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
        <h3 className="font-semibold text-yellow-800">
          Withdrawal Notice
        </h3>

        <p className="mt-1 text-sm text-yellow-700">
          Withdrawals are reviewed and processed by the administrator.
          Your wallet balance will be updated when the withdrawal is
          processed.
        </p>
      </div>
    </div>
  );
}

