"use client";

import { useEffect, useMemo, useState } from "react";

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

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

export default function BuyDataPage() {
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [network, setNetwork] = useState("");
  const [planId, setPlanId] = useState("");
  const [phone, setPhone] = useState("");

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [buying, setBuying] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ============================================
  // LOAD DATA PLANS
  // ============================================

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);
        setError("");

        const response = await fetch("/api/data-plans", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        console.log("DATA PLANS RESPONSE:", result);

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              result.error ||
              "Unable to load data plans."
          );
        }

        setPlans(result.data || []);
      } catch (err) {
        console.error("LOAD DATA PLANS ERROR:", err);

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

  // ============================================
  // FILTER PLANS BY NETWORK
  // ============================================

  const filteredPlans = useMemo(() => {
    if (!network) {
      return [];
    }

    return plans.filter(
      (plan) =>
        String(plan.provider).toUpperCase() ===
        network.toUpperCase()
    );
  }, [plans, network]);

  // ============================================
  // SELECTED PLAN
  // ============================================

  const selectedPlan = useMemo(() => {
    return plans.find(
      (plan) => String(plan.id) === String(planId)
    );
  }, [plans, planId]);

  // ============================================
  // NETWORK CHANGE
  // ============================================

  function handleNetworkChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const value = e.target.value;

    setNetwork(value);
    setPlanId("");
    setMessage("");
    setError("");
  }

  // ============================================
  // BUY DATA
  // ============================================

  async function handleBuyData(
    e: React.FormEvent<HTMLFormElement>
  ) {
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

    if (!selectedPlan.bundleId) {
      setError(
        "This data plan does not have a valid provider bundle ID."
      );
      return;
    }

    if (!phone) {
      setError(
        "Please enter the recipient phone number."
      );
      return;
    }

    const cleanedPhone = phone.replace(/\s+/g, "");

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      setError(
        "Please enter a valid Nigerian phone number."
      );
      return;
    }

    setBuying(true);

    try {
      // ==========================================
      // IMPORTANT:
      // SEND PROVIDER BUNDLE ID
      // NOT OUR DATABASE ID
      // ==========================================

      const requestBody = {
        bundle_id: Number(selectedPlan.bundleId),
        phone_number: cleanedPhone,
      };

      console.log(
        "DATA PURCHASE REQUEST:",
        requestBody
      );

      console.log(
        "SELECTED PLAN:",
        selectedPlan
      );

      const response = await fetch(
        "/api/data/purchase",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();

      console.log(
        "DATA PURCHASE RESPONSE:",
        result
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Data purchase failed."
        );
      }

      // ==========================================
      // SUCCESS
      // ==========================================

      setMessage(
        result.message ||
          "Data purchase successful."
      );

      setPhone("");
      setPlanId("");
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

  // ============================================
  // UI
  // ============================================

  return (
    <div className="w-full">
      {/* HEADER */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Buy Data
        </h1>

        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Select your network, data plan and enter
          the recipient number.
        </p>
      </div>

      {/* CARD */}

      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-600">
            {message}
          </div>
        )}

        <form onSubmit={handleBuyData}>
          {/* NETWORK */}

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Network
          </label>

          <select
            value={network}
            onChange={handleNetworkChange}
            className="mb-5 w-full rounded-lg border p-3 outline-none"
            disabled={
              loadingPlans || buying
            }
          >
            <option value="">
              {loadingPlans
                ? "Loading networks..."
                : "Select network"}
            </option>

            {!loadingPlans &&
              NETWORKS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
          </select>

          {/* DATA PLAN */}

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Data Plan
          </label>

          <select
            value={planId}
            onChange={(e) => {
              const value =
                e.target.value;

              console.log(
                "SELECTED DATABASE PLAN ID:",
                value
              );

              const selected = plans.find(
                (plan) =>
                  String(plan.id) ===
                  String(value)
              );

              console.log(
                "SELECTED PLAN:",
                selected
              );

              console.log(
                "PROVIDER BUNDLE ID:",
                selected?.bundleId
              );

              setPlanId(value);
              setError("");
              setMessage("");
            }}
            className="mb-5 w-full rounded-lg border p-3 outline-none"
            disabled={
              loadingPlans ||
              buying ||
              !network ||
              filteredPlans.length === 0
            }
          >
            <option value="">
              {loadingPlans
                ? "Loading data plans..."
                : !network
                ? "Select network first"
                : filteredPlans.length === 0
                ? "No data plans available"
                : "Please select a data plan"}
            </option>

            {filteredPlans.map((plan) => (
              <option
                key={plan.id}
                value={plan.id}
              >
                {plan.name} - ₦
                {Number(
                  plan.sellingPrice
                ).toLocaleString("en-NG")}{" "}
                - {plan.duration}
              </option>
            ))}
          </select>

          {/* SELECTED PLAN INFORMATION */}

          {selectedPlan && (
            <div className="mb-5 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Data
                </span>

                <span className="font-medium">
                  {selectedPlan.name}
                </span>
              </div>

              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-500">
                  Duration
                </span>

                <span className="font-medium">
                  {selectedPlan.duration}
                </span>
              </div>

              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-500">
                  Price
                </span>

                <span className="font-semibold">
                  ₦
                  {Number(
                    selectedPlan.sellingPrice
                  ).toLocaleString("en-NG")}
                </span>
              </div>
            </div>
          )}

          {/* PHONE */}

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Phone Number
          </label>

          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            placeholder="08012345678"
            className="mb-5 w-full rounded-lg border p-3 outline-none"
            maxLength={11}
            disabled={buying}
          />

          {/* BUY BUTTON */}

          <button
            type="submit"
            disabled={
              buying ||
              loadingPlans ||
              !network ||
              !planId ||
              !phone ||
              !selectedPlan
            }
            className="w-full rounded-lg bg-black p-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying
              ? "Processing..."
              : "Buy Data"}
          </button>
        </form>

        {/* NOTE */}

        <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="text-sm font-semibold text-yellow-800">
            NOTE
          </h2>

          <p className="mt-1 text-sm leading-6 text-yellow-700">
            Data purchases attract a 5% service fee.
          </p>
        </div>
      </div>
    </div>
  );
}