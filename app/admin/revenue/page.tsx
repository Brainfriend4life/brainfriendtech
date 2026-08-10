"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  BarChart3,
  RefreshCw,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
} from "lucide-react";

type Revenue = {
  id: string;
  service: string;
  amount: number;
  cost: number;
  profit: number;
  reference: string;
  provider: string;
  status: string;
  description?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  } | null;
};

type ServiceTotal = {
  revenue: number;
  cost: number;
  profit: number;
  transactions: number;
};

type RevenueData = {
  revenue: number;
  cost: number;
  profit: number;
};

export default function AdminRevenuePage() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [totals, setTotals] = useState<RevenueData>({
    revenue: 0,
    cost: 0,
    profit: 0,
  });

  const [serviceTotals, setServiceTotals] =
    useState<Record<string, ServiceTotal>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(value);
  }

  async function loadRevenue() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/revenue",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load revenue."
        );
      }

      setTotals(
        data.totals || {
          revenue: 0,
          cost: 0,
          profit: 0,
        }
      );

      setServiceTotals(
        data.serviceTotals || {}
      );

      setRevenues(
        data.revenues || []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load revenue."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRevenue();
  }, []);

  const profitMargin =
    totals.revenue > 0
      ? (totals.profit / totals.revenue) * 100
      : 0;

  function getServiceIcon(service: string) {
    switch (service) {
      case "AIRTIME":
        return (
          <Smartphone className="h-5 w-5" />
        );

      case "DATA":
        return (
          <Wifi className="h-5 w-5" />
        );

      case "ELECTRICITY":
        return (
          <Zap className="h-5 w-5" />
        );

      case "CABLE":
        return (
          <Tv className="h-5 w-5" />
        );

      case "EXAM_PIN":
        return (
          <GraduationCap className="h-5 w-5" />
        );

      default:
        return (
          <Receipt className="h-5 w-5" />
        );
    }
  }

  function getServiceName(service: string) {
    switch (service) {
      case "AIRTIME":
        return "Airtime";

      case "DATA":
        return "Data";

      case "ELECTRICITY":
        return "Electricity";

      case "CABLE":
        return "Cable TV";

      case "EXAM_PIN":
        return "Exam PIN";

      case "CBT":
        return "CBT";

      default:
        return service;
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Revenue & Profit
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Monitor your business revenue,
            provider costs and profit.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRevenue}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* REVENUE */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Revenue
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatMoney(
                  totals.revenue
                )}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* COST */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Provider Cost
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatMoney(
                  totals.cost
                )}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
              <Receipt className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* PROFIT */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Profit
              </p>

              <p className="mt-2 text-2xl font-bold text-green-600">
                {formatMoney(
                  totals.profit
                )}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* MARGIN */}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Profit Margin
              </p>

              <p className="mt-2 text-2xl font-bold text-indigo-600">
                {profitMargin.toFixed(2)}%
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* SERVICE BREAKDOWN */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Service Performance
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Revenue and profit generated by
            each service.
          </p>
        </div>

        {Object.keys(serviceTotals).length ===
        0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <BarChart3 className="h-6 w-6 text-gray-400" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              No revenue yet
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Service revenue will appear
              here after successful purchases.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(
              serviceTotals
            ).map(
              ([service, data]) => (
                <div
                  key={service}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      {getServiceIcon(
                        service
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900">
                        {getServiceName(
                          service
                        )}
                      </h3>

                      <p className="text-xs text-gray-500">
                        {
                          data.transactions
                        }{" "}
                        transactions
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Revenue
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {formatMoney(
                          data.revenue
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Cost
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {formatMoney(
                          data.cost
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-green-50 p-3">
                    <p className="text-xs text-green-600">
                      Profit
                    </p>

                    <p className="mt-1 text-lg font-bold text-green-700">
                      {formatMoney(
                        data.profit
                      )}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* RECENT REVENUE */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Recent Revenue
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Latest successful service transactions.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        ) : revenues.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="mx-auto h-8 w-8 text-gray-400" />

            <p className="mt-3 text-sm text-gray-500">
              No revenue transactions yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">
                    Service
                  </th>

                  <th className="px-4 py-3">
                    Customer
                  </th>

                  <th className="px-4 py-3">
                    Revenue
                  </th>

                  <th className="px-4 py-3">
                    Cost
                  </th>

                  <th className="px-4 py-3">
                    Profit
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {revenues.map(
                  (revenue) => (
                    <tr
                      key={revenue.id}
                      className="border-b border-gray-50 text-sm"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-indigo-600">
                            {getServiceIcon(
                              revenue.service
                            )}
                          </div>

                          <span className="font-semibold text-gray-900">
                            {getServiceName(
                              revenue.service
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {revenue.user ? (
                          <div>
                            <p className="font-semibold text-gray-900">
                              {
                                revenue.user
                                  .fullName
                              }
                            </p>

                            <p className="text-xs text-gray-500">
                              {
                                revenue.user
                                  .email
                              }
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            System
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 font-semibold text-gray-900">
                        {formatMoney(
                          revenue.amount
                        )}
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {formatMoney(
                          revenue.cost
                        )}
                      </td>

                      <td className="px-4 py-4 font-bold text-green-600">
                        {formatMoney(
                          revenue.profit
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          {revenue.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-gray-500">
                        {new Date(
                          revenue.createdAt
                        ).toLocaleString(
                          "en-NG"
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}