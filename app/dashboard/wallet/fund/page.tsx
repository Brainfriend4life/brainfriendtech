"use client";

import { useState } from "react";

export default function FundWalletPage() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    if (!amount || Number(amount) <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
        }),
      });

      const data = await res.json();

      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        alert("Unable to initialize payment.");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow">
      <h1 className="mb-6 text-3xl font-bold">
        Fund Wallet
      </h1>

      <label className="mb-2 block font-medium">
        Amount (₦)
      </label>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="1000"
        className="w-full rounded-lg border p-3 outline-none focus:border-indigo-600"
      />

      <button
        onClick={handlePayment}
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Continue to Payment"}
      </button>
    </div>
  );
}