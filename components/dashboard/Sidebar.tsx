
"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  History,
  User,
  LogOut,
  Wallet,
  LockKeyhole,
  X,
} from "lucide-react";
import { useState } from "react";

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({
  isOpen = false,
  onClose,
}: SidebarProps) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      await signOut({
        callbackUrl: "/login",
      });
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
      setLoading(false);
    }
  }

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-700 p-6 text-white transition-transform duration-300 lg:static lg:z-auto lg:block lg:translate-x-0 ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* HEADER */}
        <div className="flex items-center gap-3"/>
  <img
    src="/logo.png"
    alt="Brainfriend Tech"
    className="h-10 w-10 rounded-lg object-contain"
  />
        <div className="mb-10 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Brainfriend Tech
          </h2>

          {/* MOBILE CLOSE BUTTON */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-indigo-600 lg:hidden"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="space-y-2">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          <Link
            href="/dashboard/wallet"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <Wallet size={20} />
            Wallet
          </Link>

          <Link
            href="/dashboard/airtime"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <Smartphone size={20} />
            Airtime
          </Link>

          <Link
            href="/dashboard/data"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <Wifi size={20} />
            Data
          </Link>

          <Link
            href="/dashboard/electricity"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <Zap size={20} />
            Electricity
          </Link>

          <Link
            href="/dashboard/cable"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <Tv size={20} />
            Cable TV
          </Link>

          <Link
            href="/dashboard/exams"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <GraduationCap size={20} />
            Exam Pins
          </Link>

          <Link
            href="/dashboard/transactions"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <History size={20} />
            Transactions
          </Link>

          <Link
            href="/dashboard/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <User size={20} />
            Profile
          </Link>

          <Link
            href="/dashboard/profile/change-password"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-indigo-600"
          >
            <LockKeyhole size={20} />
            Change Password
          </Link>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="mt-8 flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={20} />

            {loading
              ? "Logging out..."
              : "Logout"}
          </button>
        </nav>
      </aside>
    </>
  );
}

