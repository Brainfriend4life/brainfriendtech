
"use client";

import { useEffect, useMemo, useState } from "react";
import TransactionPinModal from "@/components/TransactionPinModal";

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

  name: string;
  size: string;
  duration: string;

  providerPrice: number;
  sellingPrice?: number;

  status: string;
};

type ServerType = "CHEAPDATAHUB" | "NETWORKDATASUB";

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

export default function BuyDataPage() {
  // ============================================================
  // SERVER
  // ============================================================

  const [server, setServer] =
    useState<ServerType>("NETWORKDATASUB");

  // ============================================================
  // PLANS
  // ============================================================

  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [networkDataPlans, setNetworkDataPlans] =
    useState<DataPlan[]>([]);

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
  const [loadingNetworkPlans, setLoadingNetworkPlans] =
    useState(false);
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

    if (
      Number.isFinite(sellingPrice) &&
      sellingPrice > 0
    ) {
      return sellingPrice;
    }

    const providerPrice = Number(plan.providerPrice);

    return Number.isFinite(providerPrice)
      ? providerPrice
      : 0;
  }

  // ============================================================
  // LOAD SERVER 1 PLANS
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
          throw new Error(
            result.message ||
              "Unable to load data plans."
          );
        }

        setPlans(
          Array.isArray(result.data)
            ? result.data
            : []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load data plans."
        );
      } finally {
        setLoadingPlans(false);
      }
    }

    loadPlans();
  }, []);

  // ============================================================
  // LOAD SERVER 2 PLANS
  // ============================================================

  async function loadNetworkDataPlans() {
    try {
      setLoadingNetworkPlans(true);
      setError("");

      const response = await fetch(
        "/api/networkdata/data-plans",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load data plans."
        );
      }

      const receivedPlans: DataPlan[] =
        Array.isArray(result.data)
          ? result.data
          : [];

      setNetworkDataPlans(receivedPlans);

      console.log(
        "DATA PLANS LOADED:",
        receivedPlans
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load data plans."
      );
    } finally {
      setLoadingNetworkPlans(false);
    }
  }

  // ============================================================
  // LOAD SERVER 2 WHEN SELECTED
  // ============================================================

  useEffect(() => {
    if (
      server === "NETWORKDATASUB" &&
      networkDataPlans.length === 0
    ) {
      loadNetworkDataPlans();
    }
  }, [
    server,
    networkDataPlans.length,
  ]);

  // ============================================================
  // LOAD SERVICE FEE
  // ============================================================

  useEffect(() => {
    async function loadServiceFee() {
      try {
        setLoadingFee(true);

        const response = await fetch(
          "/api/settings/service-fee",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          const percentage = Number(
            result.percentage
          );

          if (
            Number.isFinite(percentage) &&
            percentage >= 0
          ) {
            setServiceFeePercent(
              percentage
            );
          }
        }
      } catch (err) {
        console.error(
          "SERVICE FEE ERROR:",
          err
        );
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
    return server === "NETWORKDATASUB"
      ? networkDataPlans
      : plans;
  }, [
    server,
    networkDataPlans,
    plans,
  ]);

  // ============================================================
  // FILTER PLANS BY NETWORK
  // ============================================================

  const filteredPlans = useMemo(() => {
    if (!network) {
      return [];
    }

    const selectedNetwork =
      network.trim().toUpperCase();

    return currentPlans.filter(
      (plan) =>
        String(plan.provider)
          .trim()
          .toUpperCase() ===
        selectedNetwork
    );
  }, [
    currentPlans,
    network,
  ]);

  // ============================================================
  // SELECTED PLAN
  // ============================================================

  const selectedPlan = useMemo(() => {
    if (!planId) {
      return undefined;
    }

    return currentPlans.find(
      (plan) =>
        String(plan.id) ===
        String(planId)
    );
  }, [
    currentPlans,
    planId,
  ]);

  // ============================================================
  // SERVER 2 PROVIDER PLAN ID
  // ============================================================

  const networkDataSubPurchaseId =
    useMemo(() => {
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

      const numericId =
        Number(rawProviderId);

      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {
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

    return getCustomerPrice(
      selectedPlan
    );
  }, [selectedPlan]);

  // ============================================================
  // SERVICE FEE
  // ============================================================

  const serviceFee = useMemo(() => {
    if (!selectedPlan) {
      return 0;
    }

    const percentage =
      Number(serviceFeePercent) || 0;

    return Number(
      (
        dataPrice *
        (percentage / 100)
      ).toFixed(2)
    );
  }, [
    selectedPlan,
    dataPrice,
    serviceFeePercent,
  ]);

  // ============================================================
  // CUSTOMER TOTAL
  // ============================================================

  const customerTotal = useMemo(() => {
    if (!selectedPlan) {
      return 0;
    }

    return Number(
      (
        dataPrice +
        serviceFee
      ).toFixed(2)
    );
  }, [
    selectedPlan,
    dataPrice,
    serviceFee,
  ]);

  // ============================================================
  // SERVER CHANGE
  // ============================================================

  function handleServerChange(
    value: ServerType
  ) {
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

  function handleNetworkChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    setNetwork(e.target.value);
    setPlanId("");
    setError("");
    setMessage("");
  }

  // ============================================================
  // BUY VALIDATION
  // ============================================================

  function handleBuyData(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!network) {
      setError(
        "Please select a network."
      );
      return;
    }

    if (!planId) {
      setError(
        "Please select a data plan."
      );
      return;
    }

    if (!selectedPlan) {
      setError(
        "Please select a valid data plan."
      );
      return;
    }

    const cleanedPhone =
      cleanPhone(phone);

    if (!cleanedPhone) {
      setError(
        "Please enter phone number."
      );
      return;
    }

    if (
      !/^0\d{10}$/.test(
        cleanedPhone
      )
    ) {
      setError(
        "Please enter a valid Nigerian phone number."
      );
      return;
    }

    if (
      server === "NETWORKDATASUB" &&
      !networkDataSubPurchaseId
    ) {
      setError(
        "This data plan is currently unavailable."
      );
      return;
    }

    if (customerTotal <= 0) {
      setError(
        "Invalid data plan price."
      );
      return;
    }

    setShowPinModal(true);
  }

  // ============================================================
  // PROCESS PURCHASE
  // ============================================================

  async function processBuyData(
    pin: string
  ) {
    if (!selectedPlan) {
      setError(
        "Please select a valid data plan."
      );
      return;
    }

    const cleanedPhone =
      cleanPhone(phone);

    if (
      !/^0\d{10}$/.test(
        cleanedPhone
      )
    ) {
      setError(
        "Invalid Nigerian phone number."
      );
      return;
    }

    setBuying(true);
    setError("");
    setMessage("");

    try {
      // ========================================================
      // SERVER 2
      // ========================================================

      if (
        server === "NETWORKDATASUB"
      ) {
        if (
          !networkDataSubPurchaseId
        ) {
          throw new Error(
            "Invalid data plan."
          );
        }

        const purchaseBody = {
          server:
            "NETWORKDATASUB",

          data_plan_id:
            networkDataSubPurchaseId,

          phone_number:
            cleanedPhone,

          transactionPin:
            pin,
        };

        console.log(
          "DATA PURCHASE",
          {
            localPlanId:
              selectedPlan.id,

            providerPlanId:
              networkDataSubPurchaseId,

            customerPrice:
              dataPrice,

            serviceFeePercent,

            serviceFee,

            customerTotal,
          }
        );

        const response =
          await fetch(
            "/api/data/purchase",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  purchaseBody
                ),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Data purchase failed."
          );
        }

        const chargedAmount =
          Number(result.amount);

        setMessage(
          result.message ||
            `Data purchase successful. You were charged ₦${formatPrice(
              Number.isFinite(
                chargedAmount
              )
                ? chargedAmount
                : customerTotal
            )}.`
        );

        setPhone("");
        setPlanId("");

        if (
          Number.isFinite(
            Number(
              result.serviceFeePercentage
            )
          )
        ) {
          setServiceFeePercent(
            Number(
              result.serviceFeePercentage
            )
          );
        }

        return;
      }

      // ========================================================
      // SERVER 1
      // ========================================================

      const bundleId =
        Number(
          selectedPlan.bundleId ??
            selectedPlan.bundle_id
        );

      if (
        !Number.isInteger(
          bundleId
        ) ||
        bundleId <= 0
      ) {
        throw new Error(
          "Invalid data plan."
        );
      }

      const purchaseBody = {
        server:
          "CHEAPDATAHUB",

        bundle_id:
          bundleId,

        phone_number:
          cleanedPhone,

        transactionPin:
          pin,
      };

      console.log(
        "DATA PURCHASE",
        {
          bundleId,

          customerPrice:
            dataPrice,

          serviceFee,

          customerTotal,
        }
      );

      const response =
        await fetch(
          "/api/data/purchase",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                purchaseBody
              ),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Data purchase failed."
        );
      }

      setMessage(
        result.message ||
          "Data purchase successful."
      );

      setPhone("");
      setPlanId("");

      if (
        Number.isFinite(
          Number(
            result.serviceFeePercentage
          )
        )
      ) {
        setServiceFeePercent(
          Number(
            result.serviceFeePercentage
          )
        );
      }
    } catch (err) {
      console.error(
        "DATA PURCHASE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Data purchase failed."
      );
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
      : loadingPlans;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="w-full">
      {/* HEADER */}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Buy Data
        </h1>

        <p className="mt-1 text-muted-foreground">
          Select your data server, network,
          data plan and recipient number.
        </p>
      </div>

      {/* MAIN CARD */}

      <div className="max-w-2xl rounded-2xl bg-card p-6 shadow">
        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-600 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
            {message}
          </div>
        )}

        <form onSubmit={handleBuyData}>
          {/* SERVER */}

          <label className="mb-2 block font-medium text-foreground">
            Data Server
          </label>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* SERVER 1 */}

            <button
              type="button"
              disabled={buying}
              onClick={() =>
                handleServerChange(
                  "CHEAPDATAHUB"
                )
              }
              className={`rounded-xl border p-4 text-left transition ${
                server === "CHEAPDATAHUB"
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-950/30 dark:text-indigo-300"
                  : "border-border bg-background text-foreground hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">
                    Server 1
                  </p>

                  <p className="mt-1 text-sm opacity-70">
                    Data Service
                  </p>
                </div>

                {server ===
                  "CHEAPDATAHUB" && (
                  <span className="font-bold">
                    ✓
                  </span>
                )}
              </div>
            </button>

            {/* SERVER 2 */}

            <button
              type="button"
              disabled={buying}
              onClick={() =>
                handleServerChange(
                  "NETWORKDATASUB"
                )
              }
              className={`rounded-xl border p-4 text-left transition ${
                server === "NETWORKDATASUB"
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-950/30 dark:text-indigo-300"
                  : "border-border bg-background text-foreground hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">
                    Server 2
                  </p>

                  <p className="mt-1 text-sm opacity-70">
                    Data Service
                  </p>
                </div>

                {server ===
                  "NETWORKDATASUB" && (
                  <span className="font-bold">
                    ✓
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* SELECTED SERVER */}

          <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              Selected server
            </p>

            <p className="mt-1 font-semibold text-indigo-700 dark:text-indigo-300">
              {server === "CHEAPDATAHUB"
                ? "Server 1"
                : "Server 2"}
            </p>
          </div>

          {/* NETWORK */}

          <label className="mb-2 block font-medium text-foreground">
            Network
          </label>

          <select
            value={network}
            onChange={
              handleNetworkChange
            }
            disabled={
              loadingCurrentPlans ||
              buying
            }
            className="mb-5 w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-indigo-500"
          >
            <option value="">
              Select Network
            </option>

            {NETWORKS.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          {/* DATA PLAN */}

          <label className="mb-2 block font-medium text-foreground">
            Data Plan
          </label>

          <select
            value={planId}
            onChange={(e) => {
              setPlanId(
                e.target.value
              );
              setError("");
              setMessage("");
            }}
            disabled={
              !network ||
              loadingCurrentPlans ||
              buying
            }
            className="mb-5 w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-indigo-500"
          >
            <option value="">
              {loadingCurrentPlans
                ? "Loading plans..."
                : filteredPlans.length ===
                  0
                ? "No plans available"
                : "Select Data Plan"}
            </option>

            {filteredPlans.map(
              (plan) => {
                const displayPrice =
                  getCustomerPrice(
                    plan
                  );

                return (
                  <option
                    key={String(
                      plan.id
                    )}
                    value={String(
                      plan.id
                    )}
                  >
                    {plan.name}
                    {" — "}
                    {plan.duration}
                    {" — ₦"}
                    {formatPrice(
                      displayPrice
                    )}
                  </option>
                );
              }
            )}
          </select>

          {/* PLAN DETAILS */}

          {selectedPlan && (
            <div className="mb-5 rounded-2xl bg-muted p-4">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Plan Details
              </h3>

              <div className="space-y-3 text-sm">
                {/* NETWORK */}

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Network
                  </span>

                  <strong className="text-right text-foreground">
                    {String(
                      selectedPlan.provider
                    ).toUpperCase()}
                  </strong>
                </div>

                {/* DATA */}

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Data
                  </span>

                  <strong className="text-right text-foreground">
                    {selectedPlan.size}
                  </strong>
                </div>

                {/* DURATION */}

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Duration
                  </span>

                  <strong className="text-right text-foreground">
                    {selectedPlan.duration}
                  </strong>
                </div>

                {/* DATA PRICE */}

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Data Price
                  </span>

                  <strong className="text-right text-foreground">
                    ₦
                    {formatPrice(
                      dataPrice
                    )}
                  </strong>
                </div>

                {/* SERVICE FEE */}

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Service Fee
                  </span>

                  <strong className="text-right text-foreground">
                    {loadingFee
                      ? "Loading..."
                      : `${serviceFeePercent}% — ₦${formatPrice(
                          serviceFee
                        )}`}
                  </strong>
                </div>

                {/* CUSTOMER TOTAL */}

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="font-semibold text-foreground">
                    Customer Total
                  </span>

                  <strong className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    ₦
                    {formatPrice(
                      customerTotal
                    )}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* PHONE */}

          <label className="mb-2 block font-medium text-foreground">
            Phone Number
          </label>

          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              const value =
                e.target.value.replace(
                  /\D/g,
                  ""
                );

              setPhone(
                value.slice(0, 11)
              );
            }}
            maxLength={11}
            inputMode="numeric"
            placeholder="08012345678"
            disabled={buying}
            className="mb-5 w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-indigo-500"
          />

          {/* BUY BUTTON */}

          <button
            type="submit"
            disabled={
              buying ||
              loadingCurrentPlans ||
              !selectedPlan
            }
            className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying
              ? "Processing..."
              : selectedPlan
              ? `Buy Data — ₦${formatPrice(
                  customerTotal
                )}`
              : "Buy Data"}
          </button>
        </form>

        {/* TRANSACTION PIN */}

        <TransactionPinModal
          open={showPinModal}
          onClose={() => {
            if (!buying) {
              setShowPinModal(
                false
              );
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

