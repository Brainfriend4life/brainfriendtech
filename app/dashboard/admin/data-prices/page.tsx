"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Search,
  Pencil,
  Save,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Power,
} from "lucide-react";

type DataPlan = {
  id: string;
  provider: string;
  network?: string;
  bundleId: number;
  name: string;
  size: string;
  duration: string;
  providerPrice: number;
  sellingPrice: number;
  status: string;
};

const PROVIDERS = ["ALL", "CheapDataHub", "NetworkDataSub", "SMEPlug"];

export default function AdminDataPricesPage() {
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [providerFilter, setProviderFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<DataPlan | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPlans() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (providerFilter !== "ALL") {
        params.set("provider", providerFilter);
      }

      /*
       * Do not send the search term to the API.
       * We load the provider's plans and perform the
       * search locally so network searches like MTN,
       * AIRTEL, GLO and 9MOBILE work consistently.
       */
      const response = await fetch(
        `/api/admin/data-plans?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load data plans.");
      }

      setPlans(Array.isArray(result.plans) ? result.plans : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load data plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, [providerFilter]);

  async function savePlan() {
    if (!editing) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/admin/data-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editing),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save plan.");
      }

      setMessage(result.message);

      setEditing(null);

      await loadPlans();
    } catch (err: any) {
      setError(err?.message || "Failed to save data plan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(plan: DataPlan) {
    try {
      setError("");
      setMessage("");

      const response = await fetch("/api/admin/data-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...plan,
          status: plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update status.");
      }

      setMessage(result.message);

      await loadPlans();
    } catch (err: any) {
      setError(err?.message || "Failed to update status.");
    }
  }

  /*
   * Normalize values before searching.
   * This makes:
   *
   * MTN
   * mtn
   * Mtn
   *
   * all behave the same.
   */
  function normalizeSearchValue(value: unknown) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  const filteredPlans = useMemo(() => {
    const query = normalizeSearchValue(search);

    if (!query) {
      return plans;
    }

    return plans.filter((plan) => {
      const searchableFields = [
        plan.provider,
        plan.network,
        plan.name,
        plan.size,
        plan.duration,
        String(plan.bundleId),
      ];

      return searchableFields.some((value) =>
        normalizeSearchValue(value).includes(query),
      );
    });
  }, [plans, search]);

  function money(value: number) {
    return `₦${Number(value || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <div className="min-h-full space-y-6 bg-gray-50 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-0">
      <div className="pl-14 lg:pl-0">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          Admin Panel
        </p>

        <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Data Prices
            </h1>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage selling prices for CheapDataHub, NetworkDataSub and
              SMEPlug.
            </p>
          </div>

          <button
            onClick={loadPlans}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr]">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950"
          >
            {PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider === "ALL" ? "All Providers" : provider}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plan, network, size or bundle ID..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
              <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Data Plans
              </h2>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredPlans.length} plan
                {filteredPlans.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Loading data plans...
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No data plans found.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredPlans.map((plan) => {
              const belowCost =
                Number(plan.sellingPrice) < Number(plan.providerPrice);

              return (
                <div
                  key={plan.id}
                  className="p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                          {plan.provider}
                        </span>

                        {plan.network && (
                          <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                            {plan.network}
                          </span>
                        )}

                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                            plan.status === "ACTIVE"
                              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {plan.status}
                        </span>

                        {belowCost && (
                          <span className="flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Below Cost
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900 dark:text-white">
                        {plan.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {plan.size} • {plan.duration}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Bundle ID: {plan.bundleId}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:min-w-[520px]">
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Provider Cost
                        </p>

                        <p className="mt-1 font-bold text-gray-900 dark:text-white">
                          {money(plan.providerPrice)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Selling Price
                        </p>

                        <p className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {money(plan.sellingPrice)}
                        </p>
                      </div>

                      <div className="col-span-2 flex gap-2 sm:col-span-1">
                        <button
                          onClick={() =>
                            setEditing({
                              ...plan,
                            })
                          }
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          onClick={() => toggleStatus(plan)}
                          title={
                            plan.status === "ACTIVE" ? "Deactivate" : "Activate"
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Edit Data Plan
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editing.provider} • {editing.name}
                </p>
              </div>

              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">
                    Provider
                  </label>

                  <input
                    value={editing.provider}
                    disabled
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500">
                    Bundle ID
                  </label>

                  <input
                    type="number"
                    value={editing.bundleId}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        bundleId: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Plan Name
                </label>

                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      name: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">
                    Size
                  </label>

                  <input
                    value={editing.size}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        size: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500">
                    Duration
                  </label>

                  <input
                    value={editing.duration}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        duration: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Provider Cost
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={editing.providerPrice}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      providerPrice: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Selling Price
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={editing.sellingPrice}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sellingPrice: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-xl border-2 border-indigo-500 bg-white px-4 py-3 text-lg font-bold outline-none dark:bg-gray-950"
                />

                {editing.sellingPrice < editing.providerPrice && (
                  <div className="mt-2 flex gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Selling price is below provider cost. This plan may generate
                    a loss.
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Status
                </label>

                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-200 p-5 dark:border-gray-800">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>

              <button
                onClick={savePlan}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />

                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
