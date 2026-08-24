"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const NETWORKS = [
  {
    id: "mtn",
    name: "MTN",
    providerId: 1,
    minimum: 100,
  },
  {
    id: "airtel",
    name: "Airtel",
    providerId: 2,
    minimum: 100,
  },
  {
    id: "glo",
    name: "GLO",
    providerId: 3,
    minimum: 100,
  },
  {
    id: "9mobile",
    name: "9mobile",
    providerId: 4,
    minimum: 100,
  },
];

export default function AirtimePage() {
  const [serviceID, setServiceID] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedNetwork = NETWORKS.find(
    (network) => network.id === serviceID
  );

  const buyAirtime = async () => {
    // =====================================================
    // VALIDATE PHONE
    // =====================================================

    const cleanPhone = phone.replace(/\s+/g, "");

    if (
      !/^(0\d{10}|\+234\d{10}|234\d{10})$/.test(
        cleanPhone
      )
    ) {
      toast.error(
        "Please enter a valid Nigerian phone number."
      );
      return;
    }

    // =====================================================
    // VALIDATE AMOUNT
    // =====================================================

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const minimumAmount =
      selectedNetwork?.minimum ?? 50;

    if (numericAmount < minimumAmount) {
      toast.error(
        `Minimum amount is ₦${minimumAmount.toLocaleString()}.`
      );
      return;
    }

    if (numericAmount > 50000) {
      toast.error(
        "Maximum airtime amount is ₦50,000."
      );
      return;
    }

    // =====================================================
    // PROVIDER ID
    // =====================================================

    const providerId =
      selectedNetwork?.providerId;

    if (!providerId) {
      toast.error("Please select a valid network.");
      return;
    }

    // =====================================================
    // START PURCHASE
    // =====================================================

    setLoading(true);

    try {
      const res = await fetch(
        "/api/airtime/purchase",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
  providerId:
    serviceID === "mtn"
      ? 1
      : serviceID === "glo"
      ? 2
      : serviceID === "airtel"
      ? 3
      : 4,

  phoneNumber: cleanPhone,

  amount: Math.round(numericAmount),
})
        }
      );

      const data = await res.json();

      console.log(
        "CheapDataHub Airtime Response:",
        data
      );

      // ===================================================
      // ERROR
      // ===================================================

      if (!res.ok || !data.success) {
        toast.error(
          data.error ||
            data.message ||
            "Airtime purchase failed."
        );

        return;
      }

      // ===================================================
      // SUCCESS
      // ===================================================

      toast.success(
        data.message ||
          "Airtime purchased successfully!"
      );

      setPhone("");
      setAmount("");

      // Optional: refresh page data
      window.dispatchEvent(
        new Event("walletUpdated")
      );
    } catch (error) {
      console.error(
        "AIRTIME PURCHASE ERROR:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* PAGE HEADER */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Buy Airtime
        </h1>

        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Purchase airtime quickly and securely.
        </p>
      </div>

      {/* FORM CARD */}

      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="space-y-5">

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
              value={serviceID}
              onChange={(e) =>
                setServiceID(e.target.value)
              }
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
            >
              {NETWORKS.map((network) => (
                <option
                  key={network.id}
                  value={network.id}
                >
                  {network.name}
                </option>
              ))}
            </select>
          </div>

          {/* PHONE NUMBER */}

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
              placeholder="08012345678"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              maxLength={14}
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
            />
          </div>

          {/* AMOUNT */}

          <div>
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Amount
            </label>

            <input
              id="amount"
              type="number"
              inputMode="decimal"
              min={selectedNetwork?.minimum ?? 50}
              max="50000"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
            />

            <p className="mt-2 text-xs text-gray-400">
              {selectedNetwork?.name}: minimum ₦
              {(
                selectedNetwork?.minimum ?? 50
              ).toLocaleString()}
              . Maximum: ₦50,000.
            </p>
          </div>

          {/* PURCHASE BUTTON */}

          <button
            type="button"
            onClick={buyAirtime}
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : "Buy Airtime"}
          </button>
        </div>
      </div>
    </div>
  );
}