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
  Percent,
  Gift,
  UserPlus,
  Banknote,
  CircleDollarSign,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

/* =========================================================
   OVERVIEW
========================================================= */

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

/* =========================================================
   MANAGEMENT
========================================================= */

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

/* =========================================================
   EDUCATION
========================================================= */

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

/* =========================================================
   REFERRAL SYSTEM
   SINGULAR ROUTE
========================================================= */

const referralItems: NavItem[] = [
  {
    label: "Referral Overview",
    href: "/dashboard/admin/referral",
    icon: Gift,
  },
  {
    label: "Referral Users",
    href: "/dashboard/admin/referral/users",
    icon: UserPlus,
  },
  {
    label: "Referral Earnings",
    href: "/dashboard/admin/referral/earnings",
    icon: CircleDollarSign,
  },
  {
    label: "Referral Withdrawals",
    href: "/dashboard/admin/referral/withdrawals",
    icon: Banknote,
  },
  {
    label: "Referral Settings",
    href: "/dashboard/admin/referral/settings",
    icon: SlidersHorizontal,
  },
];

/* =========================================================
   FINANCE
========================================================= */

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

/* =========================================================
   SYSTEM
========================================================= */

const systemItems: NavItem[] = [
  {
    label: "Settings",
    href: "/dashboard/admin/settings",
    icon: Settings,
  },
  {
    label: "Service Fees",
    href: "/dashboard/admin/service-fees",
    icon: Percent,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  /* =======================================================
     GROUP STATES
  ======================================================= */

  const [managementOpen, setManagementOpen] = useState(
    pathname.startsWith("/dashboard/admin/purchases") ||
      pathname.startsWith("/dashboard/admin/nin")
  );

  const [educationOpen, setEducationOpen] = useState(
    pathname.startsWith("/dashboard/admin/cbt") ||
      pathname.startsWith("/dashboard/admin/results")
  );

  const [referralOpen, setReferralOpen] = useState(
    pathname === "/dashboard/admin/referral" ||
      pathname.startsWith("/dashboard/admin/referral/")
  );

  const [financeOpen, setFinanceOpen] = useState(
    pathname.startsWith("/dashboard/admin/revenue") ||
      pathname.startsWith("/dashboard/admin/wallet") ||
      pathname.startsWith("/dashboard/admin/provider-wallet")
  );

  const [systemOpen, setSystemOpen] = useState(
    pathname.startsWith("/dashboard/admin/settings") ||
      pathname.startsWith("/dashboard/admin/service-fees")
  );

  /* =======================================================
     CLOSE MOBILE SIDEBAR
  ======================================================= */

  function closeSidebar() {
    setIsOpen(false);
  }

  /* =======================================================
     ACTIVE ROUTE
  ======================================================= */

  function isActive(href: string) {
    if (href === "/dashboard/admin") {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

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

  /* =======================================================
     NAVIGATION ITEM
  ======================================================= */

  function renderItem(item: NavItem) {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
          active
            ? "bg-white text-indigo-700 shadow-sm"
            : "text-indigo-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        {/* ACTIVE INDICATOR */}

        {active && (
          <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600" />
        )}

        {/* ICON */}

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
            active
              ? "bg-indigo-100 text-indigo-700"
              : "bg-indigo-600/60 text-indigo-200 group-hover:bg-indigo-500 group-hover:text-white"
          }`}
        >
          <Icon
            className="h-[17px] w-[17px]"
            strokeWidth={2.4}
          />
        </span>

        {/* LABEL */}

        <span className="min-w-0 flex-1 truncate">
          {item.label}
        </span>

        {/* ACTIVE DOT */}

        {active && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
        )}
      </Link>
    );
  }

  /* =======================================================
     GROUP BUTTON
  ======================================================= */

  function renderGroupButton(
    label: string,
    open: boolean,
    setOpen: React.Dispatch<
      React.SetStateAction<boolean>
    >,
    icon: React.ElementType
  ) {
    const Icon = icon;

    return (
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        className="group mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-white/5"
      >
        <span className="flex items-center gap-2.5">
          <Icon
            className="h-4 w-4 text-indigo-300 transition group-hover:text-white"
            strokeWidth={2.4}
          />

          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300 transition group-hover:text-white">
            {label}
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 text-indigo-300 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
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
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-600 bg-indigo-700 text-white shadow-lg transition hover:bg-indigo-800 lg:hidden"
        aria-label="Open admin menu"
      >
        <Menu
          className="h-5 w-5"
          strokeWidth={2.5}
        />
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-indigo-600 bg-indigo-700 text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="shrink-0 border-b border-indigo-600 px-5 py-5">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/admin"
              onClick={closeSidebar}
              className="group flex min-w-0 items-center gap-3"
            >
              {/* LOGO */}

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-md transition group-hover:scale-105">
                <ShieldCheck
                  className="h-6 w-6"
                  strokeWidth={2.5}
                />
              </div>

              {/* BRAND */}

              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-extrabold tracking-tight text-white">
                  Brainfriend Global Tech
                </h1>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
                    Administration
                  </p>
                </div>
              </div>
            </Link>

            {/* MOBILE CLOSE */}

            <button
              type="button"
              onClick={closeSidebar}
              className="rounded-lg p-2 text-indigo-200 transition hover:bg-indigo-600 hover:text-white lg:hidden"
              aria-label="Close admin menu"
            >
              <X
                className="h-5 w-5"
                strokeWidth={2.5}
              />
            </button>
          </div>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {/* =================================================
              OVERVIEW
          ================================================= */}

          <section>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">
              Overview
            </p>

            <nav className="space-y-1">
              {overviewItems.map(renderItem)}
            </nav>
          </section>

          {/* =================================================
              MANAGEMENT
          ================================================= */}

          <section className="mt-6">
            {renderGroupButton(
              "Management",
              managementOpen,
              setManagementOpen,
              ShoppingBag
            )}

            {managementOpen && (
              <nav className="space-y-1">
                {managementItems.map(renderItem)}
              </nav>
            )}
          </section>

          {/* =================================================
              EDUCATION
          ================================================= */}

          <section className="mt-6">
            {renderGroupButton(
              "Education",
              educationOpen,
              setEducationOpen,
              GraduationCap
            )}

            {educationOpen && (
              <nav className="space-y-1">
                {educationItems.map(renderItem)}
              </nav>
            )}
          </section>

          {/* =================================================
              REFERRAL SYSTEM
          ================================================= */}

          <section className="mt-6">
            {renderGroupButton(
              "Referral System",
              referralOpen,
              setReferralOpen,
              Gift
            )}

            {referralOpen && (
              <nav className="space-y-1">
                {referralItems.map(renderItem)}
              </nav>
            )}
          </section>

          {/* =================================================
              FINANCE
          ================================================= */}

          <section className="mt-6">
            {renderGroupButton(
              "Finance",
              financeOpen,
              setFinanceOpen,
              Wallet
            )}

            {financeOpen && (
              <nav className="space-y-1">
                {financeItems.map(renderItem)}
              </nav>
            )}
          </section>

          {/* =================================================
              SYSTEM
          ================================================= */}

          <section className="mt-6 pb-4">
            {renderGroupButton(
              "System",
              systemOpen,
              setSystemOpen,
              Settings
            )}

            {systemOpen && (
              <nav className="space-y-1">
                {systemItems.map(renderItem)}
              </nav>
            )}
          </section>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="shrink-0 border-t border-indigo-600 p-4">
          {/* ADMIN PROFILE */}

          <div className="mb-3 flex items-center gap-3 rounded-xl border border-indigo-500/50 bg-indigo-600/50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm">
              <ShieldCheck
                className="h-5 w-5"
                strokeWidth={2.5}
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                Administrator
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <p className="text-[10px] font-medium text-indigo-200">
                  Full Access
                </p>
              </div>
            </div>
          </div>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-indigo-100 transition-all duration-200 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/60 transition group-hover:bg-red-500">
              <LogOut
                className="h-[17px] w-[17px]"
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