"use client";

import { useState } from "react";

const DISCOS = [
  { id: 1, name: "Abuja Electric AEDC" },
  { id: 2, name: "Eko Electric (EKEDC)" },
  { id: 3, name: "Ibadan Electric (IBEDC)" },
  { id: 4, name: "Ikeja Electric (IKEDC)" },
  { id: 5, name: "Kaduna Electric" },
  { id: 6, name: "Port Harcourt Electric" },
  { id: 7, name: "Jos Electricity Distribution PLC (JEDplc)" },
  { id: 8, name: "Enugu Electric" },
  { id: 9, name: "Yola Electric" },
  { id: 10, name: "Benin Electric" },
];

export default function ElectricityPage() {
  const [discoId, setDiscoId] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("prepaid");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [units, setUnits] = useState("");

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");
    setToken("");
    setUnits("");

    // ==========================================
    // VALIDATE DISCO
    // ==========================================

    if (!discoId) {
      setError("Please select your electricity provider.");
      return;
    }

    // ==========================================
    // VALIDATE METER NUMBER
    // ==========================================

    const cleanedMeter = meterNumber.replace(/\s+/g, "");

    if (!/^\d{6,20}$/.test(cleanedMeter)) {
      setError("Please enter a valid meter number.");
      return;
    }

    // ==========================================
    // VALIDATE AMOUNT
    // ==========================================

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Please enter a valid amount.");
      return;
    }

    if (numericAmount < 100) {
      setError("Minimum electricity amount is ₦100.");
      return;
    }

    // ==========================================
    // VALIDATE PHONE
    // ==========================================

    const cleanedPhone = phone.replace(/\s+/g, "");

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      setError("Please enter a valid Nigerian phone number.");
      return;
    }

    // ==========================================
    // START PURCHASE
    // ==========================================

    setLoading(true);

    try {
      const response = await fetch(
        "/api/electricity/purchase",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            discoId: Number(discoId),
            meterNumber: cleanedMeter,
            amount: numericAmount,
            meterType,
            phone: cleanedPhone,
          }),
        }
      );

      const result = await response.json();

      console.log(
        "ELECTRICITY PURCHASE RESPONSE:",
        result
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Electricity purchase failed."
        );
      }

      setMessage(
        result.message ||
          "Electricity payment successful."
      );

      if (result.token) {
        setToken(result.token);
      }

      if (result.units) {
        setUnits(String(result.units));
      }

      setMeterNumber("");
      setAmount("");
      setPhone("");
    } catch (error) {
      console.error(
        "ELECTRICITY PURCHASE ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Electricity purchase failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* HEADER */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Buy Electricity
        </h1>

        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Pay your electricity bill quickly and securely.
        </p>
      </div>

      {/* CARD */}

      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8">

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* TOKEN */}

        {token && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="mb-2 text-sm font-medium text-green-800">
              Electricity Token
            </p>

            <p className="break-all text-xl font-bold tracking-wider text-green-900">
              {token}
            </p>

            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(token)
              }
              className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Copy Token
            </button>
          </div>
        )}

        {/* UNITS */}

        {units && (
          <div className="mb-5 rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Electricity Units
            </p>

            <p className="text-xl font-bold text-gray-900">
              {units}
            </p>
          </div>
        )}

        <form onSubmit={handlePurchase}>
          <div className="space-y-5">

            {/* DISCO */}

            <div>
              <label
                htmlFor="disco"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Electricity Provider
              </label>

              <select
                id="disco"
                value={discoId}
                onChange={(e) =>
                  setDiscoId(e.target.value)
                }
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              >
                <option value="">
                  Select electricity provider
                </option>

                {DISCOS.map((disco) => (
                  <option
                    key={disco.id}
                    value={disco.id}
                  >
                    {disco.name}
                  </option>
                ))}
              </select>
            </div>

            {/* METER NUMBER */}

            <div>
              <label
                htmlFor="meterNumber"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Meter Number
              </label>

              <input
                id="meterNumber"
                type="text"
                inputMode="numeric"
                value={meterNumber}
                onChange={(e) =>
                  setMeterNumber(e.target.value)
                }
                placeholder="Enter meter number"
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              />
            </div>

            {/* METER TYPE */}

            <div>
              <label
                htmlFor="meterType"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Meter Type
              </label>

              <select
                id="meterType"
                value={meterType}
                onChange={(e) =>
                  setMeterType(e.target.value)
                }
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              >
                <option value="prepaid">
                  Prepaid
                </option>

                <option value="postpaid">
                  Postpaid
                </option>
              </select>
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
                min="100"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="Enter amount"
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              />

              <p className="mt-2 text-xs text-gray-400">
                Minimum amount: ₦100
              </p>
            </div>

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
                placeholder="08012345678"
                maxLength={11}
                disabled={loading}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
              />
            </div>

            {/* BUTTON */}

            <button
              type="submit"
              disabled={
                loading ||
                !discoId ||
                !meterNumber ||
                !amount ||
                !phone
              }
              className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : "Pay Electricity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}