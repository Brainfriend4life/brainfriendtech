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
};

type ServerType = "CHEAPDATAHUB" | "NETWORKDATASUB" | "SMEPLUG";

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

// Internal-only — never rendered. Kept solely so engineers reading
// this file can tell which backend a given server number maps to.
const SERVERS: Array<{ value: ServerType; label: string }> = [
  { value: "CHEAPDATAHUB", label: "Server 1" },
  { value: "NETWORKDATASUB", label: "Server 2" },
  { value: "SMEPLUG", label: "Server 3" },
];

// Network brand accents — subtle, single-color underline rather
// than a loud badge, to keep the interface feeling composed.
const NETWORK_ACCENT: Record<string, string> = {
  MTN: "border-l-yellow-500",
  AIRTEL: "border-l-red-500",
  GLO: "border-l-green-600",
  "9MOBILE": "border-l-emerald-500",
};

function networkAccent(network: string) {
  return NETWORK_ACCENT[network.toUpperCase()] || "border-l-indigo-500";
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
  // GET CUSTOMER SELLING PRICE
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
          err instanceof Error ? err.message : "Unable to load data plans."
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
        err instanceof Error ? err.message : "Unable to load data plans."
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
        err instanceof Error ? err.message : "Unable to load data plans."
      );
    } finally {
      setLoadingSmePlugPlans(false);
    }
  }

  // ============================================================
  // LOAD PLANS WHEN SERVER SELECTED
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
    if (server === "NETWORKDATASUB") return networkDataPlans;
    if (server === "SMEPLUG") return smePlugPlans;
    return plans;
  }, [server, networkDataPlans, smePlugPlans, plans]);

  // ============================================================
  // FILTER PLANS BY NETWORK
  // ============================================================

  const filteredPlans = useMemo(() => {
    if (!network) {
      return [];
    }

    const selectedNetwork = network.trim().toUpperCase();

    return currentPlans.filter(
      (plan) =>
        String(plan.provider).trim().toUpperCase() === selectedNetwork
    );
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
  // NETWORKDATASUB PROVIDER PLAN ID
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
  // SMEPLUG PROVIDER PLAN ID + NETWORK ID
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
  // CUSTOMER DATA PRICE
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(purchaseBody),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Data purchase failed.");
        }

        const chargedAmount = Number(result.amount);

        setMessage(
          `Data purchase successful. You were charged ₦${formatPrice(
            Number.isFinite(chargedAmount) ? chargedAmount : customerTotal
          )}.`
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(purchaseBody),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Data purchase failed.");
        }

        const chargedAmount = Number(result.amount);

        setMessage(
          `Data purchase successful. You were charged ₦${formatPrice(
            Number.isFinite(chargedAmount) ? chargedAmount : customerTotal
          )}.`
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

      const bundleId = Number(
        selectedPlan.bundleId ?? selectedPlan.bundle_id
      );

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(purchaseBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Data purchase failed.");
      }

      setMessage("Data purchase successful.");

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
    SERVERS.find((item) => item.value === server)?.label ?? "Server 1";

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="w-full">
      {/* HEADER */}

      <div className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Data Bundles
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Buy Data
        </h1>

        <p className="mt-1.5 text-sm text-muted-foreground sm:text-[15px]">
          Select a server, network and plan for the recipient number.
        </p>
      </div>

      {/* MAIN CARD */}

      <div className="max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
        <div className="p-5 sm:p-7">
          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {message && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleBuyData}>
            {/* SERVER */}

            <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Server
            </label>

            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-2.5">
              {SERVERS.map((item, index) => {
                const active = server === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={buying}
                    onClick={() => handleServerChange(item.value)}
                    className={`group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3.5 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "border-indigo-600 bg-indigo-600 shadow-sm shadow-indigo-600/20"
                        : "border-border bg-background hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/10"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <span
                      className={`text-xs font-semibold ${
                        active ? "text-white" : "text-foreground"
                      }`}
                    >
                      Server {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* NETWORK */}

            <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Network
            </label>

            <select
              value={network}
              onChange={handleNetworkChange}
              disabled={loadingCurrentPlans || buying}
              className="mb-6 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Select network</option>

              {NETWORKS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {/* DATA PLAN */}

            <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
              className="mb-6 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
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

                return (
                  <option key={String(plan.id)} value={String(plan.id)}>
                    {plan.size || plan.name}
                    {plan.duration ? ` — ${plan.duration}` : ""}
                    {" — ₦"}
                    {formatPrice(displayPrice)}
                  </option>
                );
              })}
            </select>

            {/* PLAN DETAILS */}

            {selectedPlan && (
              <div
                className={`mb-6 rounded-xl border-l-[3px] bg-muted/60 p-4 ${networkAccent(
                  selectedPlan.provider
                )}`}
              >
                <div className="mb-3.5 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Order Summary
                  </h3>

                  <span className="text-xs font-bold text-foreground">
                    {String(selectedPlan.provider).toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Data</span>

                    <strong className="text-right text-foreground">
                      {selectedPlan.size}
                    </strong>
                  </div>

                  {selectedPlan.duration && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Duration</span>

                      <strong className="text-right text-foreground">
                        {selectedPlan.duration}
                      </strong>
                    </div>
                  )}

                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Data Price</span>

                    <strong className="text-right text-foreground">
                      ₦{formatPrice(dataPrice)}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Service Fee</span>

                    <strong className="text-right text-foreground">
                      {loadingFee
                        ? "Loading..."
                        : `${serviceFeePercent}% — ₦${formatPrice(
                            serviceFee
                          )}`}
                    </strong>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3.5">
                    <span className="text-sm font-semibold text-foreground">
                      Total
                    </span>

                    <strong className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                      ₦{formatPrice(customerTotal)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* PHONE */}

            <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
              className="mb-7 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            {/* BUY BUTTON */}

            <button
              type="submit"
              disabled={buying || loadingCurrentPlans || !selectedPlan}
              className="w-full rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:from-indigo-500 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-base"
            >
              {buying
                ? "Processing..."
                : selectedPlan
                ? `Buy Data — ₦${formatPrice(customerTotal)}`
                : "Buy Data"}
            </button>
          </form>
        </div>

        {/* FOOTER STRIP */}

        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:px-7">
          <Wifi className="h-3.5 w-3.5 text-muted-foreground" />

          <p className="text-xs text-muted-foreground">
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