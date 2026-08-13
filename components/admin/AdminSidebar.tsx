"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
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
  ChevronDown,
  Settings,
  Activity,
  ShoppingBag,
  Fingerprint,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const overviewItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
  },
  {
    label: "Transactions",
    href: "/dashboard/admin/transactions",
    icon: ReceiptText,
  },
];

const managementItems: NavItem[] = [
  {
    label: "Purchases History",
    href: "/dashboard/admin/purchases",
    icon: ShoppingBag,
  },
  {
    label: "NIN Verifications",
    href: "/dashboard/admin/nin",
    icon: Fingerprint,
  },
];

const educationItems: NavItem[] = [
  {
    label: "CBT Management",
    href: "/dashboard/admin/cbt",
    icon: GraduationCap,
  },
  {
    label: "CBT Results",
    href: "/dashboard/admin/results",
    icon: Trophy,
  },
];

const financeItems: NavItem[] = [
  {
    label: "Provider Wallet",
    href: "/dashboard/admin/provider-wallet",
    icon: Wallet,
  },
  {
    label: "Wallet Activity",
    href: "/dashboard/admin/wallet",
    icon: Activity,
  },
  {
    label: "Revenue & Profit",
    href: "/dashboard/admin/revenue",
    icon: TrendingUp,
  },
  {
    label: "Withdraw Revenue",
    href: "/dashboard/admin/revenue/withdraw",
    icon: ArrowDownToLine,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [managementOpen, setManagementOpen] = useState(
    pathname.startsWith("/dashboard/admin/purchases") ||
      pathname.startsWith("/dashboard/admin/nin")
  );

  const [educationOpen, setEducationOpen] = useState(
    pathname.startsWith("/dashboard/admin/cbt") ||
      pathname.startsWith("/dashboard/admin/results")
  );

  const [financeOpen, setFinanceOpen] = useState(
    pathname.startsWith("/dashboard/admin/revenue") ||
      pathname.startsWith("/dashboard/admin/wallet") ||
      pathname.startsWith("/dashboard/admin/provider-wallet")
  );

  function closeSidebar() {
    setIsOpen(false);
  }

  function isActive(href: string) {
    if (href === "/dashboard/admin") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  }

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

  function renderItem(item: NavItem) {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
          active
            ? "bg-white text-indigo-700 shadow-md"
            : "text-indigo-100 hover:bg-indigo-600 hover:text-white"
        }`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${
            active
              ? "text-indigo-700"
              : "text-indigo-200 group-hover:text-white"
          }`}
        />

        <span>{item.label}</span>

        {active && (
          <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
        )}
      </Link>
    );
  }

  return (
    <>
      {/* =====================================================
          MOBILE MENU BUTTON
      ===================================================== */}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-700 text-white shadow-lg transition hover:bg-indigo-800 lg:hidden"
        aria-label="Open admin menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {isOpen && (
        <button
          type="button"
          aria-label="Close admin menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-indigo-700 text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex h-20 shrink-0 items-center justify-between border-b border-indigo-600 px-5">
          <Link
            href="/dashboard/admin"
            onClick={closeSidebar}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-base font-bold">
                Brainfriend Tech
              </h1>

              <p className="text-xs text-indigo-200">
                Admin Panel
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-lg p-2 text-indigo-100 transition hover:bg-indigo-600 hover:text-white lg:hidden"
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =====================================================
            NAVIGATION
        ===================================================== */}

        <div className="flex-1 overflow-y-auto px-4 py-5">

          {/* =================================================
              OVERVIEW
          ================================================= */}

          <div>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              Overview
            </p>

            <nav className="space-y-1">
              {overviewItems.map(renderItem)}
            </nav>
          </div>

          {/* =================================================
              MANAGEMENT
          ================================================= */}

          <div className="mt-7">
            <button
              type="button"
              onClick={() =>
                setManagementOpen(!managementOpen)
              }
              className="mb-2 flex w-full items-center justify-between px-3 text-left text-[11px] font-bold uppercase tracking-wider text-indigo-300 transition hover:text-white"
            >
              <span>Management</span>

              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  managementOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {managementOpen && (
              <nav className="space-y-1">
                {managementItems.map(renderItem)}
              </nav>
            )}
          </div>

          {/* =================================================
              EDUCATION
          ================================================= */}

          <div className="mt-7">
            <button
              type="button"
              onClick={() =>
                setEducationOpen(!educationOpen)
              }
              className="mb-2 flex w-full items-center justify-between px-3 text-left text-[11px] font-bold uppercase tracking-wider text-indigo-300 transition hover:text-white"
            >
              <span>Education</span>

              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  educationOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {educationOpen && (
              <nav className="space-y-1">
                {educationItems.map(renderItem)}
              </nav>
            )}
          </div>

          {/* =================================================
              FINANCE
          ================================================= */}

          <div className="mt-7">
            <button
              type="button"
              onClick={() =>
                setFinanceOpen(!financeOpen)
              }
              className="mb-2 flex w-full items-center justify-between px-3 text-left text-[11px] font-bold uppercase tracking-wider text-indigo-300 transition hover:text-white"
            >
              <span>Finance</span>

              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  financeOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {financeOpen && (
              <nav className="space-y-1">
                {financeItems.map(renderItem)}
              </nav>
            )}
          </div>

          {/* =================================================
              SYSTEM
          ================================================= */}

          <div className="mt-7">
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              System
            </p>

            <Link
              href="/dashboard/admin/settings"
              onClick={closeSidebar}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                isActive("/dashboard/admin/settings")
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-indigo-100 hover:bg-indigo-600 hover:text-white"
              }`}
            >
              <Settings className="h-5 w-5 shrink-0" />

              <span>Settings</span>

              {isActive("/dashboard/admin/settings") && (
                <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
              )}
            </Link>
          </div>
        </div>

        {/* =====================================================
            ADMIN PROFILE / LOGOUT
        ===================================================== */}

        <div className="shrink-0 border-t border-indigo-600 p-4">

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-indigo-600/50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                Administrator
              </p>

              <p className="text-xs text-indigo-200">
                Full Access
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-indigo-100 transition-all hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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