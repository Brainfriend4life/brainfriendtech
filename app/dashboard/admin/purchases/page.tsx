"use client";

import { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Copy,
  CheckCircle2,
  Clock3,
  XCircle,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  Fingerprint,
  FileText,
} from "lucide-react";

type Purchase = {
  id: string;
  type: string;
  amount: number;
  cost: number;
  profit: number;
  description: string;
  status: string;
  reference: string;
  provider: string;
  createdAt: string;

  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };

  examPin?: {
    id: string;
    provider: string;
    pin: string;
    serial: string;
    amount: number;
    reference: string;
    createdAt: string;
  } | null;

  nin?: {
    id: string;
    nin: string;
    cardType: string;
    amount: number;
    reference: string;
    transactionId: string | null;
    status: string;
    firstName: string | null;
    middleName: string | null;
    surname: string | null;
    gender: string | null;
    birthDate: string | null;
    telephone: string | null;
    photo: string | null;
    hasPdf: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
};

const typeOptions = [
  "ALL",
  "AIRTIME",
  "DATA",
  "ELECTRICITY",
  "CABLE",
  "EXAM_PIN",
  "NIN",
];

const statusOptions = [
  "ALL",
  "SUCCESS",
  "PENDING",
  "FAILED",
];

function formatMoney(amount: number) {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function getTypeIcon(type: string) {
  switch (type) {
    case "AIRTIME":
      return Smartphone;

    case "DATA":
      return Wifi;

    case "ELECTRICITY":
      return Zap;

    case "CABLE":
      return Tv;

    case "EXAM_PIN":
      return GraduationCap;

    case "NIN":
      return Fingerprint;

    default:
      return Smartphone;
  }
}

function getTypeName(type: string) {
  switch (type) {
    case "EXAM_PIN":
      return "Exam PIN";

    case "NIN":
      return "NIN Verification";

    case "AIRTIME":
      return "Airtime";

    case "DATA":
      return "Data";

    case "ELECTRICITY":
      return "Electricity";

    case "CABLE":
      return "Cable TV";

    default:
      return type;
  }
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Successful
      </span>
    );
  }

  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
        <Clock3 className="h-3.5 w-3.5" />
        Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
      <XCircle className="h-3.5 w-3.5" />
      Failed
    </span>
  );
}

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] =
    useState<Purchase[]>([]);

  const [search, setSearch] =
    useState("");

  const [type, setType] =
    useState("ALL");

  const [status, setStatus] =
    useState("ALL");

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const [summary, setSummary] =
    useState({
      transactions: 0,
      amount: 0,
      cost: 0,
      profit: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [selectedPurchase, setSelectedPurchase] =
    useState<Purchase | null>(null);

  const [copied, setCopied] =
    useState("");

  async function loadPurchases() {
    setLoading(true);

    try {
      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(page)
      );

      if (search) {
        params.set(
          "search",
          search
        );
      }

      if (type !== "ALL") {
        params.set(
          "type",
          type
        );
      }

      if (status !== "ALL") {
        params.set(
          "status",
          status
        );
      }

      const response =
        await fetch(
          `/api/admin/purchases?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load purchases"
        );
      }

      setPurchases(
        data.purchases || []
      );

      setTotal(
        data.pagination?.total || 0
      );

      setTotalPages(
        data.pagination?.totalPages || 1
      );

      setSummary(
        data.summary || {
          transactions: 0,
          amount: 0,
          cost: 0,
          profit: 0,
        }
      );
    } catch (error) {
      console.error(
        "PURCHASE HISTORY ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPurchases();
  }, [page, type, status]);

  function handleSearch(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setPage(1);
    loadPurchases();
  }

  async function copyText(
    text: string,
    key: string
  ) {
    await navigator.clipboard.writeText(
      text
    );

    setCopied(key);

    setTimeout(() => {
      setCopied("");
    }, 1500);
  }

  return (
    <div className="min-h-screen">
      {/* HEADER */}

      <div className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              Purchases History
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              View and manage purchases made
              by all users.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPurchases}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
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
      </div>

      {/* SUMMARY */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Purchases
          </p>

          <p className="mt-2 text-2xl font-black text-gray-900">
            {summary.transactions.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Revenue
          </p>

          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatMoney(summary.amount)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Cost
          </p>

          <p className="mt-2 text-2xl font-black text-gray-900">
            {formatMoney(summary.cost)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Profit
          </p>

          <p className="mt-2 text-2xl font-black text-green-600">
            {formatMoney(summary.profit)}
          </p>
        </div>
      </div>

      {/* FILTERS */}

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 lg:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search name, email, phone or reference..."
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={type}
            onChange={(event) => {
              setType(
                event.target.value
              );
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500"
          >
            {typeOptions.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item === "ALL"
                    ? "All Services"
                    : getTypeName(item)}
                </option>
              )
            )}
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value
              );
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500"
          >
            {statusOptions.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item === "ALL"
                    ? "All Status"
                    : item}
                </option>
              )
            )}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            Search
          </button>
        </form>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                  User
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                  Service
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                  Amount
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                  Status
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                  Reference
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-gray-500">
                  Date
                </th>

                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-sm text-gray-500"
                  >
                    Loading purchases...
                  </td>
                </tr>
              ) : purchases.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-sm font-semibold text-gray-500"
                  >
                    No purchases found.
                  </td>
                </tr>
              ) : (
                purchases.map(
                  (purchase) => {
                    const Icon =
                      getTypeIcon(
                        purchase.type
                      );

                    return (
                      <tr
                        key={
                          purchase.id
                        }
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900">
                            {
                              purchase
                                .user
                                .fullName
                            }
                          </p>

                          <p className="text-xs text-gray-500">
                            {
                              purchase
                                .user
                                .email
                            }
                          </p>

                          <p className="text-xs text-gray-400">
                            {
                              purchase
                                .user
                                .phone
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                              <Icon className="h-4 w-4" />
                            </div>

                            <div>
                              <p className="font-bold text-gray-900">
                                {getTypeName(
                                  purchase.type
                                )}
                              </p>

                              <p className="text-xs text-gray-500">
                                {
                                  purchase.provider
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-black text-gray-900">
                            {formatMoney(
                              purchase.amount
                            )}
                          </p>

                          <p className="text-xs text-green-600">
                            Profit{" "}
                            {formatMoney(
                              purchase.profit
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              purchase.status
                            }
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="max-w-[150px] truncate font-mono text-xs text-gray-600">
                              {
                                purchase.reference
                              }
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                copyText(
                                  purchase.reference,
                                  purchase.id
                                )
                              }
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              title="Copy reference"
                            >
                              {copied ===
                              purchase.id ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-xs text-gray-500">
                          {formatDate(
                            purchase.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPurchase(
                                purchase
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Showing page{" "}
            <span className="font-bold text-gray-900">
              {page}
            </span>{" "}
            of{" "}
            <span className="font-bold text-gray-900">
              {totalPages}
            </span>{" "}
            · {total.toLocaleString()} total
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      current - 1,
                      1
                    )
                )
              }
              className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              disabled={
                page >= totalPages
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      current + 1,
                      totalPages
                    )
                )
              }
              className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* DETAILS MODAL */}

      {selectedPurchase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  Purchase Details
                </h2>

                <p className="text-xs text-gray-500">
                  {
                    selectedPurchase
                      .reference
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPurchase(
                    null
                  )
                }
                className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* USER */}

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-gray-500">
                  Customer
                </p>

                <p className="font-black text-gray-900">
                  {
                    selectedPurchase
                      .user.fullName
                  }
                </p>

                <p className="text-sm text-gray-500">
                  {
                    selectedPurchase
                      .user.email
                  }
                </p>

                <p className="text-sm text-gray-500">
                  {
                    selectedPurchase
                      .user.phone
                  }
                </p>
              </div>

              {/* PURCHASE */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold text-gray-500">
                    Service
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    {getTypeName(
                      selectedPurchase.type
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500">
                    Provider
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    {
                      selectedPurchase.provider
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500">
                    Amount
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    {formatMoney(
                      selectedPurchase.amount
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500">
                    Status
                  </p>

                  <div className="mt-1">
                    <StatusBadge
                      status={
                        selectedPurchase.status
                      }
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500">
                    Reference
                  </p>

                  <p className="mt-1 break-all font-mono text-sm text-gray-900">
                    {
                      selectedPurchase.reference
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500">
                    Date
                  </p>

                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(
                      selectedPurchase.createdAt
                    )}
                  </p>
                </div>
              </div>

              {/* EXAM PIN */}

              {selectedPurchase.examPin && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                  <h3 className="mb-4 font-black text-indigo-900">
                    Exam PIN Details
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold text-indigo-600">
                        Provider
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {
                          selectedPurchase
                            .examPin
                            .provider
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-indigo-600">
                        Amount
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {formatMoney(
                          selectedPurchase
                            .examPin
                            .amount
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-indigo-600">
                        PIN
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <code className="break-all rounded-lg bg-white px-3 py-2 font-mono font-black text-gray-900">
                          {
                            selectedPurchase
                              .examPin
                              .pin
                          }
                        </code>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              selectedPurchase
                                .examPin!
                                .pin,
                              "exam-pin"
                            )
                          }
                          className="rounded-lg bg-white p-2 text-indigo-600 hover:bg-indigo-100"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-indigo-600">
                        Serial Number
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <code className="break-all rounded-lg bg-white px-3 py-2 font-mono font-black text-gray-900">
                          {
                            selectedPurchase
                              .examPin
                              .serial
                          }
                        </code>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              selectedPurchase
                                .examPin!
                                .serial,
                              "exam-serial"
                            )
                          }
                          className="rounded-lg bg-white p-2 text-indigo-600 hover:bg-indigo-100"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NIN */}

              {selectedPurchase.nin && (
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
                  <h3 className="mb-4 font-black text-purple-900">
                    NIN Verification
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold text-purple-600">
                        NIN
                      </p>

                      <p className="mt-1 font-mono font-black text-gray-900">
                        {
                          selectedPurchase
                            .nin.nin
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-purple-600">
                        Card Type
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {
                          selectedPurchase
                            .nin
                            .cardType
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-purple-600">
                        Full Name
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {[
                          selectedPurchase
                            .nin
                            .firstName,
                          selectedPurchase
                            .nin
                            .middleName,
                          selectedPurchase
                            .nin
                            .surname,
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                          "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-purple-600">
                        Gender
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {
                          selectedPurchase
                            .nin.gender
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-purple-600">
                        Date of Birth
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {
                          selectedPurchase
                            .nin
                            .birthDate
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-purple-600">
                        Telephone
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {
                          selectedPurchase
                            .nin.telephone
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-xs font-bold text-purple-600">
                      PDF Document
                    </p>

                    {selectedPurchase.nin
                      .hasPdf ? (
                      <a
                        href={`/api/admin/verification/nin/${selectedPurchase.nin.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700"
                      >
                        <FileText className="h-4 w-4" />
                        View PDF
                      </a>
                    ) : (
                      <p className="mt-1 font-bold text-gray-500">
                        Not available
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}