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
} from "lucide-react";

type TopbarProps = {
  onMenuClick: () => void;
};

// ============================================================
// NOTIFICATIONS
//
// No notifications API/table exists in the project yet, so this
// starts as an empty array with a proper empty state rather than
// faking data. Once a real endpoint exists, fetch into this state
// instead (e.g. in a useEffect on mount) and the dropdown UI below
// will work as-is.
// ============================================================

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  read: boolean;
};

export default function Topbar({
  onMenuClick,
}: TopbarProps) {
  const { data: session } = useSession();

  const [notifications] = useState<
    NotificationItem[]
  >([]);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const notificationsRef =
    useRef<HTMLDivElement>(null);

  const profileRef =
    useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  // ==========================================================
  // CLOSE DROPDOWNS ON OUTSIDE CLICK
  // ==========================================================

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(
          event.target as Node
        )
      ) {
        setNotificationsOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target as Node
        )
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  // ==========================================================
  // USER INFO
  // ==========================================================

  const userName =
    session?.user?.name || "there";

  const userRole =
    session?.user?.role || "Customer";

  const initials = (session?.user?.name || "U")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      {/* LEFT SIDE */}

      <div className="flex items-center gap-3">
        {/* Mobile Menu */}

        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-accent lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            Dashboard
          </h2>

          <p className="hidden text-muted-foreground sm:block">
            Welcome back, {userName} 👋
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}

      <div className="flex items-center gap-3 sm:gap-5">
        {/* NOTIFICATIONS */}

        <div
          ref={notificationsRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
            className="relative rounded-full bg-muted p-2.5 hover:bg-accent sm:p-3"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell
              size={20}
              className="text-foreground sm:h-[22px] sm:w-[22px]"
            />

            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white sm:right-2 sm:top-2">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <div className="border-b border-border px-4 py-3">
                <p className="font-semibold text-card-foreground">
                  Notifications
                </p>
              </div>

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Inbox
                    size={28}
                    className="text-muted-foreground"
                  />

                  <p className="text-sm font-medium text-card-foreground">
                    No notifications yet
                  </p>

                  <p className="text-xs text-muted-foreground">
                    We'll let you know when
                    something needs your attention.
                  </p>
                </div>
              ) : (
                <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                  {notifications.map((item) => (
                    <li
                      key={item.id}
                      className={`px-4 py-3 ${
                        item.read
                          ? ""
                          : "bg-indigo-50 dark:bg-indigo-950/30"
                      }`}
                    >
                      <p className="text-sm font-semibold text-card-foreground">
                        {item.title}
                      </p>

                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* PROFILE */}

        <div
          ref={profileRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 rounded-full sm:gap-3 sm:rounded-xl sm:px-2 sm:py-1.5 sm:hover:bg-accent"
            aria-label="Account menu"
            aria-expanded={profileOpen}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white sm:h-11 sm:w-11 sm:text-lg">
              {initials}
            </div>

            <div className="hidden sm:block sm:text-left">
              <p className="font-semibold text-foreground">
                {userName}
              </p>

              <p className="text-sm text-muted-foreground">
                {userRole}
              </p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card py-2 shadow-lg">
              <div className="border-b border-border px-4 pb-3 sm:hidden">
                <p className="font-semibold text-card-foreground">
                  {userName}
                </p>

                <p className="text-sm text-muted-foreground">
                  {userRole}
                </p>
              </div>

              <Link
                href="/dashboard/profile"
                onClick={() =>
                  setProfileOpen(false)
                }
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-accent"
              >
                <User size={17} />
                My Profile
              </Link>

              <Link
                href="/dashboard/wallet"
                onClick={() =>
                  setProfileOpen(false)
                }
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-accent"
              >
                <Wallet size={17} />
                Wallet
              </Link>

              <Link
                href="/dashboard/profile/change-password"
                onClick={() =>
                  setProfileOpen(false)
                }
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-accent"
              >
                <KeyRound size={17} />
                Change Password
              </Link>

              <div className="my-2 border-t border-border" />

              <button
                type="button"
                onClick={() =>
                  signOut({ callbackUrl: "/login" })
                }
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <LogOut size={17} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}