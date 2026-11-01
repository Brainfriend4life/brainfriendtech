"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Field = {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  options?: string[];
};

const SLIP_TYPES = ["regular", "standard", "premium"];

const FORMS: Record<
  string,
  { title: string; description: string; fields: Field[] }
> = {
  nin: {
    title: "NIN Verification",
    description: "Verify an 11-digit National Identification Number.",
    fields: [
      { name: "nin", label: "NIN", placeholder: "Enter 11-digit NIN" },
      {
        name: "slip_type",
        label: "Slip Type",
        placeholder: "Select slip type",
        options: SLIP_TYPES,
      },
    ],
  },
  "nin-phone": {
    title: "NIN Phone Search",
    description: "Search identity information using a registered phone number.",
    fields: [
      {
        name: "phone_number",
        label: "Phone Number",
        placeholder: "08012345678",
      },
      {
        name: "slip_type",
        label: "Slip Type",
        placeholder: "Select slip type",
        options: SLIP_TYPES,
      },
    ],
  },
  "nin-demo": {
    title: "NIN Demographic Search",
    description: "Search using demographic information. Premium is required.",
    fields: [
      {
        name: "first_name",
        label: "First Name",
        placeholder: "Enter first name",
      },
      { name: "last_name", label: "Last Name", placeholder: "Enter last name" },
      { name: "dob", label: "Date of Birth", placeholder: "", type: "date" },
      {
        name: "gender",
        label: "Gender",
        placeholder: "Select gender",
        options: ["m", "f"],
      },
    ],
  },
  bvn: {
    title: "BVN Verification",
    description: "Verify an 11-digit Bank Verification Number.",
    fields: [
      { name: "bvn", label: "BVN", placeholder: "Enter 11-digit BVN" },
      {
        name: "slip_type",
        label: "Slip Type",
        placeholder: "Select slip type",
        options: ["standard", "premium"],
      },
    ],
  },
  "nin-validation": {
    title: "NIN Validation",
    description: "Submit a NIN validation request.",
    fields: [
      { name: "nin", label: "NIN", placeholder: "Enter 11-digit NIN" },
      {
        name: "validation_type",
        label: "Validation Type",
        placeholder: "Select validation type",
        options: [
          "No record found",
          "Photography error",
          "Mod validation",
          "SIM validation",
          "Bank validation",
        ],
      },
    ],
  },
  "nin-validation-v2": {
    title: "NIN Validation V2",
    description: "Submit one NIN per request for validation.",
    fields: [
      {
        name: "nins",
        label: "NIN",
        placeholder: "Enter 11-digit NIN",
      },
      {
        name: "validation_type",
        label: "Validation Type",
        placeholder: "Select validation type",
        options: [
          "No record found",
          "Photography error",
          "Mod validation",
          "SIM validation",
          "Bank validation",
        ],
      },
    ],
  },
  personalization: {
    title: "NIN Personalization",
    description: "Submit a personalization request using its tracking ID.",
    fields: [
      {
        name: "tracking_id",
        label: "Tracking ID",
        placeholder: "Enter tracking ID",
      },
      {
        name: "slip_type",
        label: "Slip Type",
        placeholder: "Select slip type",
        options: SLIP_TYPES,
      },
    ],
  },
  "ipe-clearance": {
    title: "IPE Clearance",
    description: "Enter the tracking ID to clear. One ID per request.",
    fields: [
      {
        name: "tracking_ids",
        label: "Tracking ID",
        placeholder: "Enter tracking ID",
      },
    ],
  },
  "bvn-crm": {
    title: "BVN CRM",
    description: "Submit your CRM ticket details and enrollment screenshot.",
    fields: [
      { name: "ticket_id", label: "Ticket ID", placeholder: "Enter ticket ID" },
      { name: "batch_id", label: "Batch ID", placeholder: "Enter batch ID" },
      {
        name: "enrollment_screenshot",
        label: "Enrollment Screenshot",
        placeholder: "",
        type: "file",
      },
    ],
  },
  "modification-ipe": {
    title: "Modification IPE",
    description: "Submit an IPE modification request.",
    fields: [
      {
        name: "tracking_id",
        label: "Tracking ID",
        placeholder: "Enter tracking ID",
      },
      {
        name: "type",
        label: "Modification Type",
        placeholder: "Select type",
        options: ["Name", "Date of Birth", "Address", "Other"],
      },
    ],
  },
  "bvn-retrieval": {
    title: "BVN Retrieval",
    description: "Submit a BVN retrieval request using the person's details.",
    fields: [
      { name: "full_name", label: "Full Name", placeholder: "Enter full name" },
      {
        name: "phone_number",
        label: "Phone Number",
        placeholder: "Enter registered phone number",
      },
    ],
  },
  "ipe-special": {
    title: "IPE Special",
    description:
      "Enter the 15-character tracking ID and select the IPE type. One ID per request.",
    fields: [
      {
        name: "ipe_type",
        label: "IPE Type",
        placeholder: "Select IPE type",
        options: ["hit", "ready_abis", "blocked"],
      },
      {
        name: "tracking_ids",
        label: "Tracking ID",
        placeholder: "Enter 15-character tracking ID",
      },
    ],
  },
};

const STATUS_TEXT: Record<string, string> = {
  PROCESSING:
    "Processing. This can take a while, and the status updates automatically.",
  COMPLETED: "Completed",
  FAILED: "Failed. Your wallet has been refunded.",
};

export default function AgeVerifyForm({ service }: { service: string }) {
  const config = FORMS[service];
  const [values, setValues] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState("");
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/verify/prices", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load prices");
        return response.json();
      })
      .then((data) => {
        if (active) setPrices(data.prices || {});
      })
      .catch(() => {
        if (active) setPrices({});
      })
      .finally(() => {
        if (active) setPricesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // BVN has its own price key. The NIN-tier price is only a fallback, and it
  // must match what getAgeVerifyPriceKey charges on the server.
  const currentPrice =
    service === "nin-phone"
      ? values.slip_type
        ? prices[`nin-phone-${values.slip_type}`]
        : null
      : service === "bvn"
        ? (prices.bvn ??
          (values.slip_type ? prices[`nin-${values.slip_type}`] : null))
        : service === "nin"
          ? values.slip_type
            ? prices[`nin-${values.slip_type}`]
            : null
          : prices[service];

  if (!config) return <p>Unknown verification service.</p>;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitLock.current) return;

    submitLock.current = true;
    setLoading(true);
    setError("");
    setResult(null);

    const fail = (message: string) => {
      setError(message);
      setLoading(false);
      submitLock.current = false;
    };

    if (!/^\d{4}$/.test(pin)) {
      fail("Enter your 4-digit transaction PIN.");
      return;
    }

    // The provider bills per ID, so only one ID is accepted per request.
    if (
      ["ipe-clearance", "ipe-special", "nin-validation-v2"].includes(service)
    ) {
      const key = service === "nin-validation-v2" ? "nins" : "tracking_ids";
      const items = (values[key] || "")
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (items.length !== 1) {
        fail("Please submit one ID per request.");
        return;
      }

      if (service === "ipe-special" && items[0].length !== 15) {
        fail("The tracking ID must be exactly 15 characters.");
        return;
      }

      if (service === "nin-validation-v2" && !/^\d{11}$/.test(items[0])) {
        fail("Enter a valid 11-digit NIN.");
        return;
      }
    }

    const payload: Record<string, any> = { ...values };

    if (service === "nin" || service === "bvn") {
      payload.number = service === "nin" ? values.nin : values.bvn;
      payload.service = service;
      delete payload.nin;
      delete payload.bvn;
    }

    if (service === "nin-phone") {
      payload.service = "phone";
      payload.number = values.phone_number;
      delete payload.phone_number;
    }

    if (service === "nin-demo") {
      payload.service = "demographic";
      payload.slip_type = "premium";

      // The date input gives YYYY-MM-DD; the provider expects DD-MM-YYYY.
      const [year, month, day] = String(values.dob || "").split("-");
      if (year && month && day) {
        payload.dob = `${day}-${month}-${year}`;
      }
    }

    if (["ipe-clearance", "ipe-special"].includes(service)) {
      payload.tracking_ids = values.tracking_ids
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (service === "nin-validation-v2") {
      payload.nins = values.nins
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (service === "modification-ipe") {
      const typeMap: Record<string, string> = {
        Name: "name",
        "Date of Birth": "dob",
        Address: "address",
        Other: "other",
      };
      payload.type = typeMap[values.type] || values.type;
    }

    try {
      if (!idempotencyKey.current) {
        idempotencyKey.current = crypto.randomUUID();
      }

      const requestKey = idempotencyKey.current;
      let response: Response;

      if (service === "bvn-crm") {
        if (!file) {
          throw new Error("Please select the enrollment screenshot.");
        }

        const formData = new FormData();
        formData.append("payload", JSON.stringify(payload));
        formData.append("pin", pin);
        formData.append("enrollment_screenshot", file);

        response = await fetch(`/api/verify/${service}`, {
          method: "POST",
          headers: { "Idempotency-Key": requestKey },
          body: formData,
        });
      } else {
        response = await fetch(`/api/verify/${service}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestKey,
          },
          body: JSON.stringify({ payload, pin }),
        });
      }

      const data = await response.json();

      if (response.status < 500) {
        idempotencyKey.current = null;
      }

      if (!response.ok && response.status !== 202) {
        setError(data.error || "Verification request failed.");
      } else {
        setResult(data);
        setValues({});
        setFile(null);
        setPin("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to contact the verification service.",
      );
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  }

  const checkStatus = async () => {
    const reference = result?.reference;
    if (!reference) return;

    setCheckingStatus(true);
    setError("");

    try {
      const response = await fetch("/api/verify/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to check status.");
        return;
      }

      setResult((previous: any) => ({ ...previous, ...data }));
    } catch {
      setError("Unable to connect while checking status.");
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-primary hover:underline"
      >
        &larr; Back to Dashboard
      </Link>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <h1 className="text-xl font-bold text-foreground">{config.title}</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {config.description}
        </p>

        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground">Verification Price</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {pricesLoading
              ? "Loading price..."
              : currentPrice == null
                ? "Price unavailable"
                : `₦${currentPrice.toLocaleString("en-NG")}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {config.fields.some((field) => field.name === "slip_type") &&
            service !== "nin-demo"
              ? "Price updates automatically when you select a slip type."
              : "This is the current configured price for this service."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          {config.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label
                htmlFor={field.name}
                className="text-sm font-medium text-foreground"
              >
                {field.label}
              </label>

              {field.options ? (
                <select
                  id={field.name}
                  required
                  value={values[field.name] || ""}
                  onChange={(e) =>
                    setValues((old) => ({
                      ...old,
                      [field.name]: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {field.name === "gender"
                        ? option === "m"
                          ? "Male"
                          : "Female"
                        : option}
                    </option>
                  ))}
                </select>
              ) : field.type === "file" ? (
                <input
                  id={field.name}
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                />
              ) : (
                <input
                  id={field.name}
                  type={field.type || "text"}
                  required
                  maxLength={
                    ["nin", "bvn", "nins"].includes(field.name) ? 11 : undefined
                  }
                  value={values[field.name] || ""}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    setValues((old) => ({
                      ...old,
                      [field.name]: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                />
              )}
            </div>
          ))}

          <div className="space-y-2">
            <label
              htmlFor="transaction-pin"
              className="text-sm font-medium text-foreground"
            >
              Transaction PIN
            </label>
            <input
              id="transaction-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              required
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="Enter your 4-digit PIN"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading || pricesLoading || currentPrice == null}
            className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Submitting..."
              : currentPrice == null
                ? "Price unavailable"
                : "Submit Verification"}
          </button>
        </form>
      </section>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">
            {result.status === "COMPLETED"
              ? "Request Completed"
              : "Request Submitted"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Reference: {result.reference}
          </p>
          <p className="text-sm text-muted-foreground">
            Status: {STATUS_TEXT[result.status] ?? result.status}
          </p>

          {result.status === "PROCESSING" && (
            <button
              type="button"
              onClick={checkStatus}
              disabled={checkingStatus}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {checkingStatus ? "Checking..." : "Check Status"}
            </button>
          )}

          {result.download_path && (
            <a
              href={result.download_path}
              className="block text-sm font-semibold text-primary hover:underline"
            >
              Download document
            </a>
          )}

          <Link
            href="/dashboard/verification/ageverify/history"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View Verification History &rarr;
          </Link>
        </section>
      )}
    </main>
  );
}
