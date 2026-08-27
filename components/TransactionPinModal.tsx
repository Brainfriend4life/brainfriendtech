"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
}

export default function TransactionPinModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function verifyPin() {
    if (pin.length !== 4) {
      toast.error("Enter your 4 digit transaction PIN");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      toast.error("Invalid transaction PIN");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Invalid transaction PIN"
        );
      }

      toast.success(
        "PIN verified. Processing purchase..."
      );

      const verifiedPin = pin;

      setPin("");

      onClose();

      onSuccess(verifiedPin);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "PIN verification failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50 px-4
        backdrop-blur-sm
      "
    >
      <div
        className="
          w-full max-w-sm
          rounded-2xl
          border border-gray-200
          bg-white
          p-6
          shadow-2xl
          transition-colors duration-300
          dark:border-slate-700
          dark:bg-slate-900
        "
      >
        {/* HEADER */}

        <div className="mb-5">
          <h2
            className="
              text-xl
              font-bold
              text-gray-900
              dark:text-white
            "
          >
            Enter Transaction PIN
          </h2>

          <p
            className="
              mt-1
              text-sm
              text-gray-500
              dark:text-slate-400
            "
          >
            Enter your 4 digit PIN to continue
          </p>
        </div>

        {/* PIN INPUT */}

        <input
          type="password"
          maxLength={4}
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => {
            setPin(
              e.target.value.replace(/\D/g, "")
            );
          }}
          placeholder="••••"
          disabled={loading}
          className="
            w-full
            rounded-xl
            border
            border-gray-200
            bg-gray-50
            p-4
            text-center
            text-2xl
            font-bold
            tracking-[15px]
            text-gray-900
            outline-none
            transition
            placeholder:text-gray-300
            focus:border-indigo-500
            focus:bg-white
            focus:ring-2
            focus:ring-indigo-500/20
            disabled:cursor-not-allowed
            disabled:opacity-60
            dark:border-slate-700
            dark:bg-slate-800
            dark:text-white
            dark:placeholder:text-slate-600
            dark:focus:border-indigo-400
            dark:focus:bg-slate-800
            dark:focus:ring-indigo-400/20
          "
        />

        {/* CONTINUE */}

        <button
          type="button"
          onClick={verifyPin}
          disabled={loading}
          className="
            mt-5
            w-full
            rounded-xl
            bg-indigo-600
            p-3
            font-semibold
            text-white
            transition
            hover:bg-indigo-700
            active:scale-[0.99]
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:bg-indigo-500
            dark:hover:bg-indigo-600
          "
        >
          {loading
            ? "Verifying..."
            : "Continue"}
        </button>

        {/* CANCEL */}

        <button
          type="button"
          onClick={() => {
            setPin("");
            onClose();
          }}
          disabled={loading}
          className="
            mt-3
            w-full
            rounded-xl
            border
            border-gray-200
            bg-white
            p-3
            font-medium
            text-gray-700
            transition
            hover:bg-gray-50
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:border-slate-700
            dark:bg-slate-800
            dark:text-slate-200
            dark:hover:bg-slate-700
          "
        >
          Cancel
        </button>
      </div>
    </div>
  );
}