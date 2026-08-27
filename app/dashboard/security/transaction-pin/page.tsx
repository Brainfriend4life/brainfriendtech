"use client";

import { useState } from "react";
import {
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function TransactionPinPage() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function savePin() {
    if (!/^\d{4}$/.test(pin)) {
      alert("PIN must be exactly 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      alert("PIN does not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/security/transaction-pin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pin,
          }),
        }
      );

      const data = await res.json();

      alert(data.message);

      if (res.ok) {
        setPin("");
        setConfirmPin("");
      }
    } catch (error) {
      console.error(
        "TRANSACTION PIN ERROR:",
        error
      );

      alert(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">

      {/* PAGE HEADER */}

      <div>
        <h1
          className="
            text-2xl font-bold
            text-gray-900
            dark:text-white
          "
        >
          Transaction PIN
        </h1>

        <p
          className="
            mt-1 text-sm
            text-gray-500
            dark:text-slate-400
          "
        >
          Set a 4-digit PIN to authorize your
          transactions securely.
        </p>
      </div>

      {/* PIN CARD */}

      <div
        className="
          rounded-2xl
          border border-gray-200
          bg-white
          p-5
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
          sm:p-6
        "
      >

        {/* CARD HEADER */}

        <div className="mb-6 flex items-center gap-3">

          <div
            className="
              flex h-11 w-11 shrink-0
              items-center justify-center
              rounded-xl
              bg-indigo-100
              dark:bg-indigo-950/60
            "
          >
            <KeyRound
              className="
                h-5 w-5
                text-indigo-700
                dark:text-indigo-400
              "
            />
          </div>

          <div>
            <h2
              className="
                font-bold
                text-gray-900
                dark:text-white
              "
            >
              Create PIN
            </h2>

            <p
              className="
                text-xs
                text-gray-500
                dark:text-slate-400
              "
            >
              Keep your transaction PIN private.
            </p>
          </div>

        </div>

        {/* PIN INPUT */}

        <div className="space-y-4">

          <div>
            <label
              htmlFor="pin"
              className="
                mb-2 block text-sm font-semibold
                text-gray-700
                dark:text-slate-300
              "
            >
              Transaction PIN
            </label>

            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) =>
                setPin(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4)
                )
              }
              placeholder="Enter 4-digit PIN"
              autoComplete="new-password"
              className="
                w-full rounded-xl
                border border-gray-300
                bg-white
                px-4 py-3
                text-center
                text-lg font-bold
                tracking-[0.4em]
                text-gray-900
                outline-none
                transition
                placeholder:text-sm
                placeholder:font-normal
                placeholder:tracking-normal
                placeholder:text-gray-400
                focus:border-indigo-600
                focus:ring-4
                focus:ring-indigo-100
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-white
                dark:placeholder:text-slate-500
                dark:focus:border-indigo-500
                dark:focus:ring-indigo-500/20
              "
            />
          </div>

          {/* CONFIRM PIN */}

          <div>
            <label
              htmlFor="confirmPin"
              className="
                mb-2 block text-sm font-semibold
                text-gray-700
                dark:text-slate-300
              "
            >
              Confirm PIN
            </label>

            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4)
                )
              }
              placeholder="Confirm 4-digit PIN"
              autoComplete="new-password"
              className="
                w-full rounded-xl
                border border-gray-300
                bg-white
                px-4 py-3
                text-center
                text-lg font-bold
                tracking-[0.4em]
                text-gray-900
                outline-none
                transition
                placeholder:text-sm
                placeholder:font-normal
                placeholder:tracking-normal
                placeholder:text-gray-400
                focus:border-indigo-600
                focus:ring-4
                focus:ring-indigo-100
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-white
                dark:placeholder:text-slate-500
                dark:focus:border-indigo-500
                dark:focus:ring-indigo-500/20
              "
            />
          </div>

        </div>

        {/* SECURITY INFO */}

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

          <div>
            <p
              className="
                text-sm font-semibold
                text-green-800
                dark:text-green-300
              "
            >
              Keep your PIN secure
            </p>

            <p
              className="
                mt-1 text-xs leading-5
                text-green-700
                dark:text-green-400
              "
            >
              Never share your transaction PIN with
              anyone. It is used to authorize purchases
              and other wallet transactions.
            </p>
          </div>
        </div>

        {/* SAVE BUTTON */}

        <button
          type="button"
          onClick={savePin}
          disabled={
            loading ||
            pin.length !== 4 ||
            confirmPin.length !== 4
          }
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
            disabled:opacity-50
            dark:bg-indigo-600
            dark:hover:bg-indigo-500
          "
        >
          {loading ? (
            <>
              <span
                className="
                  h-4 w-4 animate-spin
                  rounded-full
                  border-2 border-white/30
                  border-t-white
                "
              />
              Saving...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Save Transaction PIN
            </>
          )}
        </button>

      </div>

      {/* FOOTER NOTE */}

      <p
        className="
          text-center text-xs
          text-gray-400
          dark:text-slate-500
        "
      >
        Your PIN is securely encrypted and should
        remain confidential.
      </p>

    </div>
  );
}