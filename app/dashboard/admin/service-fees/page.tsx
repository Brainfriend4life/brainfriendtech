
"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Percent,
  Save,
  Settings,
} from "lucide-react";

export default function ServiceFeePage() {
  const [percentage, setPercentage] =
    useState("5");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadFee();
  }, []);

  async function readApiResponse(
    response: Response
  ) {
    const text =
      await response.text();

    let data: any = null;

    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Server returned an error (${response.status}).`
      );
    }

    if (!data) {
      throw new Error(
        "Server returned an empty response."
      );
    }

    return data;
  }

  async function loadFee() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/admin/service-fees",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const data =
        await readApiResponse(
          response
        );

      if (
        data?.success !== true
      ) {
        throw new Error(
          data?.message ||
            "Unable to load service fee."
        );
      }

      setPercentage(
        String(
          data?.percentage ?? 5
        )
      );
    } catch (error) {
      console.error(
        "LOAD SERVICE FEE ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load service fee."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveFee() {
    setError("");
    setMessage("");

    const value =
      Number(percentage);

    if (
      !Number.isFinite(value)
    ) {
      setError(
        "Enter a valid percentage."
      );
      return;
    }

    if (
      value < 0 ||
      value > 100
    ) {
      setError(
        "Service fee must be between 0% and 100%."
      );
      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/admin/service-fees",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              percentage: value,
            }),
          }
        );

      const data =
        await readApiResponse(
          response
        );

      if (
        data?.success !== true
      ) {
        throw new Error(
          data?.message ||
            "Unable to update service fee."
        );
      }

      setPercentage(
        String(
          data?.percentage ?? value
        )
      );

      setMessage(
        `Service fee updated to ${
          data?.percentage ?? value
        }%.`
      );
    } catch (error) {
      console.error(
        "SAVE SERVICE FEE ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update service fee."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-indigo-600">
          Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          Service Fee
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Configure the percentage added to
          your digital services.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
            <Settings className="h-6 w-6 text-indigo-600" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Global Service Fee
            </h2>

            <p className="text-sm text-gray-500">
              This fee is added to the provider
              cost before charging the customer.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Service Fee Percentage
          </label>

          <div className="relative">
            <Percent className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={percentage}
              disabled={
                loading ||
                saving
              }
              onChange={(event) =>
                setPercentage(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-gray-300 py-3 pl-12 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
            />
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Example: 5% means a ₦1,000 provider
            cost becomes ₦1,050 for the customer.
          </p>
        </div>

        <button
          type="button"
          onClick={saveFee}
          disabled={
            loading ||
            saving
          }
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-5 w-5" />

          {saving
            ? "Saving..."
            : "Save Service Fee"}
        </button>
      </div>

      <div className="max-w-2xl rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
            <Settings className="h-5 w-5 text-indigo-600" />
          </div>

          <div>
            <h3 className="font-semibold text-indigo-900">
              How it works
            </h3>

            <p className="mt-1 text-sm leading-6 text-indigo-800">
              Provider cost + service fee =
              customer payment. The service fee
              becomes Brainfriend Tech profit and
              is recorded in the business revenue
              and business wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

