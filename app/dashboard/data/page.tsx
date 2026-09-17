"use client";

import { useEffect, useMemo, useState } from "react";
import TransactionPinModal from "@/components/TransactionPinModal";
import { Wifi, ShieldCheck } from "lucide-react";

type DataPlan = {
  id: string;
  provider: string;

  bundleId?: number;
  bundle_id?: number;

  planId?: number | string;
  plan_id?: number | string;

  apiPlanId?: number | string;
  api_plan_id?: number | string;

  dataPlanId?: number | string;
  data_plan_id?: number | string;

  networkId?: number;

  name: string;
  size: string;
  duration: string;

  providerPrice: number;
  sellingPrice?: number;

  status: string;
  isAvailable?: boolean;
};

type ServerType = "CHEAPDATAHUB" | "NETWORKDATASUB" | "SMEPLUG";

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

const SERVERS: Array<{
  value: ServerType;
  label: string;
}> = [
  {
    value: "CHEAPDATAHUB",
    label: "Server 1",
  },
  {
    value: "NETWORKDATASUB",
    label: "Server 2",
  },
  {
    value: "SMEPLUG",
    label: "Server 3",
  },
];

const NETWORK_ACCENT: Record<string, string> = {
  MTN: "border-l-yellow-500",
  AIRTEL: "border-l-red-500",
  GLO: "border-l-green-600",
  "9MOBILE": "border-l-emerald-500",
};

function networkAccent(network: string) {
  return NETWORK_ACCENT[network.toUpperCase()] || "border-l-indigo-500";
}

function planIsAvailable(plan: DataPlan) {
  return plan.isAvailable !== false;
}

export default function BuyDataPage() {
  // ============================================================
  // SERVER
  // ============================================================

  const [server, setServer] = useState<ServerType>("NETWORKDATASUB");

  // ============================================================
  // PLANS
  // ============================================================

  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [networkDataPlans, setNetworkDataPlans] = useState<DataPlan[]>([]);
  const [smePlugPlans, setSmePlugPlans] = useState<DataPlan[]>([]);

  // ============================================================
  // FORM
  // ============================================================

  const [network, setNetwork] = useState("");
  const [planId, setPlanId] = useState("");
  const [phone, setPhone] = useState("");

  // ============================================================
  // SERVICE FEE
  // ============================================================

  const [serviceFeePercent, setServiceFeePercent] = useState(5);

  const [loadingFee, setLoadingFee] = useState(true);

  // ============================================================
  // LOADING
  // ============================================================

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingNetworkPlans, setLoadingNetworkPlans] = useState(false);
  const [loadingSmePlugPlans, setLoadingSmePlugPlans] = useState(false);
  const [buying, setBuying] = useState(false);

  // ============================================================
  // MESSAGES
  // ============================================================

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ============================================================
  // PIN
  // ============================================================

  const [showPinModal, setShowPinModal] = useState(false);

  // ============================================================
  // FORMAT PRICE
  // ============================================================

  function formatPrice(value: number) {
    return Number(value || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ============================================================
  // CLEAN PHONE
  // ============================================================

  function cleanPhone(value: string) {
    return value.replace(/\s+/g, "").replace(/-/g, "");
  }

  // ============================================================
  // CUSTOMER PRICE
  // ============================================================

  function getCustomerPrice(plan: DataPlan) {
    const sellingPrice = Number(plan.sellingPrice);

    if (Number.isFinite(sellingPrice) && sellingPrice > 0) {
      return sellingPrice;
    }

    const providerPrice = Number(plan.providerPrice);

    return Number.isFinite(providerPrice) ? providerPrice : 0;
  }

  // ============================================================
  // LOAD CHEAPDATAHUB PLANS
  // ============================================================

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);

        const response = await fetch("/api/data-plans", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load data plans.");
        }

        setPlans(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load data plans.",
        );
      } finally {
        setLoadingPlans(false);
      }
    }

    loadPlans();
  }, []);

  // ============================================================
  // LOAD NETWORKDATASUB PLANS
  // ============================================================

  async function loadNetworkDataPlans() {
    try {
      setLoadingNetworkPlans(true);
      setError("");

      const response = await fetch("/api/networkdata/data-plans", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load data plans.");
      }

      const receivedPlans: DataPlan[] = Array.isArray(result.data)
        ? result.data
        : [];

      setNetworkDataPlans(receivedPlans);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load data plans.",
      );
    } finally {
      setLoadingNetworkPlans(false);
    }
  }

  // ============================================================
  // LOAD SMEPLUG PLANS
  // ============================================================

  async function loadSmePlugPlans() {
    try {
      setLoadingSmePlugPlans(true);
      setError("");

      const response = await fetch("/api/smeplug/data-plans", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load data plans.");
      }

      const receivedPlans: DataPlan[] = Array.isArray(result.data)
        ? result.data
        : [];

      setSmePlugPlans(receivedPlans);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load data plans.",
      );
    } finally {
      setLoadingSmePlugPlans(false);
    }
  }

  // ============================================================
  // LOAD PLANS WHEN SERVER CHANGES
  // ============================================================

  useEffect(() => {
    if (server === "NETWORKDATASUB" && networkDataPlans.length === 0) {
      loadNetworkDataPlans();
    }

    if (server === "SMEPLUG" && smePlugPlans.length === 0) {
      loadSmePlugPlans();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, networkDataPlans.length, smePlugPlans.length]);

  // ============================================================
  // LOAD SERVICE FEE
  // ============================================================

  useEffect(() => {
    async function loadServiceFee() {
      try {
        setLoadingFee(true);

        const response = await fetch("/api/settings/service-fee", {
          cache: "no-store",
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const percentage = Number(result.percentage);

          if (Number.isFinite(percentage) && percentage >= 0) {
            setServiceFeePercent(percentage);
          }
        }
      } catch (err) {
        console.error("SERVICE FEE ERROR:", err);
      } finally {
        setLoadingFee(false);
      }
    }

    loadServiceFee();
  }, []);

  // ============================================================
  // CURRENT PLANS
  // ============================================================

  const currentPlans = useMemo(() => {
    if (server === "NETWORKDATASUB") {
      return networkDataPlans;
    }

    if (server === "SMEPLUG") {
      return smePlugPlans;
    }

    return plans;
  }, [server, networkDataPlans, smePlugPlans, plans]);

  // ============================================================
  // FILTER PLANS
  // ============================================================

  const filteredPlans = useMemo(() => {
    if (!network) {
      return [];
    }

    const selectedNetwork = network.trim().toUpperCase();

    const matches = currentPlans.filter(
      (plan) => String(plan.provider).trim().toUpperCase() === selectedNetwork,
    );

    return [...matches].sort((a, b) => {
      const aAvailable = planIsAvailable(a) ? 0 : 1;

      const bAvailable = planIsAvailable(b) ? 0 : 1;

      return aAvailable - bAvailable;
    });
  }, [currentPlans, network]);

  // ============================================================
  // SELECTED PLAN
  // ============================================================

  const selectedPlan = useMemo(() => {
    if (!planId) {
      return undefined;
    }

    return currentPlans.find((plan) => String(plan.id) === String(planId));
  }, [currentPlans, planId]);

  // ============================================================
  // NETWORKDATASUB PURCHASE ID
  // ============================================================

  const networkDataSubPurchaseId = useMemo(() => {
    if (!selectedPlan) {
      return null;
    }

    const rawProviderId =
      selectedPlan.apiPlanId ??
      selectedPlan.api_plan_id ??
      selectedPlan.planId ??
      selectedPlan.plan_id ??
      selectedPlan.dataPlanId ??
      selectedPlan.data_plan_id ??
      selectedPlan.bundleId ??
      selectedPlan.bundle_id ??
      null;

    if (
      rawProviderId === null ||
      rawProviderId === undefined ||
      rawProviderId === ""
    ) {
      return null;
    }

    const numericId = Number(rawProviderId);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }

    return numericId;
  }, [selectedPlan]);

  // ============================================================
  // SMEPLUG PURCHASE ID
  // ============================================================

  const smePlugPurchaseId = useMemo(() => {
    if (!selectedPlan) {
      return null;
    }

    const rawProviderId = selectedPlan.planId ?? selectedPlan.plan_id ?? null;

    if (
      rawProviderId === null ||
      rawProviderId === undefined ||
      rawProviderId === ""
    ) {
      return null;
    }

    return rawProviderId;
  }, [selectedPlan]);

  // ============================================================
  // SMEPLUG NETWORK ID
  // ============================================================

  const smePlugNetworkId = useMemo(() => {
    if (!selectedPlan) {
      return null;
    }

    const numericId = Number(selectedPlan.networkId);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }

    return numericId;
  }, [selectedPlan]);

  // ============================================================
  // DATA PRICE
  // ============================================================

  const dataPrice = useMemo(() => {
    if (!selectedPlan) {
      return 0;
    }

    return getCustomerPrice(selectedPlan);
  }, [selectedPlan]);

  // ============================================================
  // SERVICE FEE
  // ============================================================

  const serviceFee = useMemo(() => {
    if (!selectedPlan) {
      return 0;
    }

    const percentage = Number(serviceFeePercent) || 0;

    return Number((dataPrice * (percentage / 100)).toFixed(2));
  }, [selectedPlan, dataPrice, serviceFeePercent]);

  // ============================================================
  // CUSTOMER TOTAL
  // ============================================================

  const customerTotal = useMemo(() => {
    if (!selectedPlan) {
      return 0;
    }

    return Number((dataPrice + serviceFee).toFixed(2));
  }, [selectedPlan, dataPrice, serviceFee]);

  // ============================================================
  // SERVER CHANGE
  // ============================================================

  function handleServerChange(value: ServerType) {
    if (buying) {
      return;
    }

    setServer(value);
    setNetwork("");
    setPlanId("");
    setError("");
    setMessage("");
  }

  // ============================================================
  // NETWORK CHANGE
  // ============================================================

  function handleNetworkChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setNetwork(e.target.value);
    setPlanId("");
    setError("");
    setMessage("");
  }

  // ============================================================
  // BUY VALIDATION
  // ============================================================

  function handleBuyData(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!network) {
      setError("Please select a network.");
      return;
    }

    if (!planId) {
      setError("Please select a data plan.");
      return;
    }

    if (!selectedPlan) {
      setError("Please select a valid data plan.");
      return;
    }

    if (!planIsAvailable(selectedPlan)) {
      setError("This plan is currently unavailable. Please pick another.");
      return;
    }

    const cleanedPhone = cleanPhone(phone);

    if (!cleanedPhone) {
      setError("Please enter phone number.");
      return;
    }

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      setError("Please enter a valid Nigerian phone number.");
      return;
    }

    if (server === "NETWORKDATASUB" && !networkDataSubPurchaseId) {
      setError("This plan is temporarily unavailable. Please pick another.");
      return;
    }

    if (server === "SMEPLUG" && (!smePlugPurchaseId || !smePlugNetworkId)) {
      setError("This plan is temporarily unavailable. Please pick another.");
      return;
    }

    if (customerTotal <= 0) {
      setError("Invalid data plan price.");
      return;
    }

    setShowPinModal(true);
  }

  // ============================================================
  // PROCESS PURCHASE
  // ============================================================

  async function processBuyData(pin: string) {
    if (!selectedPlan) {
      setError("Please select a valid data plan.");
      return;
    }

    if (!planIsAvailable(selectedPlan)) {
      setError("This plan is currently unavailable. Please pick another.");
      return;
    }

    const cleanedPhone = cleanPhone(phone);

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      setError("Invalid Nigerian phone number.");
      return;
    }

    setBuying(true);
    setError("");
    setMessage("");

    try {
      // ========================================================
      // NETWORKDATASUB
      // ========================================================

      if (server === "NETWORKDATASUB") {
        if (!networkDataSubPurchaseId) {
          throw new Error("This plan is temporarily unavailable.");
        }

        const purchaseBody = {
          server: "NETWORKDATASUB",
          data_plan_id: networkDataSubPurchaseId,
          phone_number: cleanedPhone,
          transactionPin: pin,
        };

        const response = await fetch("/api/data/purchase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(purchaseBody),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Data purchase failed.");
        }

        const chargedAmount = Number(result.amount);

        setMessage(
          `Data purchase successful. You were charged ₦${formatPrice(
            Number.isFinite(chargedAmount) ? chargedAmount : customerTotal,
          )}.`,
        );

        setPhone("");
        setPlanId("");

        if (Number.isFinite(Number(result.serviceFeePercentage))) {
          setServiceFeePercent(Number(result.serviceFeePercentage));
        }

        return;
      }

      // ========================================================
      // SMEPLUG
      // ========================================================

      if (server === "SMEPLUG") {
        if (!smePlugPurchaseId || !smePlugNetworkId) {
          throw new Error("This plan is temporarily unavailable.");
        }

        const purchaseBody = {
          server: "SMEPLUG",
          network_id: smePlugNetworkId,
          plan_id: smePlugPurchaseId,
          phone_number: cleanedPhone,
          transactionPin: pin,
        };

        const response = await fetch("/api/data/purchase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(purchaseBody),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Data purchase failed.");
        }

        const chargedAmount = Number(result.amount);

        setMessage(
          `Data purchase successful. You were charged ₦${formatPrice(
            Number.isFinite(chargedAmount) ? chargedAmount : customerTotal,
          )}.`,
        );

        setPhone("");
        setPlanId("");

        if (Number.isFinite(Number(result.serviceFeePercentage))) {
          setServiceFeePercent(Number(result.serviceFeePercentage));
        }

        return;
      }

      // ========================================================
      // CHEAPDATAHUB
      // ========================================================

      const bundleId = Number(selectedPlan.bundleId ?? selectedPlan.bundle_id);

      if (!Number.isInteger(bundleId) || bundleId <= 0) {
        throw new Error("This plan is temporarily unavailable.");
      }

      const purchaseBody = {
        server: "CHEAPDATAHUB",
        bundle_id: bundleId,
        phone_number: cleanedPhone,
        transactionPin: pin,
      };

      const response = await fetch("/api/data/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Data purchase failed.");
      }

      const chargedAmount = Number(result.amount);

      setMessage(
        `Data purchase successful. You were charged ₦${formatPrice(
          Number.isFinite(chargedAmount) ? chargedAmount : customerTotal,
        )}.`,
      );

      setPhone("");
      setPlanId("");

      if (Number.isFinite(Number(result.serviceFeePercentage))) {
        setServiceFeePercent(Number(result.serviceFeePercentage));
      }
    } catch (err) {
      console.error("DATA PURCHASE ERROR:", err);

      setError(err instanceof Error ? err.message : "Data purchase failed.");
    } finally {
      setBuying(false);
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  const loadingCurrentPlans =
    server === "NETWORKDATASUB"
      ? loadingNetworkPlans
      : server === "SMEPLUG"
        ? loadingSmePlugPlans
        : loadingPlans;

  const currentServerLabel =
    SERVERS.find((item) => item.value === server)?.label || "Server 1";

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="w-full">
      {/* HEADER */}

      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
          Data Bundles
        </p>

        <h1 className="mt-0.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Buy Data
        </h1>

        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Select your network, plan and recipient number.
        </p>
      </div>

      {/* MAIN CARD */}

      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 sm:p-5">
          {/* ERROR */}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {message && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />

              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleBuyData}>
            {/* SERVER */}

            <div className="mb-4">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Server
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {SERVERS.map((item, index) => {
                  const active = server === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={buying}
                      onClick={() => handleServerChange(item.value)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-semibold transition ${
                        active
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                          : "border-border bg-background text-foreground hover:border-indigo-300 hover:bg-muted/60"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <span>Server {index + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NETWORK */}

            <div className="mb-4">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Network
              </label>

              <select
                value={network}
                onChange={handleNetworkChange}
                disabled={loadingCurrentPlans || buying}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select network</option>

                {NETWORKS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* DATA PLAN */}

            <div className="mb-4">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Data Plan
              </label>

              <select
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  setError("");
                  setMessage("");
                }}
                disabled={!network || loadingCurrentPlans || buying}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {loadingCurrentPlans
                    ? "Loading plans..."
                    : filteredPlans.length === 0
                      ? "No plans available"
                      : "Select a plan"}
                </option>

                {filteredPlans.map((plan) => {
                  const displayPrice = getCustomerPrice(plan);

                  const available = planIsAvailable(plan);

                  return (
                    <option
                      key={String(plan.id)}
                      value={String(plan.id)}
                      disabled={!available}
                    >
                      {plan.size || plan.name}
                      {plan.duration ? ` — ${plan.duration}` : ""}
                      {" — ₦"}
                      {formatPrice(displayPrice)}
                      {!available ? " (Unavailable)" : ""}
                    </option>
                  );
                })}
              </select>

              {selectedPlan && !planIsAvailable(selectedPlan) && (
                <p className="mt-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                  This plan is currently unavailable.
                </p>
              )}
            </div>

            {/* ORDER SUMMARY */}

            {selectedPlan && (
              <div
                className={`mb-4 rounded-lg border border-border border-l-[3px] bg-muted/40 px-3.5 py-3 ${networkAccent(
                  selectedPlan.provider,
                )} ${
                  !planIsAvailable(selectedPlan) ? "opacity-50 grayscale" : ""
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Order Summary
                  </span>

                  <span className="text-[10px] font-bold text-foreground">
                    {String(selectedPlan.provider).toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Data</span>

                    <span className="font-medium text-foreground">
                      {selectedPlan.size}
                    </span>
                  </div>

                  {selectedPlan.duration && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Duration</span>

                      <span className="font-medium text-foreground">
                        {selectedPlan.duration}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Data Price</span>

                    <span className="font-medium text-foreground">
                      ₦{formatPrice(dataPrice)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Service Fee</span>

                    <span className="font-medium text-foreground">
                      {loadingFee
                        ? "Loading..."
                        : `${serviceFeePercent}% — ₦${formatPrice(serviceFee)}`}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="font-semibold text-foreground">Total</span>

                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                      ₦{formatPrice(customerTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PHONE */}

            <div className="mb-5">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Phone Number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  setPhone(value.slice(0, 11));
                }}
                maxLength={11}
                inputMode="numeric"
                placeholder="08012345678"
                disabled={buying}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* BUY BUTTON */}

            <button
              type="submit"
              disabled={
                buying ||
                loadingCurrentPlans ||
                !selectedPlan ||
                !planIsAvailable(selectedPlan)
              }
              className="h-10 w-full rounded-lg bg-gradient-to-b from-indigo-600 to-indigo-700 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:from-indigo-500 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {buying
                ? "Processing..."
                : selectedPlan && !planIsAvailable(selectedPlan)
                  ? "Unavailable"
                  : selectedPlan
                    ? `Buy Data — ₦${formatPrice(customerTotal)}`
                    : "Buy Data"}
            </button>
          </form>
        </div>

        {/* FOOTER */}

        <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
          <Wifi className="h-3.5 w-3.5 text-muted-foreground" />

          <p className="text-[11px] text-muted-foreground">
            Delivered instantly via {currentServerLabel}.
          </p>
        </div>

        {/* TRANSACTION PIN */}

        <TransactionPinModal
          open={showPinModal}
          onClose={() => {
            if (!buying) {
              setShowPinModal(false);
            }
          }}
          onSuccess={(pin) => {
            setShowPinModal(false);
            processBuyData(pin);
          }}
        />
      </div>
    </div>
  );
}
