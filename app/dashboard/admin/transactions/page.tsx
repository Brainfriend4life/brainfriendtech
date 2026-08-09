
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
        return "bg-green-100 text-green-700";

      case "failed":
        return "bg-red-100 text-red-700";

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/admin"
            className="mt-1 rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Transactions
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              View and monitor all transactions on Brainfriend Tech.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3">
          <Receipt className="h-5 w-5 text-indigo-600" />

          <span className="text-sm font-semibold text-indigo-700">
            {transactions.length} Transactions
          </span>
        </div>
      </div>

      {/* EMPTY STATE */}
      {transactions.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <Receipt className="h-8 w-8 text-indigo-600" />
          </div>

          <h2 className="mt-5 text-lg font-bold text-gray-900">
            No transactions yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Transactions will appear here when users perform
            wallet or service transactions.
          </p>
        </div>
      ) : (
        /* TRANSACTIONS */
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Reference
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {transactions.map((transaction) => {
                  const isCredit =
                    transaction.type === "FUND_WALLET";

                  return (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-gray-50"
                    >
                      {/* USER */}
                      <td className="px-5 py-4">
                        <div className="min-w-[180px]">
                          <p className="font-semibold text-gray-900">
                            {transaction.user.fullName}
                          </p>

                          <p className="text-xs text-gray-500">
                            {transaction.user.email}
                          </p>
                        </div>
                      </td>

                      {/* TYPE */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isCredit ? (
                            <ArrowDownCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowUpCircle className="h-5 w-5 text-indigo-600" />
                          )}

                          <div>
                            <p className="font-medium text-gray-900">
                              {transaction.type.replaceAll("_", " ")}
                            </p>

                            <p className="text-xs text-gray-500">
                              {transaction.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* AMOUNT */}
                      <td className="px-5 py-4">
                        <p
                          className={`font-bold ${
                            isCredit
                              ? "text-green-600"
                              : "text-gray-900"
                          }`}
                        >
                          {isCredit ? "+" : "-"}₦
                          {transaction.amount.toLocaleString(
                            "en-NG",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </p>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            transaction.status
                          )}`}
                        >
                          {transaction.status.toLowerCase() ===
                          "success" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : transaction.status.toLowerCase() ===
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
                        <p className="max-w-[180px] truncate font-mono text-xs text-gray-600">
                          {transaction.reference}
                        </p>
                      </td>

                      {/* DATE */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="text-sm text-gray-700">
                          {new Date(
                            transaction.createdAt
                          ).toLocaleDateString("en-NG", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>

                        <p className="text-xs text-gray-400">
                          {new Date(
                            transaction.createdAt
                          ).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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

