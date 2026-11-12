"use client";

import { useState } from "react";

type BatchResponse = {
  sent?: number;
  nextOffset: number;
  total: number;
  done: boolean;
  error?: string;
};

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30";

export default function BroadcastPage() {
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>(
    "Hi {name},\n\nYour message here.\n\nThanks!",
  );
  const [testEmail, setTestEmail] = useState<string>("");
  const [startFrom, setStartFrom] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">(
    "info",
  );
  const [busy, setBusy] = useState<boolean>(false);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function show(text: string, type: "info" | "success" | "error" = "info") {
    setStatus(text);
    setStatusType(type);
  }

  async function sendTest() {
    setBusy(true);
    try {
      await call({ mode: "test", testEmail });
      show("Test email sent. Check your inbox.", "success");
    } catch (e) {
      show(
        "Test failed: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    }
    setBusy(false);
  }

  async function sendAll() {
    if (!confirm("Send this email to ALL users? This cannot be undone."))
      return;
    setBusy(true);
    let offset = Number(startFrom) || 0;
    try {
      while (true) {
        const data: BatchResponse = await call({ mode: "batch", offset });
        offset = data.nextOffset;
        show(`Sent ${Math.min(offset, data.total)} of ${data.total}`, "info");
        if (data.done) {
          show(`Done. Sent to ${data.total} users.`, "success");
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      show(
        `Stopped at user #${offset}: ${msg}. To resume, set "Start from" to ${offset}.`,
        "error",
      );
    }
    setBusy(false);
  }

  const statusClass =
    statusType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
      : statusType === "error"
        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
        : "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Email all users
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Send an announcement to all active users.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Subject
            </label>
            <input
              className={fieldClass}
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Message
            </label>
            <textarea
              className={`${fieldClass} min-h-[220px] resize-y`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Use {"{name}"} to insert each user&apos;s first name. Leave a
              blank line between paragraphs.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Send a test first
            </label>
            <div className="flex gap-2">
              <input
                className={fieldClass}
                placeholder="Your email for test"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !subject || !testEmail}
                onClick={sendTest}
                className="shrink-0 rounded-lg border border-indigo-600 px-5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
              >
                Send test
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start from user # (leave 0 for a fresh send)
            </label>
            <input
              className={fieldClass}
              type="number"
              min={0}
              value={startFrom}
              onChange={(e) => setStartFrom(Number(e.target.value))}
            />
          </div>

          <button
            type="button"
            disabled={busy || !subject || !message}
            onClick={sendAll}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {busy ? "Sending..." : "Send to all users"}
          </button>

          {status && (
            <p
              className={`rounded-lg border px-4 py-3 text-sm ${statusClass}`}
            >
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}