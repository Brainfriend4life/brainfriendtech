"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight, Mail, ShieldCheck, User } from "lucide-react";

export default function ProfileCard() {
  const { data: session, status } = useSession();

  const name = session?.user?.name || "N/A";
  const email = session?.user?.email || "N/A";
  const role = session?.user?.role || "Customer";

  const initials =
    name !== "N/A"
      ? name
          .split(" ")
          .map((part) => part.charAt(0))
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "NA";

  return (
    <section className="w-full">
      {/* HEADER */}
      <div className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Account
        </p>

        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          My Profile
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account information and details.
        </p>
      </div>

      {/* PROFILE CARD */}
      <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-md sm:p-6">
        {/* TOP ACCENT */}
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

        {/* PROFILE HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {/* AVATAR */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 sm:h-16 sm:w-16">
              {status === "loading" ? (
                <div className="h-6 w-6 animate-pulse rounded-full bg-indigo-200 dark:bg-indigo-800" />
              ) : (
                initials
              )}
            </div>

            {/* NAME */}
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account Holder
              </p>

              <h3 className="mt-1 truncate text-lg font-bold text-card-foreground sm:text-xl">
                {status === "loading" ? "Loading..." : name}
              </h3>

              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <ShieldCheck size={14} className="text-emerald-500" />

                <span className="capitalize">{role}</span>
              </div>
            </div>
          </div>

          {/* ICON */}
          <div className="hidden rounded-xl bg-muted/60 p-3 sm:block">
            <User size={20} className="text-muted-foreground" />
          </div>
        </div>

        {/* DETAILS */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {/* NAME */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <User size={15} className="text-indigo-500" />

              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full Name
              </span>
            </div>

            <p className="truncate text-sm font-semibold text-card-foreground">
              {name}
            </p>
          </div>

          {/* EMAIL */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Mail size={15} className="text-indigo-500" />

              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email Address
              </span>
            </div>

            <p className="truncate text-sm font-semibold text-card-foreground">
              {email}
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Account role</p>

            <p className="mt-0.5 text-sm font-semibold capitalize text-card-foreground">
              {role}
            </p>
          </div>

          <Link
            href="/dashboard/profile"
            className="group/button inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]"
          >
            View Profile
            <ArrowUpRight
              size={16}
              className="transition-transform duration-200 group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
            />
          </Link>
        </div>

        {/* BOTTOM INDICATOR */}
        <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-indigo-500 transition-all duration-300 group-hover:w-full" />
      </div>
    </section>
  );
}
