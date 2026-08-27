"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  Fingerprint,
  ReceiptText,
  Loader2,
  Eye,
  Copy,
  Check,
  X,
  Download,
  History,
} from "lucide-react";

type Purchase = {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  reference: string;
  provider: string;
  createdAt: string;
  details: any;
};

type ExamPin = {
  id: string;
  provider: string;
  pin: string;
  serial: string;
  amount: number;
  reference: string;
  createdAt: string;
};

type NinVerification = {
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
};

const serviceFilters = [
  { label: "All", value: "ALL", icon: ReceiptText },
  { label: "Airtime", value: "AIRTIME", icon: Smartphone },
  { label: "Data", value: "DATA", icon: Wifi },
  { label: "Electricity", value: "ELECTRICITY", icon: Zap },
  { label: "Cable TV", value: "CABLE", icon: Tv },
  { label: "Exam Pins", value: "EXAM_PIN", icon: GraduationCap },
  { label: "NIN", value: "NIN", icon: Fingerprint },
];

function formatMoney(amount: number) {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getIcon(type: string) {
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
      return ReceiptText;
  }
}

function getServiceName(type: string) {
  switch (type) {
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
    case "NIN":
      return "NIN Verification";
    default:
      return type;
  }
}

function getStatusClass(status: string) {
  switch (status.toUpperCase()) {
    case "SUCCESS":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";

    case "FAILED":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";

    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";

    case "REJECTED":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";

    default:
      return "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300";
  }
}

export default function PurchasesHistoryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [examPins, setExamPins] = useState<ExamPin[]>([]);
  const [ninVerifications, setNinVerifications] = useState<NinVerification[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [selectedPurchase, setSelectedPurchase] =
    useState<Purchase | null>(null);

  const [copied, setCopied] = useState("");

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    try {
      setLoading(true);

      const response = await fetch("/api/purchases", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load purchases"
        );
      }

      setPurchases(data.purchases || []);
      setExamPins(data.examPins || []);
      setNinVerifications(data.ninVerifications || []);
    } catch (error) {
      console.error(
        "LOAD PURCHASES ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyText(
    text: string,
    key: string
  ) {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(key);

      setTimeout(() => {
        setCopied("");
      }, 1500);
    } catch (error) {
      console.error("COPY ERROR:", error);
    }
  }

  function downloadText(
    filename: string,
    content: string
  ) {
    const blob = new Blob(
      [content],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  }

  const filteredPurchases = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    return purchases.filter(
      (purchase) => {
        const matchesFilter =
          filter === "ALL" ||
          purchase.type === filter;

        const matchesSearch =
          !query ||
          purchase.description
            ?.toLowerCase()
            .includes(query) ||
          purchase.reference
            ?.toLowerCase()
            .includes(query) ||
          purchase.provider
            ?.toLowerCase()
            .includes(query);

        return (
          matchesFilter &&
          matchesSearch
        );
      }
    );
  }, [
    purchases,
    search,
    filter,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-slate-950 dark:text-gray-100">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="mb-2 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">

                  <History className="h-6 w-6" />

                </div>

                <span className="text-sm font-semibold uppercase tracking-wider text-indigo-100">
                  Account Activity
                </span>

              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Purchases History
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-indigo-100 sm:text-base">
                View and retrieve all your airtime,
                data, electricity, cable TV, exam PIN
                and NIN purchases in one place.
              </p>

            </div>

            <div className="rounded-xl bg-white/10 px-5 py-4 backdrop-blur-sm">

              <p className="text-xs text-indigo-100">
                Total Purchases
              </p>

              <p className="mt-1 text-2xl font-bold">
                {purchases.length}
              </p>

            </div>

          </div>

        </div>

        {/* =====================================================
            SEARCH + FILTERS
        ===================================================== */}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">

          <div className="relative">

            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search by service, provider or reference..."
              className="
                w-full
                rounded-xl
                border
                border-gray-200
                bg-gray-50
                py-3
                pl-12
                pr-4
                text-sm
                text-gray-900
                outline-none
                transition
                placeholder:text-gray-400
                focus:border-indigo-500
                focus:bg-white
                focus:ring-2
                focus:ring-indigo-100
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-gray-100
                dark:placeholder:text-gray-500
                dark:focus:border-indigo-500
                dark:focus:bg-slate-800
                dark:focus:ring-indigo-500/20
              "
            />

          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">

            {serviceFilters.map(
              (item) => {

                const Icon = item.icon;

                const active =
                  filter === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setFilter(item.value)
                    }
                    className={`
                      flex
                      shrink-0
                      items-center
                      gap-2
                      rounded-xl
                      px-4
                      py-2.5
                      text-sm
                      font-semibold
                      transition
                      ${
                        active
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
                      }
                    `}
                  >

                    <Icon className="h-4 w-4" />

                    {item.label}

                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* =====================================================
            PURCHASE TABLE
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          {loading ? (

            <div className="flex min-h-[350px] items-center justify-center">

              <div className="text-center">

                <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />

                <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Loading your purchases...
                </p>

              </div>

            </div>

          ) : filteredPurchases.length === 0 ? (

            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">

                <ReceiptText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />

              </div>

              <h2 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
                No purchases found
              </h2>

              <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">

                {search
                  ? "No purchase matches your search."
                  : "Your completed purchases will appear here."}

              </p>

            </div>

          ) : (

            <>

              {/* =================================================
                  DESKTOP TABLE
              ================================================= */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-slate-800 dark:bg-slate-800/70">

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Service
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Provider
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Amount
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Status
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Date
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">

                    {filteredPurchases.map(
                      (purchase) => {

                        const Icon =
                          getIcon(
                            purchase.type
                          );

                        return (

                          <tr
                            key={`${purchase.type}-${purchase.id}`}
                            className="transition hover:bg-gray-50 dark:hover:bg-slate-800/50"
                          >

                            <td className="px-6 py-4">

                              <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">

                                  <Icon className="h-5 w-5" />

                                </div>

                                <div>

                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {getServiceName(
                                      purchase.type
                                    )}
                                  </p>

                                  <p className="max-w-[220px] truncate text-xs text-gray-500 dark:text-gray-400">
                                    {purchase.description}
                                  </p>

                                </div>

                              </div>

                            </td>

                            <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                              {purchase.provider || "—"}
                            </td>

                            <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                              {formatMoney(
                                purchase.amount
                              )}
                            </td>

                            <td className="px-6 py-4">

                              <span
                                className={`
                                  inline-flex
                                  rounded-full
                                  px-3
                                  py-1
                                  text-xs
                                  font-bold
                                  ${getStatusClass(
                                    purchase.status
                                  )}
                                `}
                              >
                                {purchase.status}
                              </span>

                            </td>

                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(
                                purchase.createdAt
                              )}
                            </td>

                            <td className="px-6 py-4 text-right">

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedPurchase(
                                    purchase
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                              >

                                <Eye className="h-4 w-4" />

                                View

                              </button>

                            </td>

                          </tr>

                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

              {/* =================================================
                  MOBILE
              ================================================= */}

              <div className="divide-y divide-gray-100 dark:divide-slate-800 md:hidden">

                {filteredPurchases.map(
                  (purchase) => {

                    const Icon =
                      getIcon(
                        purchase.type
                      );

                    return (

                      <button
                        key={`${purchase.type}-${purchase.id}`}
                        type="button"
                        onClick={() =>
                          setSelectedPurchase(
                            purchase
                          )
                        }
                        className="block w-full p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      >

                        <div className="flex items-start gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">

                            <Icon className="h-5 w-5" />

                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-3">

                              <div>

                                <p className="font-bold text-gray-900 dark:text-white">
                                  {getServiceName(
                                    purchase.type
                                  )}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                  {purchase.provider}
                                </p>

                              </div>

                              <p className="shrink-0 font-bold text-gray-900 dark:text-white">
                                {formatMoney(
                                  purchase.amount
                                )}
                              </p>

                            </div>

                            <div className="mt-3 flex items-center justify-between">

                              <span
                                className={`
                                  rounded-full
                                  px-2.5
                                  py-1
                                  text-[11px]
                                  font-bold
                                  ${getStatusClass(
                                    purchase.status
                                  )}
                                `}
                              >
                                {purchase.status}
                              </span>

                              <span className="text-xs text-gray-400">
                                {formatDate(
                                  purchase.createdAt
                                )}
                              </span>

                            </div>

                          </div>

                        </div>

                      </button>

                    );
                  }
                )}

              </div>

            </>

          )}

        </div>

      </div>

      {/* =======================================================
          DETAILS MODAL
      ======================================================= */}

      {selectedPurchase && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

            {/* MODAL HEADER */}

            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">

              <div>

                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Purchase Details
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getServiceName(
                    selectedPurchase.type
                  )}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPurchase(null)
                }
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >

                <X className="h-5 w-5" />

              </button>

            </div>

            <div className="space-y-5 p-5">

              {/* AMOUNT */}

              <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-500/10">

                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  Amount
                </p>

                <p className="mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-300">
                  {formatMoney(
                    selectedPurchase.amount
                  )}
                </p>

              </div>

              {/* GENERAL DETAILS */}

              <div className="space-y-3">

                <DetailRow
                  label="Service"
                  value={getServiceName(
                    selectedPurchase.type
                  )}
                />

                <DetailRow
                  label="Provider"
                  value={
                    selectedPurchase.provider ||
                    "—"
                  }
                />

                <DetailRow
                  label="Status"
                  value={
                    selectedPurchase.status
                  }
                />

                <DetailRow
                  label="Reference"
                  value={
                    selectedPurchase.reference
                  }
                  copyable
                  onCopy={() =>
                    copyText(
                      selectedPurchase.reference,
                      "reference"
                    )
                  }
                  copied={
                    copied === "reference"
                  }
                />

                <DetailRow
                  label="Date"
                  value={formatDate(
                    selectedPurchase.createdAt
                  )}
                />

                <DetailRow
                  label="Description"
                  value={
                    selectedPurchase.description
                  }
                />

              </div>

              {/* =================================================
                  EXAM PIN
              ================================================= */}

              {selectedPurchase.type ===
                "EXAM_PIN" &&
                selectedPurchase.details && (

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">

                    <div className="mb-4 flex items-center gap-2">

                      <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

                      <h3 className="font-bold text-gray-900 dark:text-white">
                        Exam PIN Details
                      </h3>

                    </div>

                    <div className="space-y-3">

                      <DetailRow
                        label="PIN"
                        value={
                          selectedPurchase
                            .details.pin
                        }
                        copyable
                        onCopy={() =>
                          copyText(
                            selectedPurchase
                              .details.pin,
                            "pin"
                          )
                        }
                        copied={
                          copied === "pin"
                        }
                      />

                      <DetailRow
                        label="Serial Number"
                        value={
                          selectedPurchase
                            .details.serial
                        }
                        copyable
                        onCopy={() =>
                          copyText(
                            selectedPurchase
                              .details.serial,
                            "serial"
                          )
                        }
                        copied={
                          copied === "serial"
                        }
                      />

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          `exam-pin-${selectedPurchase.reference}.txt`,
                          `Brainfriend Global Tech - Exam PIN\n\nProvider: ${selectedPurchase.provider}\nPIN: ${selectedPurchase.details.pin}\nSerial: ${selectedPurchase.details.serial}\nReference: ${selectedPurchase.reference}\nDate: ${formatDate(selectedPurchase.createdAt)}`
                        )
                      }
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                    >

                      <Download className="h-4 w-4" />

                      Download PIN Details

                    </button>

                  </div>

                )}

              {/* =================================================
                  NIN
              ================================================= */}

              {selectedPurchase.type ===
                "NIN" &&
                selectedPurchase.details && (

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">

                    <div className="mb-4 flex items-center gap-2">

                      <Fingerprint className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

                      <h3 className="font-bold text-gray-900 dark:text-white">
                        NIN Verification Details
                      </h3>

                    </div>

                    <div className="space-y-3">

                      <DetailRow
                        label="NIN"
                        value={
                          selectedPurchase
                            .details.nin
                        }
                        copyable
                        onCopy={() =>
                          copyText(
                            selectedPurchase
                              .details.nin,
                            "nin"
                          )
                        }
                        copied={
                          copied === "nin"
                        }
                      />

                      <DetailRow
                        label="Card Type"
                        value={
                          selectedPurchase
                            .details.cardType
                        }
                      />

                      <DetailRow
                        label="Full Name"
                        value={
                          [
                            selectedPurchase
                              .details
                              .firstName,

                            selectedPurchase
                              .details
                              .middleName,

                            selectedPurchase
                              .details
                              .surname,
                          ]
                            .filter(Boolean)
                            .join(" ") || "—"
                        }
                      />

                      <DetailRow
                        label="Gender"
                        value={
                          selectedPurchase
                            .details.gender ||
                          "—"
                        }
                      />

                      <DetailRow
                        label="Date of Birth"
                        value={
                          selectedPurchase
                            .details.birthDate ||
                          "—"
                        }
                      />

                      <DetailRow
                        label="Telephone"
                        value={
                          selectedPurchase
                            .details.telephone ||
                          "—"
                        }
                      />

                      {selectedPurchase
                        .details
                        .transactionId && (

                        <DetailRow
                          label="Transaction ID"
                          value={
                            selectedPurchase
                              .details
                              .transactionId
                          }
                          copyable
                          onCopy={() =>
                            copyText(
                              selectedPurchase
                                .details
                                .transactionId,
                              "transactionId"
                            )
                          }
                          copied={
                            copied ===
                            "transactionId"
                          }
                        />

                      )}

                    </div>

                    {/* PHOTO */}

                    {selectedPurchase
                      .details.photo && (

                      <div className="mt-5">

                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Verification Photo
                        </p>

                        <img
                          src={
                            selectedPurchase
                              .details.photo
                          }
                          alt="NIN verification"
                          className="max-h-64 w-full rounded-xl border border-gray-200 bg-white object-contain dark:border-slate-700 dark:bg-slate-800"
                        />

                      </div>

                    )}

                    {/* PDF */}

                    {selectedPurchase
                      .details.hasPdf && (

                      <button
                        type="button"
                        onClick={() => {

                          window.open(
                            `/api/verification/nin/${selectedPurchase.id}/pdf`,
                            "_blank"
                          );

                        }}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >

                        <Download className="h-4 w-4" />

                        Retrieve NIN Document

                      </button>

                    )}

                    {/* DOWNLOAD DETAILS */}

                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          `nin-verification-${selectedPurchase.reference}.txt`,
                          `Brainfriend Global Tech - NIN Verification\n\nNIN: ${selectedPurchase.details.nin}\nCard Type: ${selectedPurchase.details.cardType}\nName: ${[
                            selectedPurchase
                              .details
                              .firstName,

                            selectedPurchase
                              .details
                              .middleName,

                            selectedPurchase
                              .details
                              .surname,
                          ]
                            .filter(Boolean)
                            .join(" ")}\nGender: ${selectedPurchase.details.gender || ""}\nDate of Birth: ${selectedPurchase.details.birthDate || ""}\nTelephone: ${selectedPurchase.details.telephone || ""}\nReference: ${selectedPurchase.reference}\nDate: ${formatDate(selectedPurchase.createdAt)}`
                        )
                      }
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >

                      <Download className="h-4 w-4" />

                      Download Verification Details

                    </button>

                  </div>

                )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

/* =============================================================
   DETAIL ROW
============================================================= */

function DetailRow({
  label,
  value,
  copyable = false,
  onCopy,
  copied = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">

      <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2 text-right">

        <span className="break-all text-sm font-semibold text-gray-900 dark:text-gray-100">
          {value || "—"}
        </span>

        {copyable && value && (

          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-500 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            title="Copy"
          >

            {copied ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}

          </button>

        )}

      </div>

    </div>
  );
}