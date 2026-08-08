
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function AirtimePage() {
  const [serviceID, setServiceID] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const buyAirtime = async () => {
    if (!phone.trim()) {
      toast.error("Please enter a phone number.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/airtime/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceID,
          phone,
          amount: Number(amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("VTpass Error:", data);

        toast.error(
          data.error?.response_description ||
            data.message ||
            "Purchase failed"
        );

        return;
      }

      console.log(data);

      toast.success("Request sent successfully!");

      setPhone("");
      setAmount("");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
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
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              value={serviceID}
              onChange={(e) =>
                setServiceID(e.target.value)
              }
              disabled={loading}
            >
              <option value="mtn">MTN</option>
              <option value="airtel">Airtel</option>
              <option value="glo">GLO</option>
              <option value="etisalat">9mobile</option>
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
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              maxLength={11}
              disabled={loading}
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
              min="1"
              placeholder="Enter amount"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              disabled={loading}
            />
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

