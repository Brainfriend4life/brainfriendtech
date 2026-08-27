
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
} from "lucide-react";

export default async function AdminTransactionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const transactions = await prisma.transaction.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "successful":
        return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300";

      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300";

      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/admin"
            className="mt-1 rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              Transactions
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and monitor all transactions on Brainfriend Global Tech.
            </p>
          </div>
        </div>

        {/* TRANSACTION COUNT */}
        <div className="flex w-fit items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 dark:border-indigo-500/20 dark:bg-indigo-500/10">
          <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            {transactions.length}{" "}
            {transactions.length === 1
              ? "Transaction"
              : "Transactions"}
          </span>
        </div>
      </div>

      {/* EMPTY STATE */}
      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/15">
            <Receipt className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
            No transactions yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Transactions will appear here when users perform
            wallet or service transactions.
          </p>
        </div>
      ) : (
        /* TRANSACTIONS */
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* TABLE HEADER */}
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/15">
                <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>

              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">
                  All Transactions
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Latest platform transaction activity
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              {/* TABLE HEAD */}
              <thead className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    User
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Type
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Amount
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Reference
                  </th>

                  <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.map((transaction) => {
                  const isCredit =
                    transaction.type === "FUND_WALLET";

                  const normalizedStatus =
                    transaction.status.toLowerCase();

                  return (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {/* USER */}
                      <td className="px-5 py-4">
                        <div className="min-w-[180px]">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {transaction.user.fullName}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {transaction.user.email}
                          </p>
                        </div>
                      </td>

                      {/* TYPE */}
                      <td className="px-5 py-4">
                        <div className="flex min-w-[190px] items-center gap-2.5">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              isCredit
                                ? "bg-green-100 dark:bg-green-500/15"
                                : "bg-indigo-100 dark:bg-indigo-500/15"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowUpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-200">
                              {transaction.type.replaceAll(
                                "_",
                                " "
                              )}
                            </p>

                            <p className="max-w-[220px] truncate text-xs text-gray-500 dark:text-gray-400">
                              {transaction.description ||
                                "No description"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* AMOUNT */}
                      <td className="px-5 py-4">
                        <p
                          className={`whitespace-nowrap font-bold ${
                            isCredit
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {isCredit ? "+" : "-"}₦
                          {Number(
                            transaction.amount
                          ).toLocaleString("en-NG", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            transaction.status
                          )}`}
                        >
                          {normalizedStatus ===
                            "success" ||
                          normalizedStatus ===
                            "successful" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : normalizedStatus ===
                            "failed" ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}

                          {transaction.status}
                        </span>
                      </td>

                      {/* REFERENCE */}
                      <td className="px-5 py-4">
                        <p className="max-w-[180px] truncate font-mono text-xs text-gray-600 dark:text-gray-400">
                          {transaction.reference}
                        </p>
                      </td>

                      {/* DATE */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {new Date(
                            transaction.createdAt
                          ).toLocaleDateString(
                            "en-NG",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {new Date(
                            transaction.createdAt
                          ).toLocaleTimeString(
                            "en-NG",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

