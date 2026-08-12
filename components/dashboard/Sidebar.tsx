"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  User,
  LogOut,
  Wallet,
  LockKeyhole,
  X,
  BookOpen,
  ShieldCheck,
  Fingerprint,
  ChevronDown,
  ChevronRight,
  ReceiptText,
  Settings,
  CreditCard,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);

  const [openGroups, setOpenGroups] = useState({
    services: true,
    education: true,
    verification: true,
    account: true,
  });

  function toggleGroup(
    group: keyof typeof openGroups
  ) {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }

  function isActive(path: string) {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === path ||
      pathname.startsWith(`${path}/`)
    );
  }

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

  function navItem(
    href: string,
    label: string,
    icon: React.ReactNode
  ) {
    const active = isActive(href);

    return (
      <Link
        href={href}
        onClick={onClose}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
          active
            ? "bg-white font-bold text-indigo-700 shadow-md"
            : "font-semibold text-indigo-100 hover:bg-indigo-600 hover:text-white"
        }`}
      >
        {/* ACTIVE INDICATOR */}

        {active && (
          <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-indigo-700" />
        )}

        {/* ICON */}

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
            active
              ? "bg-indigo-100 text-indigo-700"
              : "bg-indigo-600/60 text-indigo-200 group-hover:bg-indigo-500 group-hover:text-white"
          }`}
        >
          {icon}
        </span>

        {/* LABEL */}

        <span className="truncate">
          {label}
        </span>
      </Link>
    );
  }

  function groupButton(
    label: string,
    group: keyof typeof openGroups,
    icon: React.ReactNode
  ) {
    const open = openGroups[group];

    return (
      <button
        type="button"
        onClick={() => toggleGroup(group)}
        className="group flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-indigo-600/50"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-indigo-300 transition group-hover:text-white">
            {icon}
          </span>

          <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-indigo-300 group-hover:text-white">
            {label}
          </span>
        </span>

        {open ? (
          <ChevronDown className="h-4 w-4 text-indigo-300" />
        ) : (
          <ChevronRight className="h-4 w-4 text-indigo-300" />
        )}
      </button>
    );
  }

  return (
    <>
      {/* ================================================== */}
      {/* MOBILE OVERLAY */}
      {/* ================================================== */}

      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          aria-label="Close sidebar"
        />
      )}

      {/* ================================================== */}
      {/* SIDEBAR */}
      {/* ================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-indigo-600 bg-indigo-700 text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* ================================================== */}
        {/* BRAND HEADER */}
        {/* ================================================== */}

        <div className="shrink-0 border-b border-indigo-600 px-5 py-5">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md">
                <GraduationCap
                  size={23}
                  strokeWidth={2.5}
                  className="text-indigo-700"
                />
              </div>

              <div>
                <p className="text-[16px] font-extrabold tracking-tight text-white">
                  Brainfriend Tech
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <p className="text-[11px] font-semibold text-indigo-200">
                    User Dashboard
                  </p>
                </div>
              </div>
            </Link>

            {/* MOBILE CLOSE */}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-indigo-200 transition hover:bg-indigo-600 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X
                size={20}
                strokeWidth={2.5}
              />
            </button>
          </div>
        </div>

        {/* ================================================== */}
        {/* NAVIGATION */}
        {/* ================================================== */}

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {/* ================================================== */}
          {/* OVERVIEW */}
          {/* ================================================== */}

          <div className="mb-6">
            <div className="mb-2 px-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-indigo-300">
                Overview
              </span>
            </div>

            <div className="space-y-1">
              {navItem(
                "/dashboard",
                "Dashboard",
                <LayoutDashboard
                  size={17}
                  strokeWidth={2.5}
                />
              )}

              {navItem(
                "/dashboard/wallet",
                "Wallet",
                <Wallet
                  size={17}
                  strokeWidth={2.5}
                />
              )}
            </div>
          </div>

          {/* ================================================== */}
          {/* VTU SERVICES */}
          {/* ================================================== */}

          <div className="mb-4">
            {groupButton(
              "VTU Services",
              "services",
              <CreditCard
                size={14}
                strokeWidth={2.5}
              />
            )}

            {openGroups.services && (
              <div className="mt-1 space-y-1 pl-1">
                {navItem(
                  "/dashboard/airtime",
                  "Airtime",
                  <Smartphone
                    size={17}
                    strokeWidth={2.5}
                  />
                )}

                {navItem(
                  "/dashboard/data",
                  "Data",
                  <Wifi
                    size={17}
                    strokeWidth={2.5}
                  />
                )}

                {navItem(
                  "/dashboard/electricity",
                  "Electricity",
                  <Zap
                    size={17}
                    strokeWidth={2.5}
                  />
                )}

                {navItem(
                  "/dashboard/cable",
                  "Cable TV",
                  <Tv
                    size={17}
                    strokeWidth={2.5}
                  />
                )}
              </div>
            )}
          </div>

          {/* ================================================== */}
          {/* EDUCATION */}
          {/* ================================================== */}

          <div className="mb-4">
            {groupButton(
              "Education",
              "education",
              <BookOpen
                size={14}
                strokeWidth={2.5}
              />
            )}

            {openGroups.education && (
              <div className="mt-1 space-y-1 pl-1">
                {navItem(
                  "/dashboard/education",
                  "Education / CBT",
                  <BookOpen
                    size={17}
                    strokeWidth={2.5}
                  />
                )}

                {navItem(
                  "/dashboard/exams",
                  "Exam Pins",
                  <GraduationCap
                    size={17}
                    strokeWidth={2.5}
                  />
                )}
              </div>
            )}
          </div>

          {/* ================================================== */}
          {/* VERIFICATION */}
          {/* ================================================== */}

          <div className="mb-4">
            {groupButton(
              "Verification",
              "verification",
              <Fingerprint
                size={14}
                strokeWidth={2.5}
              />
            )}

            {openGroups.verification && (
              <div className="mt-1 space-y-1 pl-1">
                {navItem(
                  "/dashboard/nin",
                  "NIN Verification",
                  <Fingerprint
                    size={17}
                    strokeWidth={2.5}
                  />
                )}
              </div>
            )}
          </div>

          {/* ================================================== */}
          {/* ACCOUNT */}
          {/* ================================================== */}

          <div className="mb-4">
            {groupButton(
              "Account",
              "account",
              <Settings
                size={14}
                strokeWidth={2.5}
              />
            )}

            {openGroups.account && (
              <div className="mt-1 space-y-1 pl-1">
                {navItem(
                  "/dashboard/transactions",
                  "Transactions",
                  <ReceiptText
                    size={17}
                    strokeWidth={2.5}
                  />
                )}

                {navItem(
                  "/dashboard/profile",
                  "Profile",
                  <User
                    size={17}
                    strokeWidth={2.5}
                  />
                )}

                {navItem(
                  "/dashboard/profile/change-password",
                  "Change Password",
                  <LockKeyhole
                    size={17}
                    strokeWidth={2.5}
                  />
                )}
              </div>
            )}
          </div>

          {/* ================================================== */}
          {/* ADMINISTRATION */}
          {/* ================================================== */}

          {session?.user?.role === "ADMIN" && (
            <div className="mt-6 border-t border-indigo-600 pt-5">
              <div className="mb-2 px-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-indigo-300">
                  Administration
                </span>
              </div>

              {navItem(
                "/dashboard/admin",
                "Admin Panel",
                <ShieldCheck
                  size={17}
                  strokeWidth={2.5}
                />
              )}
            </div>
          )}
        </nav>

        {/* ================================================== */}
        {/* ACCOUNT FOOTER */}
        {/* ================================================== */}

        <div className="shrink-0 border-t border-indigo-600 p-3">
          {/* USER INFO */}

          <div className="mb-2 rounded-xl border border-indigo-500/50 bg-indigo-600/50 px-3 py-2.5">
            <p className="truncate text-xs font-bold text-white">
              {session?.user?.email || "Account"}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <p className="text-[10px] font-medium text-indigo-200">
                Account secured
              </p>
            </div>
          </div>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-indigo-100 transition-all duration-200 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/60 transition group-hover:bg-red-500">
              <LogOut
                size={17}
                strokeWidth={2.5}
              />
            </span>

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