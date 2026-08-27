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
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Users
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage Brainfriend Global Tech user accounts.
        </p>
      </div>

      {/* STATISTICS */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* TOTAL USERS */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Users
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {totalUsers.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-indigo-100 p-3 dark:bg-indigo-500/15">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        {/* ADMINISTRATORS */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Administrators
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {admins.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-500/15">
              <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* ACTIVE USERS */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Active Users
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {activeUsers.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/15">
              <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* SUSPENDED USERS */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Suspended
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {suspendedUsers.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-red-100 p-3 dark:bg-red-500/15">
              <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* TABLE HEADER */}
        <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                All Users
              </h2>

              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {totalUsers.toLocaleString()} registered user
                {totalUsers === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  User
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Phone
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Role
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Status
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Wallet
                </th>

                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {/* USER */}
                  <td className="px-6 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {user.fullName}
                      </p>

                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </td>

                  {/* PHONE */}
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {user.phone || "—"}
                  </td>

                  {/* ROLE */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
                          : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>

                  {/* WALLET */}
                  <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatMoney(Number(user.walletBalance))}
                  </td>

                  {/* ACTION */}
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/admin/users/${user.id}`}
                      className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE USERS */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
          {users.map((user) => (
            <div
              key={user.id}
              className="space-y-4 p-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {/* USER INFO */}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user.fullName}
                </p>

                <p className="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>

              {/* PHONE + WALLET */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Phone
                  </p>

                  <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-gray-200">
                    {user.phone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Wallet
                  </p>

                  <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatMoney(Number(user.walletBalance))}
                  </p>
                </div>
              </div>

              {/* BADGES */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {user.role}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.status === "ACTIVE"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                  }`}
                >
                  {user.status}
                </span>
              </div>

              {/* ACTION */}
              <Link
                href={`/dashboard/admin/users/${user.id}`}
                className="block rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                View User
              </Link>
            </div>
          ))}

          {users.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}