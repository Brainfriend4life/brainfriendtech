"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Loader2,
  Percent,
  Save,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function ReferralSettingsPage() {
  const [percentage, setPercentage] =
    useState("5");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/referral/settings",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load referral settings"
        );
      }

      setPercentage(
        String(data.percentage ?? 5)
      );
    } catch (error) {
      console.error(
        "LOAD REFERRAL SETTINGS ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setMessage("");
    setError("");

    const value = Number(percentage);

    if (!Number.isFinite(value)) {
      setError(
        "Please enter a valid referral percentage."
      );
      return;
    }

    if (value < 0 || value > 100) {
      setError(
        "Referral percentage must be between 0% and 100%."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/referral/settings",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            percentage: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to update referral percentage"
        );
      }

      setPercentage(
        String(data.percentage)
      );

      setMessage(
        "Referral percentage updated successfully."
      );
    } catch (error) {
      console.error(
        "SAVE REFERRAL SETTINGS ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update referral percentage"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/admin/referral"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-indigo-600" />

                  <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    Referral Settings
                  </h1>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your referral reward percentage.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              <ShieldCheck className="h-4 w-4" />

              Admin Only
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />

              <span>
                Loading referral settings...
              </span>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* SETTINGS CARD */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Percent className="h-6 w-6" />
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  Referral Reward Percentage
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Set the percentage of an eligible
                  transaction that will be credited to
                  the referring user as referral earnings.
                </p>
              </div>

              {/* SUCCESS MESSAGE */}

              {message && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                  <span>{message}</span>
                </div>
              )}

              {/* ERROR MESSAGE */}

              {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="max-w-md">
                <label
                  htmlFor="referralPercentage"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Referral Percentage
                </label>

                <div className="relative">
                  <input
                    id="referralPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={percentage}
                    onChange={(event) =>
                      setPercentage(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-lg font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="5"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    %
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Enter a value from 0% to 100%.
                </p>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />

                      Save Referral Percentage
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PREVIEW CARD */}

            <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <Gift className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Reward Preview
                  </h3>

                  <p className="text-xs text-slate-500">
                    Example calculation
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Transaction amount
                </p>

                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  ₦1,000
                </p>

                <div className="my-5 h-px bg-slate-200" />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Referral rate
                  </span>

                  <span className="font-bold text-indigo-600">
                    {percentage || "0"}%
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Referral reward
                  </span>

                  <span className="text-lg font-extrabold text-emerald-600">
                    ₦
                    {(
                      1000 *
                      (Number(percentage) || 0) /
                      100
                    ).toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs leading-5 text-indigo-700">
                  This setting applies to{" "}
                  <strong>new referral earnings</strong>.
                  Existing referral earnings keep the
                  percentage that was recorded when they
                  were created.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}