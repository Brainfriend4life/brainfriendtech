"use client";

import { useState } from "react";
import { Wallet, ArrowRight, ShieldCheck } from "lucide-react";

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
        alert(
          data.message || "Unable to initialize payment."
        );
      }
    } catch (error) {
      console.error("PAYMENT ERROR:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-lg">

        {/* HEADER CARD */}
        <div
          className="
            overflow-hidden rounded-2xl
            bg-gradient-to-br from-indigo-600 to-purple-700
            p-5 text-white shadow-lg
            sm:p-7
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-12 w-12 shrink-0 items-center justify-center
                rounded-xl bg-white/15
              "
            >
              <Wallet
                className="h-6 w-6"
                strokeWidth={2.5}
              />
            </div>

            <div>
              <h1 className="text-xl font-bold sm:text-2xl">
                Fund Wallet
              </h1>

              <p className="mt-1 text-sm text-indigo-100">
                Add money to your Brainfriend wallet securely.
              </p>
            </div>
          </div>
        </div>

        {/* FORM CARD */}
        <div
          className="
            mt-5 rounded-2xl
            border border-gray-200
            bg-white
            p-5 shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
            sm:p-7
          "
        >
          <label
            htmlFor="amount"
            className="
              mb-2 block text-sm font-semibold
              text-gray-800
              dark:text-slate-200
            "
          >
            Amount (₦)
          </label>

          <div className="relative">
            <span
              className="
                pointer-events-none absolute left-4 top-1/2
                -translate-y-1/2
                text-sm font-bold
                text-gray-500
                dark:text-slate-400
              "
            >
              ₦
            </span>

            <input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1,000"
              className="
                w-full rounded-xl
                border border-gray-300
                bg-white
                py-3.5 pl-9 pr-4
                text-base font-medium
                text-gray-900
                outline-none
                transition
                placeholder:text-gray-400
                focus:border-indigo-600
                focus:ring-4 focus:ring-indigo-100
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-white
                dark:placeholder:text-slate-500
                dark:focus:border-indigo-500
                dark:focus:ring-indigo-500/20
              "
            />
          </div>

          {/* QUICK AMOUNTS */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1000, 2000, 5000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className="
                  rounded-lg
                  border border-gray-200
                  bg-gray-50
                  px-2 py-2
                  text-xs font-semibold
                  text-gray-700
                  transition
                  hover:border-indigo-300
                  hover:bg-indigo-50
                  hover:text-indigo-600
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-300
                  dark:hover:border-indigo-500/50
                  dark:hover:bg-indigo-950/50
                  dark:hover:text-indigo-300
                "
              >
                ₦{value.toLocaleString("en-NG")}
              </button>
            ))}
          </div>

          {/* PAYMENT BUTTON */}
          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            className="
              mt-6 flex w-full
              items-center justify-center gap-2
              rounded-xl
              bg-indigo-600
              px-5 py-3.5
              text-sm font-bold
              text-white
              shadow-sm
              transition
              hover:bg-indigo-700
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:opacity-60
              dark:bg-indigo-600
              dark:hover:bg-indigo-500
            "
          >
            {loading ? (
              <>
                <span
                  className="
                    h-4 w-4 animate-spin rounded-full
                    border-2 border-white/30
                    border-t-white
                  "
                />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* SECURITY NOTICE */}
          <div
            className="
              mt-5 flex items-start gap-3
              rounded-xl
              border border-green-200
              bg-green-50
              p-3.5
              dark:border-green-900/50
              dark:bg-green-950/20
            "
          >
            <ShieldCheck
              className="
                mt-0.5 h-5 w-5 shrink-0
                text-green-600
                dark:text-green-400
              "
            />

            <p
              className="
                text-xs leading-5
                text-green-700
                dark:text-green-400
              "
            >
              Your payment will be processed securely.
              You will be redirected to Paystack to complete
              the transaction.
            </p>
          </div>
        </div>

        {/* INFO */}
        <p
          className="
            mt-4 text-center text-xs
            text-gray-400
            dark:text-slate-500
          "
        >
          Funds will be added to your wallet after successful
          payment confirmation.
        </p>
      </div>
    </div>
  );
}