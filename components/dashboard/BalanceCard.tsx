"use client";

import Link from "next/link";
import { Wallet, ArrowUpRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function BalanceCard() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function loadBalance() {
      try {
        const res = await fetch("/api/wallet", {
          cache: "no-store",
        });

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
    <section className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-4 text-white shadow-[0_6px_20px_-10px_rgba(79,70,229,0.4)] sm:p-5">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-28 w-28 rounded-full bg-purple-300/10 blur-2xl" />

      {/* Top row */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Wallet className="h-4 w-4" />
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">
              Wallet
            </p>
            <p className="text-xs font-semibold text-white">
              Available Balance
            </p>
          </div>
        </div>

        <Wallet className="h-5 w-5 text-white/50" />
      </div>

      {/* Balance */}
      <div className="relative mt-4">
        <p className="text-[10px] font-medium text-white/65">Current balance</p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          ₦
          {balance.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h2>
      </div>

      {/* Bottom row */}
      <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
        <p className="hidden text-[11px] text-white/65 sm:block">
          Fund your wallet to make purchases.
        </p>

        <Link
          href="/dashboard/wallet/fund"
          className="group ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/95 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>Fund Wallet</span>
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </section>
  );
}
