
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Plan = {
  variation_code: string;
  name: string;
  variation_amount: string;
};

export default function DataPage() {
  const [network, setNetwork] = useState("mtn-data");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);

  /*
  ==========================================
  CALCULATE 5% SERVICE FEE
  ==========================================
  */

  const dataAmount = Number(amount) || 0;
  const serviceFee = dataAmount * 0.05;
  const totalAmount = dataAmount + serviceFee;

  /*
  ==========================================
  LOAD DATA PLANS
  ==========================================
  */

  useEffect(() => {
    fetchPlans();
  }, [network]);

  async function fetchPlans() {
    setPlansLoading(true);
    setPlans([]);
    setPlan("");
    setAmount("");

    try {
      const res = await fetch(
        `/api/data/plans?serviceID=${encodeURIComponent(
          network
        )}`
      );

      const data = await res.json();

      console.log("DATA PLANS RESPONSE:", data);

      if (!res.ok) {
        toast.error(
          data.message || "Failed to load data plans"
        );
        return;
      }

      const variations = data.content?.variations || [];

      const uniquePlans = variations.filter(
        (
          current: Plan,
          index: number,
          self: Plan[]
        ) =>
          index ===
          self.findIndex(
            (p) =>
              p.variation_code ===
              current.variation_code
          )
      );

      setPlans(uniquePlans);
    } catch (error) {
      console.error("DATA PLANS ERROR:", error);

      toast.error("Failed to load data plans");
    } finally {
      setPlansLoading(false);
    }
  }

  /*
  ==========================================
  SELECT DATA PLAN
  ==========================================
  */

  function handlePlan(value: string) {
    setPlan(value);

    const selected = plans.find(
      (p) => p.variation_code === value
    );

    if (selected) {
      setAmount(selected.variation_amount);
    } else {
      setAmount("");
    }
  }

  /*
  ==========================================
  BUY DATA
  ==========================================
  */

  async function buyData(e: React.FormEvent) {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error("Enter the phone number");
      return;
    }

    if (!plan) {
      toast.error("Select a data plan");
      return;
    }

    if (dataAmount <= 0) {
      toast.error("Invalid data plan amount");
      return;
    }

    const payload = {
      serviceID: network,
      variation_code: plan,
      phone: phone.trim(),
      amount: dataAmount,
    };

    console.log("==========================================");
    console.log("FRONTEND DATA PAYLOAD:", payload);
    console.log("DATA AMOUNT:", dataAmount);
    console.log("SERVICE FEE:", serviceFee);
    console.log(
      "TOTAL CUSTOMER CHARGE:",
      totalAmount
    );
    console.log("==========================================");

    setLoading(true);

    try {
      const res = await fetch(
        "/api/data/purchase",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      console.log("SERVER DATA RESPONSE:", data);

      if (!res.ok) {
        toast.error(
          data.message || "Data purchase failed"
        );
        return;
      }

      if (data.success) {
        toast.success(
          "Data purchased successfully!"
        );

        setPhone("");
        setPlan("");
        setAmount("");
      } else {
        toast.error(
          data.message ||
            data.vtpass?.response_description ||
            "Transaction failed"
        );
      }
    } catch (error) {
      console.error(
        "DATA PURCHASE ERROR:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* PAGE HEADER */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Buy Data
        </h1>

        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Purchase mobile data quickly and securely.
        </p>
      </div>

      {/* FORM CARD */}

      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <form
          onSubmit={buyData}
          className="space-y-5"
        >
          {/* NETWORK */}

          <div>
            <label
              htmlFor="network"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Network
            </label>

            <select
              id="network"
              value={network}
              onChange={(e) =>
                setNetwork(e.target.value)
              }
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
            >
              <option value="mtn-data">
                MTN
              </option>

              <option value="airtel-data">
                Airtel
              </option>

              <option value="glo-data">
                Glo
              </option>

              <option value="etisalat-data">
                9mobile
              </option>
            </select>
          </div>

          {/* DATA PLAN */}

          <div>
            <label
              htmlFor="data-plan"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Data Plan
            </label>

            <select
              id="data-plan"
              value={plan}
              onChange={(e) =>
                handlePlan(e.target.value)
              }
              disabled={
                plansLoading || loading
              }
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
            >
              <option value="">
                {plansLoading
                  ? "Loading plans..."
                  : "Select Plan"}
              </option>

              {plans.map((p, index) => (
                <option
                  key={`${p.variation_code}-${index}`}
                  value={p.variation_code}
                >
                  {p.name} — ₦
                  {Number(
                    p.variation_amount
                  ).toLocaleString("en-NG")}
                </option>
              ))}
            </select>

            {!plansLoading &&
              plans.length === 0 && (
                <p className="mt-2 text-sm text-red-500">
                  No data plans available
                  for this network.
                </p>
              )}
          </div>

          {/* DATA AMOUNT */}

          <div>
            <label
              htmlFor="data-amount"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Data Amount
            </label>

            <input
              id="data-amount"
              value={
                dataAmount
                  ? `₦${dataAmount.toLocaleString(
                      "en-NG"
                    )}`
                  : ""
              }
              readOnly
              placeholder="Select a plan"
              className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm outline-none sm:text-base"
            />
          </div>

          {/* SERVICE FEE */}

          {dataAmount > 0 && (
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-600">
                  Data price
                </span>

                <span className="font-medium text-gray-900">
                  ₦
                  {dataAmount.toLocaleString(
                    "en-NG",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-600">
                  Service fee (5%)
                </span>

                <span className="font-medium text-gray-900">
                  ₦
                  {serviceFee.toLocaleString(
                    "en-NG",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>
              </div>

              <div className="my-3 border-t" />

              <div className="flex items-center justify-between gap-4 font-bold">
                <span>Total</span>

                <span className="text-indigo-600">
                  ₦
                  {totalAmount.toLocaleString(
                    "en-NG",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>
              </div>
            </div>
          )}

          {/* PHONE */}

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>

            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              placeholder="08012345678"
              maxLength={11}
            />
          </div>

          {/* PURCHASE BUTTON */}

          <button
            type="submit"
            disabled={
              loading ||
              plansLoading ||
              !plan ||
              !phone ||
              !amount
            }
            className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : dataAmount > 0
              ? `Buy Data — ₦${totalAmount.toLocaleString(
                  "en-NG",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`
              : "Buy Data"}
          </button>
        </form>
      </div>
    </div>
  );
}

