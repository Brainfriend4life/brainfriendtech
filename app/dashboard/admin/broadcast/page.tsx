"use client";

import { useState, CSSProperties } from "react";

type BatchResponse = {
  sent?: number;
  nextOffset: number;
  total: number;
  done: boolean;
  error?: string;
};

export default function BroadcastPage() {
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>(
    "Hi {name},\n\nYour message here.\n\nThanks!",
  );
  const [testEmail, setTestEmail] = useState<string>("");
  const [startFrom, setStartFrom] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
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

  async function sendTest() {
    setBusy(true);
    try {
      await call({ mode: "test", testEmail });
      setStatus("Test email sent. Check your inbox.");
    } catch (e) {
      setStatus("Test failed: " + (e instanceof Error ? e.message : String(e)));
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
        setStatus(`Sent ${Math.min(offset, data.total)} of ${data.total}`);
        if (data.done) {
          setStatus(`Done. Sent to ${data.total} users.`);
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(
        `Stopped at user #${offset}: ${msg}. To resume, set "Start from" to ${offset}.`,
      );
    }
    setBusy(false);
  }

  const box: CSSProperties = {
    width: "100%",
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 6,
    marginBottom: 12,
  };

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Email all users
      </h1>

      <input
        style={box}
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      <textarea
        style={{ ...box, minHeight: 220 }}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <p
        style={{ fontSize: 13, color: "#666", marginTop: -6, marginBottom: 16 }}
      >
        Use {"{name}"} to insert each user&apos;s first name. Leave a blank line
        between paragraphs.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          style={{ ...box, marginBottom: 0 }}
          placeholder="Your email for test"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
        />
        <button
          disabled={busy || !subject || !testEmail}
          onClick={sendTest}
          style={{
            padding: "0 18px",
            border: "1px solid #111",
            borderRadius: 6,
          }}
        >
          Send test
        </button>
      </div>

      <label style={{ fontSize: 13 }}>
        Start from user # (leave 0 for a fresh send)
      </label>
      <input
        style={box}
        type="number"
        value={startFrom}
        onChange={(e) => setStartFrom(Number(e.target.value))}
      />

      <button
        disabled={busy || !subject || !message}
        onClick={sendAll}
        style={{
          width: "100%",
          padding: 12,
          background: "#111",
          color: "#fff",
          borderRadius: 6,
          fontWeight: 700,
        }}
      >
        {busy ? "Sending..." : "Send to all users"}
      </button>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </div>
  );
}
