
"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: string;
  provider: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          "/api/transactions",
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message ||
              "Failed to load transactions"
          );
        }

        /*
         * Support both:
         *
         * { transactions: [...] }
         *
         * and:
         *
         * [...]
         */

        const transactionList =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data?.transactions
              )
            ? data.transactions
            : [];

        setTransactions(
          transactionList
        );
      } catch (err: any) {
        console.error(
          "TRANSACTION LOAD ERROR:",
          err
        );

        setError(
          err?.message ||
            "Failed to load transactions"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-3xl font-bold">
          Transaction History
        </h1>

        <p className="text-gray-500">
          Loading transactions...
        </p>
      </div>
    );
  }

  /*
   * ==========================================
   * ERROR
   * ==========================================
   */

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-3xl font-bold">
          Transaction History
        </h1>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>

        <button
          onClick={() =>
            window.location.reload()
          }
          className="rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* PAGE HEADER */}

      <div>
        <h1 className="text-3xl font-bold">
          Transaction History
        </h1>

        <p className="mt-1 text-gray-500">
          View your wallet and service
          transactions.
        </p>
      </div>

      {/* EMPTY STATE */}

      {transactions.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
          <div className="mb-3 text-4xl">
            💳
          </div>

          <h2 className="text-xl font-semibold">
            No transactions yet
          </h2>

          <p className="mt-2 text-gray-500">
            Your transactions will appear
            here after you fund your wallet
            or purchase a service.
          </p>
        </div>
      ) : (
        /* TRANSACTION TABLE */

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Type
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Provider
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Status
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Description
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {transactions.map(
                  (tx) => {
                    const status =
                      String(
                        tx.status || ""
                      ).toLowerCase();

                    const isSuccess =
                      status ===
                        "success" ||
                      status ===
                        "successful" ||
                      status ===
                        "delivered";

                    const isFailed =
                      status ===
                      "failed";

                    return (
                      <tr
                        key={tx.id}
                        className="border-t hover:bg-gray-50"
                      >
                        {/* TYPE */}

                        <td className="px-4 py-4">
                          <span className="font-medium">
                            {tx.type}
                          </span>
                        </td>

                        {/* PROVIDER */}

                        <td className="px-4 py-4">
                          {tx.provider}
                        </td>

                        {/* AMOUNT */}

                        <td className="px-4 py-4 font-medium">
                          ₦
                          {Number(
                            tx.amount || 0
                          ).toLocaleString(
                            "en-NG"
                          )}
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                              isFailed
                                ? "bg-red-100 text-red-700"
                                : isSuccess
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>

                        {/* DESCRIPTION */}

                        <td className="max-w-xs px-4 py-4 text-sm text-gray-600">
                          {tx.description ||
                            "-"}
                        </td>

                        {/* DATE */}

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                          {new Date(
                            tx.createdAt
                          ).toLocaleString(
                            "en-NG"
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

