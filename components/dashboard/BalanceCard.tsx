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
    <section className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-5 text-white shadow-[0_8px_30px_-12px_rgba(79,70,229,0.45)] sm:p-6">
      {/* DECORATIVE BACKGROUND */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-purple-300/10 blur-3xl" />

      {/* TOP ROW */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Wallet className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
              Wallet
            </p>

            <p className="text-sm font-semibold text-white">
              Available Balance
            </p>
          </div>
        </div>

        {/* WALLET ICON */}
        <div className="hidden rounded-full border border-white/10 bg-white/10 p-2.5 sm:flex">
          <Wallet className="h-5 w-5 text-white/80" />
        </div>
      </div>

      {/* BALANCE */}
      <div className="relative mt-6">
        <p className="text-[11px] font-medium text-white/65">Current balance</p>

        <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          ₦
          {balance.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h2>
      </div>

      {/* BOTTOM ROW */}
      <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="hidden text-xs text-white/65 sm:block">
          Fund your wallet to make purchases.
        </p>

        <Link
          href="/dashboard/wallet/fund"
          className="
            group ml-auto
            inline-flex items-center gap-2
            rounded-xl
            bg-white
            px-4 py-2.5
            text-xs font-bold
            text-indigo-700
            shadow-sm
            transition-all duration-200
            hover:-translate-y-0.5
            hover:bg-white/95
            hover:shadow-md
            active:scale-[0.97]
          "
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />

          <span>Fund Wallet</span>

          <ArrowUpRight
            className="
              h-3.5 w-3.5
              transition-transform duration-200
              group-hover:translate-x-0.5
              group-hover:-translate-y-0.5
            "
          />
        </Link>
      </div>
    </section>
  );
}
