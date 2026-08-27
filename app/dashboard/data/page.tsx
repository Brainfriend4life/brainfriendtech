"use client";

import { useEffect, useMemo, useState } from "react";
import TransactionPinModal from "@/components/TransactionPinModal";

type DataPlan = {
  id: string;
  provider: string;
  bundleId: number;
  name: string;
  size: string;
  duration: string;
  providerPrice: number;
  sellingPrice: number;
  status: string;
};

const NETWORKS = [
  "MTN",
  "AIRTEL",
  "GLO",
  "9MOBILE",
];

export default function BuyDataPage() {
  const [plans, setPlans] = useState<DataPlan[]>([]);

  const [network, setNetwork] = useState("");
  const [planId, setPlanId] = useState("");
  const [phone, setPhone] = useState("");

  const [serviceFeePercent, setServiceFeePercent] =
    useState(5);

  const [showPinModal, setShowPinModal] =
    useState(false);

  const [loadingPlans, setLoadingPlans] =
    useState(true);

  const [loadingFee, setLoadingFee] =
    useState(true);

  const [buying, setBuying] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await fetch(
          "/api/data-plans",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to load data plans"
          );
        }

        setPlans(result.data || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load plans"
        );
      } finally {
        setLoadingPlans(false);
      }
    }

    loadPlans();
  }, []);

  useEffect(() => {
    async function loadServiceFee() {
      try {
        const response = await fetch(
          "/api/settings/service-fee",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (
          response.ok &&
          result.success &&
          Number.isFinite(
            Number(result.percentage)
          )
        ) {
          setServiceFeePercent(
            Number(result.percentage)
          );
        }
      } catch (error) {
        console.error(
          "SERVICE FEE FRONTEND ERROR:",
          error
        );
      } finally {
        setLoadingFee(false);
      }
    }

    loadServiceFee();
  }, []);

  const filteredPlans = useMemo(() => {
    if (!network) {
      return [];
    }

    return plans.filter(
      (plan) =>
        plan.provider.toUpperCase() ===
        network.toUpperCase()
    );
  }, [plans, network]);

  const selectedPlan = useMemo(() => {
    return plans.find(
      (plan) => plan.id === planId
    );
  }, [plans, planId]);

  const pricing = useMemo(() => {
    if (!selectedPlan) {
      return {
        basePrice: 0,
        serviceFee: 0,
        total: 0,
      };
    }

    const basePrice =
      Number(selectedPlan.sellingPrice) || 0;

    const serviceFee =
      Number(
        (
          basePrice *
          (serviceFeePercent / 100)
        ).toFixed(2)
      );

    const total =
      Number(
        (
          basePrice +
          serviceFee
        ).toFixed(2)
      );

    return {
      basePrice,
      serviceFee,
      total,
    };
  }, [
    selectedPlan,
    serviceFeePercent,
  ]);

  function handleNetworkChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    setNetwork(e.target.value);
    setPlanId("");
    setError("");
    setMessage("");
  }

  function handleBuyData(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!network) {
      setError(
        "Please select network"
      );
      return;
    }

    if (!planId) {
      setError(
        "Please select data plan"
      );
      return;
    }

    if (!phone) {
      setError(
        "Please enter phone number"
      );
      return;
    }

    setShowPinModal(true);
  }

  async function processBuyData(
    pin: string
  ) {
    if (!selectedPlan) {
      return;
    }

    const cleanedPhone =
      phone
        .replace(/\s+/g, "")
        .replace(/-/g, "");

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      setError(
        "Invalid Nigerian phone number"
      );
      return;
    }

    setBuying(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/data/purchase",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            bundle_id:
              Number(
                selectedPlan.bundleId
              ),

            phone_number:
              cleanedPhone,

            transactionPin:
              pin,
          }),
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
            "Purchase failed"
        );
      }

      setMessage(
        result.message ||
          "Data purchase successful"
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
      setError(
        err instanceof Error
          ? err.message
          : "Purchase failed"
      );
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Buy Data
        </h1>

        <p className="text-muted-foreground">
          Select network, plan and recipient number
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl bg-card p-6 shadow">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-600 dark:bg-green-950/30 dark:text-green-400">
            {message}
          </div>
        )}

        <form onSubmit={handleBuyData}>
          {/* NETWORK */}

          <label className="mb-2 block font-medium text-foreground">
            Network
          </label>

          <select
            value={network}
            onChange={handleNetworkChange}
            disabled={
              loadingPlans || buying
            }
            className="mb-5 w-full rounded-lg border border-border bg-background p-3 text-foreground"
          >
            <option value="">
              Select Network
            </option>

            {NETWORKS.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          {/* DATA PLAN */}

          <label className="mb-2 block font-medium text-foreground">
            Data Plan
          </label>

          <select
            value={planId}
            onChange={(e) =>
              setPlanId(e.target.value)
            }
            disabled={
              !network || buying
            }
            className="mb-5 w-full rounded-lg border border-border bg-background p-3 text-foreground"
          >
            <option value="">
              Select Plan
            </option>

            {filteredPlans.map((plan) => (
              <option
                key={plan.id}
                value={plan.id}
              >
                {plan.name} —{" "}
                {plan.duration} — ₦
                {Number(
                  plan.sellingPrice
                ).toLocaleString()}
              </option>
            ))}
          </select>

          {/* SELECTED PLAN DETAILS */}

          {selectedPlan && (
            <div className="mb-5 rounded-xl bg-muted p-4">
              <h3 className="mb-3 text-lg font-semibold text-foreground">
                Plan Details
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Network
                  </span>

                  <strong className="text-foreground">
                    {selectedPlan.provider.toUpperCase()}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Data
                  </span>

                  <strong className="text-foreground">
                    {selectedPlan.size}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Duration
                  </span>

                  <strong className="text-foreground">
                    {selectedPlan.duration}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Data Price
                  </span>

                  <strong className="text-foreground">
                    ₦
                    {pricing.basePrice.toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Service Fee
                  </span>

                  <strong className="text-foreground">
                    {loadingFee
                      ? "Loading..."
                      : `${serviceFeePercent}% — ₦${pricing.serviceFee.toLocaleString(
                          "en-NG",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}`}
                  </strong>
                </div>

                <div className="mt-3 flex justify-between border-t border-border pt-3 text-base">
                  <span className="font-semibold text-foreground">
                    Total
                  </span>

                  <strong className="text-lg text-foreground">
                    ₦
                    {pricing.total.toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
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
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            maxLength={11}
            placeholder="08012345678"
            disabled={buying}
            className="mb-5 w-full rounded-lg border border-border bg-background p-3 text-foreground"
          />

          {/* BUY BUTTON */}

          <button
            type="submit"
            disabled={
              buying ||
              loadingPlans ||
              !selectedPlan
            }
            className="w-full rounded-lg bg-indigo-600 p-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying
              ? "Processing..."
              : "Buy Data"}
          </button>
        </form>

        {/* PIN MODAL */}

        <TransactionPinModal
          open={showPinModal}
          onClose={() =>
            setShowPinModal(false)
          }
          onSuccess={(pin) => {
            setShowPinModal(false);
            processBuyData(pin);
          }}
        />
      </div>
    </div>
  );
}