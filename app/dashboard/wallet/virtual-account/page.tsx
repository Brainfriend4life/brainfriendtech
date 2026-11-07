"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Bank = {
  name: string;
  code: string;
};

const FALLBACK_BANKS: Bank[] = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Keystone Bank", code: "082" },
  { name: "Polaris Bank", code: "076" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank", code: "032" },
  { name: "United Bank for Africa", code: "033" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

export default function VirtualAccountPage() {
  const router = useRouter();

  const [bvn, setBvn] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [banks, setBanks] = useState<Bank[]>(FALLBACK_BANKS);
  const [consent, setConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  // Fetch supported banks
  useEffect(() => {
    let active = true;

    async function fetchBanks() {
      try {
        const response = await fetch("/api/paystack/banks", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (active && data.success && Array.isArray(data.banks)) {
          const validBanks = data.banks.filter(
            (bank: Bank) =>
              typeof bank.name === "string" && typeof bank.code === "string",
          );

          if (validBanks.length > 0) {
            setBanks(validBanks);
          }
        }
      } catch (error) {
        console.error("FETCH BANKS ERROR:", error);
      } finally {
        if (active) setLoadingBanks(false);
      }
    }

    fetchBanks();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!/^\d{11}$/.test(bvn)) {
      setMessage("BVN must contain exactly 11 digits.");
      setMessageType("error");
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setMessage("Bank account number must contain exactly 10 digits.");
      setMessageType("error");
      return;
    }

    if (!bankCode) {
      setMessage("Please select your bank.");
      setMessageType("error");
      return;
    }

    if (!consent) {
      setMessage("Please accept the identity verification consent.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/paystack/dedicated-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bvn,
          accountNumber,
          bankCode,
          consent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || "Unable to submit your request.");
        setMessageType("error");
        return;
      }

      setMessage(
        data.message ||
          "Your virtual account request has been submitted successfully.",
      );
      setMessageType("success");

      setBvn("");
      setAccountNumber("");
      setBankCode("");
      setConsent(false);

      window.dispatchEvent(new Event("walletUpdated"));

      setTimeout(() => {
        router.push("/dashboard/wallet");
        router.refresh();
      }, 2500);
    } catch (error) {
      console.error("VIRTUAL ACCOUNT FORM ERROR:", error);

      setMessage("Something went wrong. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-950 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link
          href="/dashboard/wallet"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-indigo-600 dark:text-gray-300"
        >
          <ArrowLeft size={17} />
          Back to Wallet
        </Link>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="bg-gradient-to-r from-indigo-700 to-purple-800 p-6 text-white">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Building2 size={25} />
            </div>

            <h1 className="text-xl font-bold sm:text-2xl">
              Create Virtual Account
            </h1>

            <p className="mt-2 text-sm leading-6 text-indigo-100">
              Get your personal bank account and receive wallet deposits through
              bank transfers.
            </p>
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-6 flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900 dark:bg-indigo-950/40">
              <ShieldCheck
                size={21}
                className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
              />

              <div>
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  Secure identity verification
                </p>

                <p className="mt-1 text-xs leading-5 text-indigo-800 dark:text-indigo-300">
                  Your information is submitted securely to Paystack for
                  identity verification and virtual account assignment.
                </p>
              </div>
            </div>

            {message && (
              <div
                className={`mb-5 flex gap-2 rounded-lg p-3 text-sm ${
                  messageType === "success"
                    ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                    : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                }`}
              >
                {messageType === "success" ? (
                  <CheckCircle2 size={18} className="shrink-0" />
                ) : (
                  <AlertCircle size={18} className="shrink-0" />
                )}

                <p>{message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="bvn"
                  className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  Bank Verification Number (BVN)
                </label>

                <input
                  id="bvn"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  value={bvn}
                  onChange={(e) =>
                    setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder="Enter your 11-digit BVN"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-indigo-900"
                />

                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Enter the BVN linked to your bank account.
                </p>
              </div>

              <div>
                <label
                  htmlFor="bank"
                  className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  Select Your Existing Bank
                </label>

                <select
                  id="bank"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  required
                  disabled={loadingBanks}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-indigo-900"
                >
                  <option value="">
                    {loadingBanks ? "Loading banks..." : "Choose your bank"}
                  </option>

                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>

                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Select the bank where your BVN-linked account is registered.
                </p>
              </div>

              <div>
                <label
                  htmlFor="accountNumber"
                  className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  Existing Bank Account Number
                </label>

                <input
                  id="accountNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="Enter your 10-digit account number"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-indigo-900"
                />
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-indigo-600"
                  />

                  <span className="text-xs leading-5 text-gray-600 dark:text-gray-300">
                    I voluntarily consent to Brainfriend Global Tech and
                    Paystack processing my BVN and bank account details for
                    identity verification and virtual account creation. I
                    confirm that the information I have provided is accurate and
                    belongs to me.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !consent || loadingBanks}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:from-indigo-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing Request...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Create Virtual Account
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
              Your account will appear in your wallet after Paystack completes
              its verification and assignment process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
