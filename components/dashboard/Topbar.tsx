"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Bell,
  Menu,
  User,
  Wallet,
  KeyRound,
  LogOut,
  Inbox,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

type TopbarProps = {
  onMenuClick: () => void;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  read: boolean;
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();

  const [notifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((item) => !item.read).length;

  // ============================================================
  // CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ============================================================
  // USER INFORMATION
  // ============================================================

  const userName = session?.user?.name || "There";

  const userRole = session?.user?.role || "Customer";

  const initials = (session?.user?.name || "User")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        {/* ======================================================
            LEFT SIDE
        ====================================================== */}

        <div className="flex min-w-0 items-center gap-3">
          {/* MOBILE MENU */}

          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-all hover:bg-muted active:scale-95 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>

          {/* PAGE TITLE */}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                Dashboard
              </h2>

              <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 sm:inline-flex sm:items-center sm:gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </div>

            <p className="mt-0.5 hidden truncate text-sm text-muted-foreground sm:block">
              Welcome back, {userName} 👋
            </p>
          </div>
        </div>

        {/* ======================================================
            RIGHT SIDE
        ====================================================== */}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* ====================================================
              NOTIFICATIONS
          ==================================================== */}

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setProfileOpen(false);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-all hover:bg-muted active:scale-95 sm:h-11 sm:w-11"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell size={19} className="sm:h-5 sm:w-5" />

              {unreadCount > 0 && (
                <>
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />

                  <span className="sr-only">
                    {unreadCount} unread notifications
                  </span>
                </>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN */}

            {notificationsOpen && (
              <div className="absolute right-0 z-50 mt-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10">
                {/* HEADER */}

                <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                  <div>
                    <p className="font-semibold text-card-foreground">
                      Notifications
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Your latest updates
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {/* CONTENT */}

                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center px-5 py-10 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                      <Inbox size={22} className="text-muted-foreground" />
                    </div>

                    <p className="text-sm font-semibold text-card-foreground">
                      No notifications yet
                    </p>

                    <p className="mt-1.5 max-w-xs text-xs leading-5 text-muted-foreground">
                      We&apos;ll notify you when there is something important to
                      see.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                    {notifications.map((item) => (
                      <li
                        key={item.id}
                        className={`px-4 py-3.5 transition-colors hover:bg-muted/40 ${
                          !item.read
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                            : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />

                          <div>
                            <p className="text-sm font-semibold text-card-foreground">
                              {item.title}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {item.message}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* ====================================================
              PROFILE MENU
          ==================================================== */}

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((open) => !open);
                setNotificationsOpen(false);
              }}
              className="group flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 pr-2 transition-all hover:bg-muted active:scale-[0.98] sm:gap-3 sm:pr-3"
              aria-label="Account menu"
              aria-expanded={profileOpen}
            >
              {/* AVATAR */}

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white shadow-sm sm:h-10 sm:w-10">
                {initials}
              </div>

              {/* USER INFO */}

              <div className="hidden min-w-0 text-left sm:block">
                <p className="max-w-[130px] truncate text-sm font-semibold text-foreground">
                  {userName}
                </p>

                <p className="max-w-[130px] truncate text-xs capitalize text-muted-foreground">
                  {userRole}
                </p>
              </div>

              <ChevronDown
                size={16}
                className={`hidden text-muted-foreground transition-transform sm:block ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* PROFILE DROPDOWN */}

            {profileOpen && (
              <div className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10">
                {/* PROFILE HEADER */}

                <div className="border-b border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-card-foreground">
                        {userName}
                      </p>

                      <div className="mt-1 flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-emerald-500" />

                        <p className="text-xs capitalize text-muted-foreground">
                          {userRole}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MENU ITEMS */}

                <div className="p-2">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                      <User size={17} />
                    </span>

                    <div>
                      <p>My Profile</p>
                      <p className="text-xs font-normal text-muted-foreground">
                        View account details
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/wallet"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Wallet size={17} />
                    </span>

                    <div>
                      <p>Wallet</p>
                      <p className="text-xs font-normal text-muted-foreground">
                        Manage your wallet
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/profile/change-password"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <KeyRound size={17} />
                    </span>

                    <div>
                      <p>Change Password</p>
                      <p className="text-xs font-normal text-muted-foreground">
                        Update your password
                      </p>
                    </div>
                  </Link>
                </div>

                {/* LOGOUT */}

                <div className="border-t border-border p-2">
                  <button
                    type="button"
                    onClick={() =>
                      signOut({
                        callbackUrl: "/login",
                      })
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                      <LogOut size={17} />
                    </span>

                    <div>
                      <p>Log Out</p>
                      <p className="text-xs font-normal text-red-500/70 dark:text-red-400/70">
                        Sign out of your account
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
