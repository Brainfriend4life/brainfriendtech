"use client";

import Link from "next/link";
import {
  Wallet,
  Users,
  Receipt,
  ArrowDownToLine,
  BarChart3,
  Activity,
} from "lucide-react";

const adminLinks = [
  {
    title: "Dashboard",
    description: "View overall business statistics.",
    href: "/admin",
    icon: BarChart3,
  },
  {
    title: "Users",
    description: "Manage registered users.",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Transactions",
    description: "View all service transactions.",
    href: "/admin/transactions",
    icon: Receipt,
  },
  {
    title: "Revenue",
    description: "View business revenue and service breakdown.",
    href: "/admin/revenue",
    icon: Wallet,
  },
  {
    title: "Withdrawals",
    description: "Manage business withdrawals.",
    href: "/admin/withdrawals",
    icon: ArrowDownToLine,
  },
];

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Manage Brainfriend Tech VTU services and business operations.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {adminLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>

                <h2 className="text-lg font-semibold text-gray-900">
                  {item.title}
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-green-600" />

            <div>
              <h2 className="font-semibold text-gray-900">
                Business Status
              </h2>

              <p className="text-sm text-green-600">
                Brainfriend Tech services are active.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}