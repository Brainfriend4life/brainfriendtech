"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Clock3, FileDown, History,
  RefreshCw, ShieldCheck,
} from "lucide-react";

type RecordItem = {
  id: string;
  service: string;
  reference: string;
  amount: number;
  status: string;
  refunded: boolean;
  createdAt: string;
  result: unknown;
  recordType?: "verification" | "document-download";
};

function getDocumentUrl(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;

  const data = result as Record<string, unknown>;
  const candidates = [data.pdf_url, data.download_url];

  return (
    candidates.find(
      (url): url is string =>
        typeof url === "string" &&
        url.startsWith("https://ageverify.com.ng/")
    ) ?? null
  );
}

function statusStyle(status: string) {
  switch (status.toUpperCase()) {
    case "SUCCESS":
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-600";
    case "FAILED":
    case "REJECTED":
      return "bg-red-500/10 text-red-600";
    case "PROCESSING":
    case "PENDING":
      return "bg-amber-500/10 text-amber-600";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function AgeVerifyHistoryPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/verification/history", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load history.");
        }

        if (active) setRecords(data.records || []);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Verification History
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Track your previous AgeVerify requests.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Total records
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {loading ? "—" : records.length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Completed requests
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-600">
            {loading
              ? "—"
              : records.filter((r) =>
                  ["SUCCESS", "COMPLETED"].includes(r.status.toUpperCase())
                ).length}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading verification history...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-sm font-semibold text-foreground">
            No verification requests yet
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your previous requests will appear here.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Browse services
          </Link>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Recent activity
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Your verification transactions
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
              {records.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-muted/40">
                <tr className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Document</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => {
                  const documentUrl = getDocumentUrl(record.result);

                  return (
                    <tr
                      key={record.id}
                      className="border-t border-border/70 text-xs transition hover:bg-muted/30"
                    >
                      <td className="px-3 py-3 font-semibold text-foreground">
                        {record.service}
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-[10px] font-medium text-indigo-600">
                          {record.recordType === "document-download"
                            ? "Document"
                            : "Verification"}
                        </span>
                      </td>

                      <td className="max-w-[150px] truncate px-3 py-3 text-muted-foreground">
                        {record.reference}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground">
                        ₦{Number(record.amount).toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyle(record.status)}`}>
                            {record.status}
                          </span>
                          {record.refunded && (
                            <span className="text-[10px] font-semibold text-emerald-600">
                              Refunded
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-[11px] text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString()}
                      </td>

                      <td className="px-3 py-3">
                        {documentUrl ? (
                          <a
                            href={documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            PDF
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-4 py-2.5 text-[10px] text-muted-foreground">
            Showing all available records.
          </div>
        </div>
      )}
    </main>
  );
}
