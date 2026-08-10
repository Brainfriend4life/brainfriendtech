"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  GraduationCap,
  Trophy,
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      await signOut({
        callbackUrl: "/login",
      });
    } catch (error) {
      console.error("ADMIN LOGOUT ERROR:", error);
      setLoading(false);
    }
  }

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* MOBILE MENU BUTTON */}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-indigo-700 p-3 text-white shadow-lg lg:hidden"
        aria-label="Open admin menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* MOBILE OVERLAY */}

      {isOpen && (
        <button
          type="button"
          aria-label="Close admin menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-indigo-700 p-5 text-white shadow-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* HEADER */}

        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/dashboard/admin"
            onClick={closeSidebar}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-700">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-lg font-bold">
                Brainfriend Tech
              </h1>

              <p className="text-xs text-indigo-200">
                Admin Panel
              </p>
            </div>
          </Link>

          {/* MOBILE CLOSE */}

          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-lg p-2 hover:bg-indigo-600 lg:hidden"
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 space-y-2">
          {/* OVERVIEW */}

          <Link
            href="/dashboard/admin"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-indigo-600"
          >
            <LayoutDashboard className="h-5 w-5" />

            <span>Overview</span>
          </Link>

          {/* USERS */}

          <Link
            href="/dashboard/admin/users"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-indigo-600"
          >
            <Users className="h-5 w-5" />

            <span>Users</span>
          </Link>

          {/* TRANSACTIONS */}

          <Link
            href="/dashboard/admin/transactions"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-indigo-600"
          >
            <ReceiptText className="h-5 w-5" />

            <span>Transactions</span>
          </Link>

          {/* CBT */}

          <Link
            href="/dashboard/admin/cbt"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-indigo-600"
          >
            <GraduationCap className="h-5 w-5" />

            <span>CBT Management</span>
          </Link>

          {/* RESULTS */}

          <Link
            href="/dashboard/admin/results"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-indigo-600"
          >
            <Trophy className="h-5 w-5" />

            <span>CBT Results</span>
          </Link>

          {/* WALLET */}

          <Link
            href="/dashboard/admin/wallet"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-indigo-600"
          >
            <Wallet className="h-5 w-5" />

            <span>Wallet Activity</span>
          </Link>

          {/* REVENUE & PROFIT */}

          <Link
            href="/dashboard/admin/revenue"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-indigo-600"
          >
            <TrendingUp className="h-5 w-5" />

            <span>Revenue & Profit</span>
          </Link>

          {/* WITHDRAW REVENUE */}

          <Link
            href="/dashboard/admin/revenue/withdraw"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-indigo-600"
          >
            <ArrowDownToLine className="h-5 w-5" />

            <span>Withdraw Revenue</span>
          </Link>
        </nav>

        {/* BOTTOM */}

        <div className="border-t border-indigo-500 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" />

            <span>
              {loading
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}