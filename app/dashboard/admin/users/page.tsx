import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Users, ShieldCheck, UserCheck, UserX } from "lucide-react";

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

  return (
    <div className="space-y-8">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Users
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage Brainfriend Tech user accounts.
        </p>
      </div>

      {/* STATISTICS */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total Users
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalUsers}
              </p>
            </div>

            <div className="rounded-xl bg-indigo-100 p-3">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Administrators
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {admins}
              </p>
            </div>

            <div className="rounded-xl bg-purple-100 p-3">
              <ShieldCheck className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Active Users
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {activeUsers}
              </p>
            </div>

            <div className="rounded-xl bg-green-100 p-3">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Suspended
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {suspendedUsers}
              </p>
            </div>

            <div className="rounded-xl bg-red-100 p-3">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* USERS TABLE */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-bold text-gray-900">
            All Users
          </h2>
        </div>

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  User
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Phone
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Role
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Status
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Wallet
                </th>

                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user.fullName}
                      </p>

                      <p className="text-sm text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.phone}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-semibold text-indigo-600">
                    ₦
                    {Number(
                      user.walletBalance
                    ).toLocaleString("en-NG")}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/admin/users/${user.id}`}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE USERS */}

        <div className="divide-y divide-gray-100 md:hidden">
          {users.map((user) => (
            <div
              key={user.id}
              className="space-y-4 p-5"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {user.fullName}
                </p>

                <p className="break-all text-sm text-gray-500">
                  {user.email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">
                    Phone
                  </p>

                  <p className="font-medium text-gray-900">
                    {user.phone}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Wallet
                  </p>

                  <p className="font-semibold text-indigo-600">
                    ₦
                    {Number(
                      user.walletBalance
                    ).toLocaleString("en-NG")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.role}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.status}
                </span>
              </div>

              <Link
                href={`/dashboard/admin/users/${user.id}`}
                className="block rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                View User
              </Link>
            </div>
          ))}

          {users.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}