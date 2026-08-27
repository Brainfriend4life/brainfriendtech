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
    <div className="space-y-6 text-gray-900 dark:text-gray-100">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div>
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Service Fee
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Configure the percentage added to
          your digital services.
        </p>
      </div>

      {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* =====================================================
          SUCCESS MESSAGE
      ===================================================== */}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
          {message}
        </div>
      )}

      {/* =====================================================
          SERVICE FEE CARD
      ===================================================== */}

      <div className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">

        {/* CARD HEADER */}

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
            <Settings className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Global Service Fee
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              This fee is added to the provider
              cost before charging the customer.
            </p>
          </div>

        </div>

        {/* ===================================================
            INPUT
        =================================================== */}

        <div className="mt-6">

          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Service Fee Percentage
          </label>

          <div className="relative">

            <Percent className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />

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
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20 dark:disabled:bg-gray-800"
            />

          </div>

          <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
            Example: 5% means a ₦1,000 provider
            cost becomes ₦1,050 for the customer.
          </p>

        </div>

        {/* ===================================================
            SAVE BUTTON
        =================================================== */}

        <button
          type="button"
          onClick={saveFee}
          disabled={
            loading ||
            saving
          }
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-900"
        >
          <Save className="h-5 w-5" />

          {saving
            ? "Saving..."
            : "Save Service Fee"}
        </button>

      </div>

      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}

      <div className="max-w-2xl rounded-2xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30">

        <div className="flex items-start gap-3">

          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-900">
            <Settings className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div>

            <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">
              How it works
            </h3>

            <p className="mt-1 text-sm leading-6 text-indigo-800 dark:text-indigo-200">
              Provider cost + service fee =
              customer payment. The service fee
              becomes Brainfriend Global Tech profit and
              is recorded in the business revenue
              and business wallet.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}