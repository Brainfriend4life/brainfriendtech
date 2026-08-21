
"use client";

import { useEffect, useState } from "react";

type Bank = {
  name: string;
  code: string;
};

type BankAccountFormProps = {
  onSuccess: () => Promise<void> | void;
  onCancel: () => void;
};

export default function BankAccountForm({
  onSuccess,
  onCancel,
}: BankAccountFormProps) {
  const [banks, setBanks] = useState<Bank[]>([]);

  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");

  const [loadingBanks, setLoadingBanks] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // =====================================================
  // LOAD BANKS
  // =====================================================

  useEffect(() => {
    async function loadBanks() {
      try {
        setLoadingBanks(true);
        setError("");

        const response = await fetch(
          "/api/admin/business-wallet/banks",
          {
            cache: "no-store",
          }
        );

        const text = await response.text();

        let data: any;

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "The bank API returned an invalid response."
          );
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to load banks."
          );
        }

        setBanks(data.banks || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load banks."
        );
      } finally {
        setLoadingBanks(false);
      }
    }

    loadBanks();
  }, []);

  // =====================================================
  // CONNECT BANK
  // =====================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanAccountName =
      accountName.trim();

    const cleanAccountNumber =
      accountNumber.trim();

    if (!cleanAccountName) {
      setError("Enter the bank account name.");
      return;
    }

    if (!/^\d{10}$/.test(cleanAccountNumber)) {
      setError(
        "Enter a valid 10-digit Nigerian bank account number."
      );
      return;
    }

    if (!bankCode) {
      setError("Select your bank.");
      return;
    }

    const selectedBank = banks.find(
      (bank) => bank.code === bankCode
    );

    if (!selectedBank) {
      setError("Please select a valid bank.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/business-wallet/recipient",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountName: cleanAccountName,
            accountNumber: cleanAccountNumber,
            bankCode,
          }),
        }
      );

      const text = await response.text();

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "The server returned an invalid response. Check your terminal for the API error."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to connect bank account."
        );
      }

      setMessage(
        data.message ||
          "Bank account connected successfully."
      );

      await onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect bank account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-5">
      <h3 className="font-semibold text-gray-900">
        Connect Business Bank Account
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        Select your bank and enter the account details
        that should receive your business withdrawals.
      </p>

      {/* ERROR */}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-4"
      >
        {/* ACCOUNT NAME */}

        <div>
          <label className="text-sm font-medium text-gray-700">
            Account Name
          </label>

          <input
            type="text"
            value={accountName}
            onChange={(event) =>
              setAccountName(
                event.target.value
              )
            }
            placeholder="Brainfriend Global Tech"
            disabled={loading}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
          />

          <p className="mt-1 text-xs text-gray-500">
            Enter the name exactly as registered on the bank
            account.
          </p>
        </div>

        {/* BANK */}

        <div>
          <label className="text-sm font-medium text-gray-700">
            Bank
          </label>

          <select
            value={bankCode}
            onChange={(event) =>
              setBankCode(
                event.target.value
              )
            }
            disabled={
              loading ||
              loadingBanks
            }
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
          >
            <option value="">
              {loadingBanks
                ? "Loading banks..."
                : "Select your bank"}
            </option>

            {banks.map((bank) => (
              <option
                key={`${bank.code}-${bank.name}`}
                value={bank.code}
              >
                {bank.name}
              </option>
            ))}
          </select>
        </div>

        {/* ACCOUNT NUMBER */}

        <div>
          <label className="text-sm font-medium text-gray-700">
            Account Number
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(event) =>
              setAccountNumber(
                event.target.value.replace(
                  /\D/g,
                  ""
                )
              )
            }
            placeholder="0123456789"
            disabled={loading}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
          />

          <p className="mt-1 text-xs text-gray-500">
            Enter the 10-digit Nigerian bank account number.
          </p>
        </div>

        {/* BUTTONS */}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={
              loading ||
              loadingBanks ||
              banks.length === 0
            }
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Connecting..."
              : "Connect Bank Account"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

