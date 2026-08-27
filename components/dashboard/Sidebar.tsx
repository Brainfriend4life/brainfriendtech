"use client";

import Link from "next/link";
import {
signOut,
useSession,
} from "next-auth/react";

import { useTheme } from "next-themes";

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
Shield,
KeyRound,
Fingerprint,
ChevronDown,
ChevronRight,
ReceiptText,
Settings,
CreditCard,
ShoppingBag,
SearchCheck,
Gift,
Sparkles,
Users,
Sun,
Moon,
} from "lucide-react";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

// ==============================
// THEME
// ==============================

const { resolvedTheme, setTheme } = useTheme();

const [mounted, setMounted] = useState(false);

useEffect(() => {
setMounted(true);
}, []);

const isDark =
mounted && resolvedTheme === "dark";

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
        ? "bg-white font-bold text-indigo-700 shadow-sm"
        : "font-semibold text-indigo-100 hover:bg-white/10 hover:text-white"
    }`}
  >
    {active && (
      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600" />
    )}

    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
        active
          ? "bg-indigo-100 text-indigo-700"
          : "bg-indigo-600/50 text-indigo-200 group-hover:bg-indigo-500 group-hover:text-white"
      }`}
    >
      {icon}
    </span>

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
    className="group flex w-full items-center justify-between rounded-lg px-2 py-2 transition hover:bg-white/5"
  >
    <span className="flex items-center gap-2.5">
      <span className="text-indigo-300 transition group-hover:text-white">
        {icon}
      </span>

      <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-300 group-hover:text-white">
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
{/* =========================================================
MOBILE OVERLAY
========================================================= */}


  {isOpen && (
    <button
      type="button"
      onClick={onClose}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
      aria-label="Close sidebar"
    />
  )}

  {/* =========================================================
      SIDEBAR
  ========================================================= */}

  <aside
    className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden border-r border-indigo-500/30 bg-gradient-to-b from-indigo-700 via-indigo-700 to-indigo-800 text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
      isOpen
        ? "translate-x-0"
        : "-translate-x-full"
    }`}
  >
    {/* =======================================================
        BRAND HEADER
    ======================================================= */}

    <div className="shrink-0 border-b border-white/10 px-5 py-5">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="group flex min-w-0 items-center gap-3"
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg transition-transform duration-200 group-hover:scale-105">
            <GraduationCap
              size={23}
              strokeWidth={2.5}
              className="text-indigo-700"
            />

            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-indigo-700 bg-emerald-400" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold tracking-tight text-white">
              Brainfriend
            </p>

            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-200">
              Global Tech
            </p>
          </div>
        </Link>

        {/* MOBILE CLOSE */}

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-indigo-200 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X
            size={20}
            strokeWidth={2.5}
          />
        </button>
      </div>

      {/* =====================================================
          USER STATUS
      ===================================================== */}

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/15">
          <Sparkles
            size={14}
            className="text-emerald-300"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
            Account
          </p>

          <p className="truncate text-xs font-semibold text-white">
            {session?.user?.email ||
              "Welcome back"}
          </p>
        </div>

        <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
      </div>

      {/* =====================================================
          THEME TOGGLE
      ===================================================== */}

      <button
        type="button"
        onClick={() =>
          setTheme(
            isDark ? "light" : "dark"
          )
        }
        disabled={!mounted}
        aria-label="Toggle dark mode"
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition hover:bg-white/10 disabled:opacity-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-indigo-200">
            {isDark ? (
              <Sun
                size={16}
                strokeWidth={2.5}
              />
            ) : (
              <Moon
                size={16}
                strokeWidth={2.5}
              />
            )}
          </span>

          <span className="text-xs font-bold text-white">
            {isDark
              ? "Light Mode"
              : "Dark Mode"}
          </span>
        </span>

        <span
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            isDark
              ? "bg-emerald-400"
              : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              isDark
                ? "translate-x-4"
                : "translate-x-0.5"
            }`}
          />
        </span>
      </button>
    </div>

    {/* =======================================================
        NAVIGATION
    ======================================================= */}

    <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-indigo-500">
      {/* =====================================================
          OVERVIEW
      ===================================================== */}

      <div className="mb-6">
        <div className="mb-2 px-2">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-300">
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

          {navItem(
            "/dashboard/referral",
            "Referral & Rewards",
            <Gift
              size={17}
              strokeWidth={2.5}
            />
          )}
        </div>
      </div>

      {/* =====================================================
          VTU SERVICES
      ===================================================== */}

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

      {/* =====================================================
          EDUCATION
      ===================================================== */}

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

      {/* =====================================================
          VERIFICATION
      ===================================================== */}

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

      {/* =====================================================
          ACCOUNT
      ===================================================== */}

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
              "/dashboard/purchases",
              "Purchases History",
              <ShoppingBag
                size={17}
                strokeWidth={2.5}
              />
            )}

            {navItem(
              "/dashboard/transaction-status",
              "Transaction Status",
              <SearchCheck
                size={17}
                strokeWidth={2.5}
              />
            )}

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

            {navItem(
              "/dashboard/security",
              "Security Settings",
              <Shield
                size={17}
                strokeWidth={2.5}
              />
            )}

            {navItem(
              "/dashboard/security/transaction-pin",
              "Transaction PIN",
              <KeyRound
                size={17}
                strokeWidth={2.5}
              />
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          REFERRAL PROMO
      ===================================================== */}

      <div className="mt-6 px-1">
        <Link
          href="/dashboard/referral"
          onClick={onClose}
          className="group block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/70 to-purple-600/70 p-4 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Users
                size={19}
                className="text-white"
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white">
                Earn with referral
              </p>

              <p className="mt-1 text-[11px] leading-4 text-indigo-100">
                Invite friends and earn rewards
                from their transactions.
              </p>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-white">
                View referral dashboard

                <ChevronRight
                  size={13}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* =====================================================
          ADMINISTRATION
      ===================================================== */}

      {session?.user?.role === "ADMIN" && (
        <div className="mt-7 border-t border-white/10 pt-5">
          <div className="mb-2 px-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-300">
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

    {/* =======================================================
        FOOTER
    ======================================================= */}

    <div className="shrink-0 border-t border-white/10 bg-indigo-800/60 p-3">
      {/* SECURITY STATUS */}

      <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10">
          <ShieldCheck
            size={16}
            className="text-emerald-300"
          />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-white">
            Account secured
          </p>

          <p className="text-[10px] text-indigo-300">
            Your session is protected
          </p>
        </div>
      </div>

      {/* LOGOUT */}

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-indigo-100 transition-all duration-200 hover:bg-red-500/90 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 transition group-hover:bg-red-400">
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
