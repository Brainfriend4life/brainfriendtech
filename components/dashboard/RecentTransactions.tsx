"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: string;
  provider: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const res = await fetch("/api/transactions");
        const data = await res.json();

        if (Array.isArray(data)) {
          setTransactions(data.slice(0, 5));
        } else {
          setTransactions([]);
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow">
      <h2 className="mb-6 text-2xl font-bold text-card-foreground">
        Recent Transactions
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 text-left text-muted-foreground">
                Service
              </th>

              <th className="py-3 text-left text-muted-foreground">
                Amount
              </th>

              <th className="py-3 text-left text-muted-foreground">
                Status
              </th>

              <th className="py-3 text-left text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Loading transactions...
                </td>
              </tr>
            )}

            {!loading && transactions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  No transactions yet.
                </td>
              </tr>
            )}

            {transactions.map((tx) => {
              const isFailed =
                tx.status.toLowerCase().includes("failed");

              const isPending =
                tx.status.toLowerCase().includes("pending");

              return (
                <tr
                  key={tx.id}
                  className="border-b border-border transition hover:bg-muted/50"
                >
                  <td className="py-3 text-card-foreground">
                    {tx.provider || tx.type}
                  </td>

                  <td className="py-3 font-medium text-card-foreground">
                    ₦{Number(tx.amount).toLocaleString()}
                  </td>

                  <td className="py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        isFailed
                          ? "bg-red-500/10 text-red-500"
                          : isPending
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>

                  <td className="py-3 text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}