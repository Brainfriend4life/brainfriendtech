
export const dynamic = "force-dynamic";

import {
  Users,
  ReceiptText,
  GraduationCap,
  CheckCircle2,
  Wallet,
  Clock,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Database,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

const CHEAPDATAHUB_BALANCE_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/wallet/balance/";

export default async function AdminDashboardPage() {
  const [
    totalUsers,
    totalTransactions,
    totalCbtAttempts,
    completedExams,
    walletFunding,
    recentTransactions,
    serviceTransactions,
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
        status: "SUCCESS",
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

    prisma.transaction.findMany({
      where: {
        status: "SUCCESS",
        type: {
          in: [
            "AIRTIME",
            "DATA",
            "ELECTRICITY",
            "CABLE",
            "EXAM_PIN",
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  // =========================================================
  // PROVIDER BALANCE
  // =========================================================

  let cheapDataHubBalance = 0;
  let cheapDataHubBalanceError = "";

  const apiKey = process.env.CHEAPDATAHUB_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        CHEAPDATAHUB_BALANCE_URL,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      console.log(
        "CHEAPDATAHUB BALANCE RESPONSE:",
        result
      );

      if (
        response.ok &&
        (result?.status === true ||
          result?.status === "true")
      ) {
        cheapDataHubBalance =
          Number(result?.data?.balance) || 0;
      } else {
        cheapDataHubBalanceError =
          result?.message ||
          "Unable to fetch provider balance.";
      }
    } catch (error) {
      console.error(
        "CHEAPDATAHUB BALANCE ERROR:",
        error
      );

      cheapDataHubBalanceError =
        "Unable to connect to provider.";
    }
  } else {
    cheapDataHubBalanceError =
      "Provider API key is not configured.";
  }

  // =========================================================
  // WALLET FUNDING
  // =========================================================

  const totalWalletFunding =
    Number(walletFunding._sum.amount) || 0;

  // =========================================================
  // REVENUE / COST / PROFIT
  // =========================================================

  const revenueByService: Record<string, number> = {
    AIRTIME: 0,
    DATA: 0,
    ELECTRICITY: 0,
    CABLE: 0,
    EXAM_PIN: 0,
  };

  let totalRevenue = 0;

  for (const transaction of serviceTransactions) {
    const amount =
      Number(transaction.amount) || 0;

    totalRevenue += amount;

    if (
      Object.prototype.hasOwnProperty.call(
        revenueByService,
        transaction.type
      )
    ) {
      revenueByService[transaction.type] +=
        amount;
    }
  }

  /*
   * Provider cost can be connected here later
   * when the actual provider cost is stored
   * on each transaction.
   */
  const totalCost = 0;

  const totalProfit =
    totalRevenue - totalCost;

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  function formatMoney(value: number) {
    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // =========================================================
  // STAT CARDS
  // =========================================================

  const stats = [
    {
      title: "Total Users",
      value: totalUsers.toLocaleString(),
      icon: Users,
      iconBg:
        "bg-indigo-100 dark:bg-indigo-500/15",
      iconColor:
        "text-indigo-600 dark:text-indigo-400",
    },
    {
      title: "Transactions",
      value: totalTransactions.toLocaleString(),
      icon: ReceiptText,
      iconBg:
        "bg-blue-100 dark:bg-blue-500/15",
      iconColor:
        "text-blue-600 dark:text-blue-400",
    },
    {
      title: "CBT Attempts",
      value: totalCbtAttempts.toLocaleString(),
      icon: GraduationCap,
      iconBg:
        "bg-purple-100 dark:bg-purple-500/15",
      iconColor:
        "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Completed Exams",
      value: completedExams.toLocaleString(),
      icon: CheckCircle2,
      iconBg:
        "bg-green-100 dark:bg-green-500/15",
      iconColor:
        "text-green-600 dark:text-green-400",
    },
  ];

  // =========================================================
  // SERVICE BREAKDOWN
  // =========================================================

  const serviceBreakdown = [
    {
      name: "Airtime",
      type: "AIRTIME",
      amount: revenueByService.AIRTIME,
    },
    {
      name: "Data",
      type: "DATA",
      amount: revenueByService.DATA,
    },
    {
      name: "Electricity",
      type: "ELECTRICITY",
      amount: revenueByService.ELECTRICITY,
    },
    {
      name: "Cable TV",
      type: "CABLE",
      amount: revenueByService.CABLE,
    },
    {
      name: "Exam PIN",
      type: "EXAM_PIN",
      amount: revenueByService.EXAM_PIN,
    },
  ];

  return (
    <div className="min-h-full space-y-6 bg-gray-50 px-4 py-6 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-0">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          Admin Panel
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Dashboard Overview
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
          Manage Brainfriend Global Tech and monitor
          platform activity.
        </p>
      </div>

      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:shadow-none dark:hover:border-gray-700"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
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

      {/* =====================================================
          PROVIDER WALLET
      ===================================================== */}

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Provider Wallet
          </h2>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor the balance used to process customer
            service requests.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* PROVIDER BALANCE */}

          <div className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-6 text-white shadow-sm dark:from-indigo-700 dark:via-indigo-800 dark:to-indigo-950">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-indigo-100">
                  Provider Balance
                </p>

                {cheapDataHubBalanceError ? (
                  <p className="mt-2 text-sm font-medium leading-5 text-red-100">
                    {cheapDataHubBalanceError}
                  </p>
                ) : (
                  <p className="mt-2 break-words text-3xl font-bold tracking-tight">
                    {formatMoney(
                      cheapDataHubBalance
                    )}
                  </p>
                )}
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/10">
                <Database className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-indigo-100/90">
              Current balance available for processing
              customer service requests. This balance is
              separate from customer wallet balances.
            </p>
          </div>

          {/* USER WALLET FUNDING */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Successful User Wallet Funding
                </p>

                <p className="mt-2 break-words text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {formatMoney(
                    totalWalletFunding
                  )}
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/15">
                <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Total successful wallet funding transactions
              recorded on the platform.
            </p>
          </div>

        </div>
      </section>

      {/* =====================================================
          REVENUE / COST / PROFIT
      ===================================================== */}

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Revenue & Profit
          </h2>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track money generated from platform services.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* REVENUE */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Revenue
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(totalRevenue)}
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/15">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Successful Airtime, Data, Electricity, Cable
              and Exam PIN transactions.
            </p>
          </div>

          {/* COST */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Provider Cost
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatMoney(totalCost)}
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Provider costs will be calculated from the
              actual API cost stored with each transaction.
            </p>
          </div>

          {/* PROFIT */}

          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-5 text-white shadow-sm dark:from-indigo-700 dark:via-indigo-800 dark:to-purple-950 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-100">
                  Estimated Profit
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatMoney(totalProfit)}
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/10">
                <PiggyBank className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-indigo-100/90">
              Revenue minus provider cost.
            </p>
          </div>

        </div>
      </section>

      {/* =====================================================
          SERVICE REVENUE BREAKDOWN
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

        <div className="border-b border-gray-200 p-5 dark:border-gray-800 sm:p-6">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Service Revenue
          </h2>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Revenue generated from each service.
          </p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-800 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5">

          {serviceBreakdown.map((service) => (
            <div
              key={service.type}
              className="p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 sm:p-6"
            >
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {service.name}
              </p>

              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                {formatMoney(service.amount)}
              </p>
            </div>
          ))}

        </div>
      </div>

      {/* =====================================================
          RECENT TRANSACTIONS
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

        <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800 sm:p-6">

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Recent Transactions
            </h2>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Latest platform activity
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            <ReceiptText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </div>

        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">

          {recentTransactions.length === 0 ? (

            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No transactions yet.
            </div>

          ) : (

            recentTransactions.map((transaction) => {

              const transactionStatus =
                String(
                  transaction.status || ""
                ).toLowerCase();

              return (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                      {transaction.user.fullName}
                    </p>

                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      {transaction.description}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-400 dark:text-gray-500">
                      {transaction.reference}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:block sm:min-w-[150px] sm:text-right">

                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatMoney(
                          Number(
                            transaction.amount
                          )
                        )}
                      </p>

                      <p
                        className={`mt-1 text-xs font-semibold ${
                          transactionStatus ===
                          "success"
                            ? "text-green-600 dark:text-green-400"
                            : transactionStatus ===
                              "failed"
                            ? "text-red-600 dark:text-red-400"
                            : "text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        {transaction.status}
                      </p>
                    </div>

                    <p className="mt-2 hidden items-center justify-end gap-1 text-xs text-gray-400 dark:text-gray-500 sm:flex">
                      <Clock className="h-3 w-3" />

                      {new Date(
                        transaction.createdAt
                      ).toLocaleString("en-NG")}
                    </p>

                  </div>

                </div>
              );
            })

          )}

        </div>
      </div>

      {/* =====================================================
          QUICK ADMIN ACTIONS
      ===================================================== */}

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Administration
        </h2>

        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage the major areas of your platform.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* USERS */}

          <a
            href="/dashboard/admin/users"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-800 dark:hover:bg-gray-900/80"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
              Manage Users
            </h3>

            <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              View and manage registered users.
            </p>
          </a>

          {/* TRANSACTIONS */}

          <a
            href="/dashboard/admin/transactions"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-gray-900/80"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/15">
              <ReceiptText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
              Transactions
            </h3>

            <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              Monitor all platform transactions.
            </p>
          </a>

          {/* CBT */}

          <a
            href="/dashboard/admin/cbt"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-purple-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-purple-800 dark:hover:bg-gray-900/80"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-500/15">
              <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
              CBT Management
            </h3>

            <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              Manage exams, subjects and questions.
            </p>
          </a>

          {/* RESULTS */}

          <a
            href="/dashboard/admin/results"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-green-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-green-800 dark:hover:bg-gray-900/80"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/15">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
              CBT Results
            </h3>

            <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              Review students&apos; examination results.
            </p>
          </a>

          {/* BUSINESS WALLET */}

          <a
            href="/dashboard/admin/business-wallet"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800 dark:hover:bg-gray-900/80"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
              <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
              Business Wallet
            </h3>

            <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
              Manage business funds, connect bank account
              and withdraw profit.
            </p>
          </a>

        </div>
      </section>

    </div>
  );
}

