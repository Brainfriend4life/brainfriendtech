"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RecordItem = {
  id: string;
  service: string;
  reference: string;
  amount: number;
  status: string;
  createdAt: string;
  result: unknown;
  recordType?: string;
};

function getPdfUrl(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;

  const data = result as Record<string, unknown>;
  const statusCheck =
    data.status_check && typeof data.status_check === "object"
      ? (data.status_check as Record<string, unknown>)
      : {};

  for (const url of [
    data.pdf_url,
    data.download_url,
    statusCheck.pdf_url,
    statusCheck.download_url,
  ]) {
    if (
      typeof url === "string" &&
      url.startsWith("https://ageverify.com.ng/")
    ) {
      return url;
    }
  }

  return null;
}

export default function AgeVerifyDownloads() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDocuments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/verification/history", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load your documents.");
      }

      setRecords(
        (data.records || []).filter(
          (record: RecordItem) => record.recordType !== "document-download",
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load your documents.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/nin/ageverify"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              &larr; Back to NIN Verification
            </Link>
            <h1 className="mt-4 text-2xl font-bold">NIN Document Downloads</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Access PDF documents returned from your previous AgeVerify
              verification requests. No additional download charge applies.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDocuments}
            disabled={loading}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">
            Loading your verification documents...
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="font-semibold">No verification records yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your completed AgeVerify requests and available documents will
              appear here.
            </p>
            <Link
              href="/dashboard/nin/ageverify"
              className="mt-4 inline-block font-semibold text-primary hover:underline"
            >
              Start NIN verification
            </Link>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Document</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const pdfUrl = getPdfUrl(record.result);

                  return (
                    <tr
                      key={record.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-4 font-medium">
                        {record.service}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {record.reference}
                      </td>
                      <td className="px-4 py-4">{record.status}</td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        {pdfUrl ? (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-primary hover:underline"
                          >
                            Open / Download PDF
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No PDF available
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Only documents returned and saved by AgeVerify can be downloaded here.
          A new verification request may be required if no document link was
          returned.
        </p>
      </div>
    </main>
  );
}
