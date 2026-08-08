
"use client";

import { Bell, Menu } from "lucide-react";

type TopbarProps = {
  onMenuClick: () => void;
};

export default function Topbar({
  onMenuClick,
}: TopbarProps) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      {/* LEFT SIDE */}

      <div className="flex items-center gap-3">
        {/* Mobile Menu */}

        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        <div>
          <h2 className="text-xl font-bold sm:text-2xl">
            Dashboard
          </h2>

          <p className="hidden text-gray-500 sm:block">
            Welcome back, Emmanuel 👋
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Notification */}

        <button
          type="button"
          className="relative rounded-full bg-gray-100 p-2.5 hover:bg-gray-200 sm:p-3"
          aria-label="Notifications"
        >
          <Bell
            size={20}
            className="sm:h-[22px] sm:w-[22px]"
          />

          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 sm:right-2 sm:top-2" />
        </button>

        {/* User */}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white sm:h-11 sm:w-11 sm:text-lg">
            E
          </div>

          <div className="hidden sm:block">
            <p className="font-semibold">
              Emmanuel
            </p>

            <p className="text-sm text-gray-500">
              Customer
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

