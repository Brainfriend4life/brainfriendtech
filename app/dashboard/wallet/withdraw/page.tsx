"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { USER_PAYS_FEE, transferFee } from "@/lib/transfer-fee";

type Bank = { name: string; code: string };

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function WithdrawPage() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [pin, setPin] = useState("");

  const [banks, setBanks] = useState<Bank[]>([]);
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const withdrawalAmount = Number(amount);
  const fee =
    USER_PAYS_FEE && withdrawalAmount > 0 ? transferFee(withdrawalAmount) : 0;
  const payout = withdrawalAmount - fee;

  // Load banks once
  useEffect(() => {
    fetch("/api/wallet/banks")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setBanks(d.banks);
        else setError("Could not load banks. Please refresh the page.");
      })
      .catch(() => setError("Could not load banks. Please refresh the page."));
  }, []);

  // Verify the account name when bank + 10 digits are filled
  useEffect(() => {
    setAccountName("");
    if (accountNumber.length !== 10 || !bankCode) return;

    let cancelled = false;
    setResolving(true);
    setError("");

    fetch("/api/wallet/resolve-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountNumber, bankCode }),
    })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) setAccountName(data.accountName);
        else setError(data.error || "Could not verify this account.");
      })
      .catch(() => {
        if (!cancelled) setError("Could not verify this account.");
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountNumber, bankCode]);

  async function handleWithdraw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!withdrawalAmount || withdrawalAmount <= 0) {
      setError("Enter a valid withdrawal amount.");
      return;
    }

    if (!bankCode) {
      setError("Select your bank.");
      return;
    }

    if (accountNumber.length !== 10) {
      setError("Enter a valid 10-digit account number.");
      return;
    }

    if (!accountName) {
      setError("Wait for the account name to be verified.");
      return;
    }

    if (payout <= 0) {
      setError("Amount is too small after the transfer fee.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("Enter your transaction PIN.");
      return;
    }

    const bankName = banks.find((b) => b.code === bankCode)?.name || "";

    try {
      setLoading(true);

      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: withdrawalAmount,
          accountNumber,
          bankCode,
          bankName,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit withdrawal.");
        setPin("");
        return;
      }

      setSuccess(
        data.message ||
          "Withdrawal submitted. Your money is on its way to your bank account.",
      );

      window.dispatchEvent(new Event("walletUpdated"));

      setAmount("");
      setBankCode("");
      setAccountNumber("");
      setAccountName("");
      setPin("");

      setTimeout(() => {
        router.push("/dashboard/wallet");
      }, 2200);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/wallet"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to Wallet
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Withdraw Money
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Choose your bank, enter your account number and the amount you want to
          withdraw.
        </p>
      </div>

      <form
        onSubmit={handleWithdraw}
        className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Amount
          </label>

          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Bank
          </label>

          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className={`${inputClass} bg-white`}
          >
            <option value="">
              {banks.length ? "Select your bank" : "Loading banks..."}
            </option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Account Number
          </label>

          <input
            type="text"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) =>
              setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="10-digit account number"
            maxLength={10}
            className={inputClass}
          />

          {resolving && (
            <p className="mt-2 text-sm text-gray-500">Verifying account...</p>
          )}

          {accountName && (
            <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              {accountName}
            </p>
          )}
        </div>

        {withdrawalAmount > 0 && fee > 0 && (
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Transfer fee</span>
              <span>₦{fee.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold text-gray-900">
              <span>You will receive</span>
              <span>₦{Math.max(payout, 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Transaction PIN
          </label>

          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="Enter your transaction PIN"
            maxLength={6}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading || resolving || !accountName || pin.length < 4}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Processing..." : "Withdraw"}
        </button>
      </form>

      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
        <p className="text-sm text-yellow-800">
          <strong>Important:</strong> Check that the account name shown above is
          yours before you withdraw. Transfers to a wrong account cannot be
          reversed.
        </p>
      </div>
    </div>
  );
}
