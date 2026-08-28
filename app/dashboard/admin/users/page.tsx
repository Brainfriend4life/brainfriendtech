import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      walletBalance: true,
      createdAt: true,
    },
  });

  const totalUsers = users.length;

  const admins = users.filter(
    (user) => user.role === "ADMIN"
  ).length;

  const activeUsers = users.filter(
    (user) => user.status === "ACTIVE"
  ).length;

  const suspendedUsers = users.filter(
    (user) => user.status === "SUSPENDED"
  ).length;

  function formatMoney(value: number) {
    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <div className="min-h-full space-y-8 bg-background text-foreground transition-colors">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Users
        </h1>

        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Manage Brainfriend Global Tech user accounts.
        </p>
      </div>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

        {/* TOTAL USERS */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6">
          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Users
              </p>

              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {totalUsers.toLocaleString()}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>

          </div>
        </div>

        {/* ADMINISTRATORS */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6">
          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Administrators
              </p>

              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {admins.toLocaleString()}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-500/15">
              <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>

          </div>
        </div>

        {/* ACTIVE USERS */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6">
          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Users
              </p>

              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {activeUsers.toLocaleString()}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/15">
              <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>

          </div>
        </div>

        {/* SUSPENDED USERS */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6">
          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Suspended
              </p>

              <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {suspendedUsers.toLocaleString()}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
              <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>

          </div>
        </div>

      </div>

      {/* =====================================================
          USERS TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

        {/* TABLE HEADER */}
        <div className="border-b border-border px-5 py-5 sm:px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="min-w-0">

              <h2 className="font-bold text-foreground">
                All Users
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalUsers.toLocaleString()} registered user
                {totalUsers === 1 ? "" : "s"}
              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            DESKTOP TABLE
        =================================================== */}

        <div className="hidden overflow-x-auto md:block">

          <table className="w-full">

            <thead className="bg-muted/60">

              <tr>

                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  User
                </th>

                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Phone
                </th>

                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Role
                </th>

                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Status
                </th>

                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Wallet
                </th>

                <th className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-border">

              {users.map((user) => (

                <tr
                  key={user.id}
                  className="transition-colors hover:bg-muted/40"
                >

                  {/* USER */}
                  <td className="px-6 py-4">

                    <div className="min-w-0">

                      <p className="truncate font-semibold text-foreground">
                        {user.fullName}
                      </p>

                      <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>

                    </div>

                  </td>

                  {/* PHONE */}
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {user.phone || "—"}
                  </td>

                  {/* ROLE */}
                  <td className="px-6 py-4">

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </span>

                  </td>

                  {/* STATUS */}
                  <td className="px-6 py-4">

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        user.status === "ACTIVE"
                          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                          : user.status === "SUSPENDED"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300"
                      }`}
                    >
                      {user.status}
                    </span>

                  </td>

                  {/* WALLET */}
                  <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatMoney(
                      Number(user.walletBalance)
                    )}
                  </td>

                  {/* ACTION */}
                  <td className="px-6 py-4 text-right">

                    <Link
                      href={`/dashboard/admin/users/${user.id}`}
                      className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      View
                    </Link>

                  </td>

                </tr>

              ))}

              {users.length === 0 && (

                <tr>

                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm text-muted-foreground"
                  >
                    No users found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

        {/* ===================================================
            MOBILE USERS
        =================================================== */}

        <div className="divide-y divide-border md:hidden">

          {users.map((user) => (

            <div
              key={user.id}
              className="space-y-4 p-5 transition-colors hover:bg-muted/40"
            >

              {/* USER INFO */}
              <div>

                <p className="font-semibold text-foreground">
                  {user.fullName}
                </p>

                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {user.email}
                </p>

              </div>

              {/* PHONE + WALLET */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/50 p-4">

                <div className="min-w-0">

                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Phone
                  </p>

                  <p className="mt-1 truncate text-sm font-medium text-foreground">
                    {user.phone || "—"}
                  </p>

                </div>

                <div className="min-w-0">

                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Wallet
                  </p>

                  <p className="mt-1 truncate text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatMoney(
                      Number(user.walletBalance)
                    )}
                  </p>

                </div>

              </div>

              {/* BADGES */}
              <div className="flex flex-wrap gap-2">

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {user.role}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.status === "ACTIVE"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                      : user.status === "SUSPENDED"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300"
                  }`}
                >
                  {user.status}
                </span>

              </div>

              {/* ACTION */}
              <Link
                href={`/dashboard/admin/users/${user.id}`}
                className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                View User
              </Link>

            </div>

          ))}

          {users.length === 0 && (

            <div className="p-10 text-center text-sm text-muted-foreground">
              No users found.
            </div>

          )}

        </div>

      </div>

    </div>
  );
}