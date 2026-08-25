"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";

export default function BalanceCard() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function loadBalance() {
      try {
        const res = await fetch("/api/wallet");
        const data = await res.json();

        if (data.walletBalance !== undefined) {
          setBalance(Number(data.walletBalance));
        }
      } catch (error) {
        console.error("Failed to load wallet balance:", error);
      }
    }

    loadBalance();
  }, []);

  return (
    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
      <div>
        <div className="flex items-center gap-2">
          <Wallet size={25} />

          <p className="text-lg">
            Wallet Balance
          </p>
        </div>

        <h2 className="mt-3 text-4xl font-bold">
          ₦{balance.toLocaleString()}
        </h2>

        <p className="mt-2 text-sm text-white/80">
          Fund your wallet to start making purchases.
        </p>

        <Link
          href="/dashboard/wallet/fund"
          className="mt-6 inline-block rounded-lg bg-white px-5 py-3 font-semibold text-indigo-700 transition hover:bg-gray-100"
        >
          Fund Wallet
        </Link>
      </div>

      <div className="rounded-full bg-white/20 p-4">
        <Wallet size={40} />
      </div>
    </div>
  );
}