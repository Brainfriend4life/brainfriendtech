
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
  // CHEAPDATAHUB PROVIDER BALANCE
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
          "Unable to fetch CheapDataHub balance.";
      }
    } catch (error) {
      console.error(
        "CHEAPDATAHUB BALANCE ERROR:",
        error
      );

      cheapDataHubBalanceError =
        "Unable to connect to CheapDataHub.";
    }
  } else {
    cheapDataHubBalanceError =
      "CHEAPDATAHUB_API_KEY is not configured.";
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
      revenueByService[transaction.type] += amount;
    }
  }

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
    <div className="space-y-6">

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

      {/* =====================================================
          PROVIDER BALANCE
      ===================================================== */}

      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Provider Wallet
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Monitor the balance used to process customer service requests.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* CHEAPDATAHUB */}

          <div className="rounded-2xl bg-indigo-700 p-6 text-white shadow-sm">
            <div className="flex items-center justify-between gap-4">

              <div>
                <p className="text-sm font-medium text-indigo-200">
                  CheapDataHub Balance
                </p>

                {cheapDataHubBalanceError ? (
                  <p className="mt-2 text-sm font-medium text-red-200">
                    {cheapDataHubBalanceError}
                  </p>
                ) : (
                  <p className="mt-2 text-3xl font-bold">
                    {formatMoney(cheapDataHubBalance)}
                  </p>
                )}
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Database className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-xs text-indigo-200">
              This is your actual CheapDataHub provider wallet balance.
              It is separate from customer wallet balances.
            </p>
          </div>

          {/* USER WALLET FUNDING */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">

              <div>
                <p className="text-sm font-medium text-gray-500">
                  Successful User Wallet Funding
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatMoney(totalWalletFunding)}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>

            </div>

            <p className="mt-4 text-xs text-gray-500">
              Total successful wallet funding transactions recorded
              on the platform.
            </p>
          </div>

        </div>
      </div>

      {/* REVENUE / COST / PROFIT */}

      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Revenue & Profit
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Track money generated from platform services.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* REVENUE */}

          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Revenue
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatMoney(totalRevenue)}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Successful Airtime, Data, Electricity, Cable and
              Exam PIN transactions.
            </p>
          </div>

          {/* COST */}

          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Provider Cost
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatMoney(totalCost)}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Provider costs will be calculated from the actual
              API cost stored with each transaction.
            </p>
          </div>

          {/* PROFIT */}

          <div className="rounded-2xl bg-indigo-700 p-5 text-white shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-200">
                  Estimated Profit
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatMoney(totalProfit)}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <PiggyBank className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-xs text-indigo-200">
              Revenue minus provider cost.
            </p>
          </div>

        </div>
      </div>

      {/* SERVICE REVENUE BREAKDOWN */}

      <div className="rounded-2xl bg-white shadow-sm">

        <div className="border-b border-gray-100 p-5 sm:p-6">
          <h2 className="font-bold text-gray-900">
            Service Revenue
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Revenue generated from each service.
          </p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5">

          {serviceBreakdown.map((service) => (
            <div
              key={service.type}
              className="p-5 sm:p-6"
            >
              <p className="text-sm text-gray-500">
                {service.name}
              </p>

              <p className="mt-2 text-xl font-bold text-gray-900">
                {formatMoney(service.amount)}
              </p>
            </div>
          ))}

        </div>
      </div>

      {/* RECENT TRANSACTIONS */}

      <div className="rounded-2xl bg-white shadow-sm">

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
                      {formatMoney(
                        Number(transaction.amount)
                      )}
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

<a
  href="/dashboard/admin/business-wallet"
  className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
>
  <Wallet className="h-6 w-6 text-emerald-600" />

  <h3 className="mt-4 font-semibold text-gray-900">
    Business Wallet
  </h3>

  <p className="mt-1 text-sm text-gray-500">
    Manage business funds, connect bank account and withdraw profit.
  </p>
</a>


        </div>

      </div>

    </div>
  );
}

