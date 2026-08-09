import {
  Users,
  ReceiptText,
  GraduationCap,
  CheckCircle2,
  Wallet,
  Clock,
} from "lucide-react";
import prisma from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [
    totalUsers,
    totalTransactions,
    totalCbtAttempts,
    completedExams,
    walletFunding,
    recentTransactions,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.transaction.count(),

    prisma.cbtAttempt.count(),

    prisma.cbtAttempt.count({
      where: {
        status: "completed",
      },
    }),

    prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        type: "FUND_WALLET",
        status: "success",
      },
    }),

    prisma.transaction.findMany({
      take: 8,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const totalWalletFunding =
    walletFunding._sum.amount ?? 0;

  const stats = [
    {
      title: "Total Users",
      value: totalUsers.toLocaleString(),
      icon: Users,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      title: "Transactions",
      value: totalTransactions.toLocaleString(),
      icon: ReceiptText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "CBT Attempts",
      value: totalCbtAttempts.toLocaleString(),
      icon: GraduationCap,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Completed Exams",
      value: completedExams.toLocaleString(),
      icon: CheckCircle2,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* HEADER */}

      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-medium text-indigo-600">
          Admin Panel
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          Dashboard Overview
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          Manage Brainfriend Tech and monitor platform activity.
        </p>
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                    {stat.value}
                  </p>
                </div>

                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}
                >
                  <Icon
                    className={`h-6 w-6 ${stat.iconColor}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* WALLET FUNDING */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <div className="rounded-2xl bg-indigo-700 p-6 text-white shadow-sm lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Wallet className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm text-indigo-200">
                Successful Wallet Funding
              </p>

              <p className="mt-1 text-2xl font-bold">
                ₦
                {totalWalletFunding.toLocaleString(
                  "en-NG",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-indigo-100">
            Total successful wallet funding transactions
            recorded on the platform.
          </p>
        </div>

        {/* RECENT TRANSACTIONS */}

        <div className="rounded-2xl bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 p-5 sm:p-6">
            <div>
              <h2 className="font-bold text-gray-900">
                Recent Transactions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest platform activity
              </p>
            </div>

            <ReceiptText className="h-5 w-5 text-gray-400" />
          </div>

          <div className="divide-y divide-gray-100">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No transactions yet.
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {transaction.user.fullName}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {transaction.description}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-400">
                      {transaction.reference}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <div>
                      <p className="font-bold text-gray-900">
                        ₦
                        {Number(
                          transaction.amount
                        ).toLocaleString("en-NG")}
                      </p>

                      <p
                        className={`mt-1 text-xs font-medium ${
                          transaction.status.toLowerCase() ===
                          "success"
                            ? "text-green-600"
                            : transaction.status.toLowerCase() ===
                              "failed"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {transaction.status}
                      </p>
                    </div>

                    <p className="mt-1 hidden items-center justify-end gap-1 text-xs text-gray-400 sm:flex">
                      <Clock className="h-3 w-3" />

                      {new Date(
                        transaction.createdAt
                      ).toLocaleString("en-NG")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QUICK ADMIN ACTIONS */}

      <div>
        <h2 className="text-lg font-bold text-gray-900">
          Administration
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Manage the major areas of your platform.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/dashboard/admin/users"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <Users className="h-6 w-6 text-indigo-600" />

            <h3 className="mt-4 font-semibold text-gray-900">
              Manage Users
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              View and manage registered users.
            </p>
          </a>

          <a
            href="/dashboard/admin/transactions"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <ReceiptText className="h-6 w-6 text-blue-600" />

            <h3 className="mt-4 font-semibold text-gray-900">
              Transactions
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Monitor all platform transactions.
            </p>
          </a>

          <a
            href="/dashboard/admin/cbt"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <GraduationCap className="h-6 w-6 text-purple-600" />

            <h3 className="mt-4 font-semibold text-gray-900">
              CBT Management
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Manage exams, subjects and questions.
            </p>
          </a>

          <a
            href="/dashboard/admin/results"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <CheckCircle2 className="h-6 w-6 text-green-600" />

            <h3 className="mt-4 font-semibold text-gray-900">
              CBT Results
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Review students' examination results.
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}