"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  LockKeyhole,
  KeyRound,
  Mail,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

import { useSession } from "next-auth/react";

type Mode =
  | "overview"
  | "create"
  | "change"
  | "reset";

export default function SecurityPage() {
  const { data: session } = useSession();

  const [mode, setMode] =
    useState<Mode>("overview");

  const [loading, setLoading] =
    useState(false);

  const [currentPin, setCurrentPin] =
    useState("");

  const [newPin, setNewPin] =
    useState("");

  const [confirmPin, setConfirmPin] =
    useState("");

  const [otp, setOtp] =
    useState("");

  /*
   * Whether the user has reached the
   * OTP reset verification stage.
   */

  const [otpSent, setOtpSent] =
    useState(false);

  /*
   * Create PIN
   */

  async function handleCreatePin() {
    if (!/^\d{4}$/.test(newPin)) {
      toast.error(
        "PIN must be exactly 4 digits."
      );
      return;
    }

    if (newPin !== confirmPin) {
      toast.error(
        "PINs do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/security/transaction-pin/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            pin: newPin,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(
          data.message ||
            "Unable to create PIN."
        );
        return;
      }

      toast.success(
        "Transaction PIN created successfully."
      );

      clearFields();
      setMode("overview");
    } catch (error) {
      console.error(
        "CREATE PIN ERROR:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Change PIN
   */

  async function handleChangePin() {
    if (!/^\d{4}$/.test(currentPin)) {
      toast.error(
        "Current PIN must be exactly 4 digits."
      );
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      toast.error(
        "New PIN must be exactly 4 digits."
      );
      return;
    }

    if (newPin !== confirmPin) {
      toast.error(
        "New PINs do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/security/transaction-pin/change",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            currentPin,
            newPin,
            confirmPin,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(
          data.message ||
            "Unable to change PIN."
        );
        return;
      }

      toast.success(
        "Transaction PIN changed successfully."
      );

      clearFields();
      setMode("overview");
    } catch (error) {
      console.error(
        "CHANGE PIN ERROR:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Request reset OTP
   */

  async function handleRequestReset() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/security/transaction-pin/reset/request",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(
          data.message ||
            "Unable to send verification code."
        );
        return;
      }

      toast.success(
        "Verification code sent to your email."
      );

      setOtpSent(true);
    } catch (error) {
      console.error(
        "REQUEST PIN RESET ERROR:",
        error
      );

      toast.error(
        "Unable to send verification code."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Verify OTP and reset PIN
   */

  async function handleResetPin() {
    if (!/^\d{6}$/.test(otp)) {
      toast.error(
        "Enter the 6-digit verification code."
      );
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      toast.error(
        "New PIN must be exactly 4 digits."
      );
      return;
    }

    if (newPin !== confirmPin) {
      toast.error(
        "New PINs do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/security/transaction-pin/reset/verify",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            otp,
            newPin,
            confirmPin,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(
          data.message ||
            "Unable to reset PIN."
        );
        return;
      }

      toast.success(
        "Transaction PIN reset successfully."
      );

      clearFields();
      setOtpSent(false);
      setMode("overview");
    } catch (error) {
      console.error(
        "RESET PIN ERROR:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearFields() {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setOtp("");
  }

  function goBack() {
    clearFields();
    setOtpSent(false);
    setMode("overview");
  }

  /*
   * OVERVIEW
   */

  if (mode === "overview") {
    return (
      <div className="space-y-6">
        {/* HEADER */}

        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck
                size={25}
              />
            </div>

            <div>
              <h1 className="text-xl font-bold sm:text-2xl">
                Account Security
              </h1>

              <p className="mt-1 text-sm text-indigo-100">
                Protect your wallet and transactions.
              </p>
            </div>
          </div>
        </div>

        {/* TRANSACTION PIN */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
              <LockKeyhole
                className="text-indigo-600 dark:text-indigo-400"
                size={20}
              />
            </div>

            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Transaction PIN
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your 4-digit PIN protects purchases and wallet transactions.
              </p>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* CREATE */}

            <button
              type="button"
              onClick={() => {
                clearFields();
                setMode("create");
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <KeyRound size={17} />
              Create PIN
            </button>

            {/* CHANGE */}

            <button
              type="button"
              onClick={() => {
                clearFields();
                setMode("change");
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950"
            >
              <LockKeyhole size={17} />
              Change PIN
            </button>

            {/* RESET */}

            <button
              type="button"
              onClick={() => {
                clearFields();
                setOtpSent(false);
                setMode("reset");
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:col-span-2"
            >
              <Mail size={17} />
              Reset PIN with Email OTP
            </button>
          </div>
        </div>

        {/* SECURITY NOTICE */}

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            />

            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Keep your PIN private
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                Never share your transaction PIN or email verification code with anyone, including someone claiming to be Brainfriend support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * CREATE / CHANGE / RESET PAGE
   */

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* BACK */}

      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400"
      >
        <ArrowLeft size={17} />
        Back to Security
      </button>

      {/* HEADER */}

      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            {mode === "reset" ? (
              <Mail size={24} />
            ) : (
              <LockKeyhole size={24} />
            )}
          </div>

          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              {mode === "create" &&
                "Create Transaction PIN"}

              {mode === "change" &&
                "Change Transaction PIN"}

              {mode === "reset" &&
                "Reset Transaction PIN"}
            </h1>

            <p className="mt-1 text-sm text-indigo-100">
              {mode === "create" &&
                "Create a secure 4-digit PIN for transactions."}

              {mode === "change" &&
                "Update your existing transaction PIN."}

              {mode === "reset" &&
                "Recover your PIN securely using your email."}
            </p>
          </div>
        </div>
      </div>

      {/* FORM CARD */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        {/* =========================
            CREATE
        ========================== */}

        {mode === "create" && (
          <div className="space-y-5">
            <PinInput
              label="New PIN"
              value={newPin}
              onChange={setNewPin}
            />

            <PinInput
              label="Confirm PIN"
              value={confirmPin}
              onChange={setConfirmPin}
            />

            <button
              type="button"
              onClick={handleCreatePin}
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating PIN..."
                : "Create Transaction PIN"}
            </button>
          </div>
        )}

        {/* =========================
            CHANGE
        ========================== */}

        {mode === "change" && (
          <div className="space-y-5">
            <PinInput
              label="Current PIN"
              value={currentPin}
              onChange={setCurrentPin}
            />

            <PinInput
              label="New PIN"
              value={newPin}
              onChange={setNewPin}
            />

            <PinInput
              label="Confirm New PIN"
              value={confirmPin}
              onChange={setConfirmPin}
            />

            <button
              type="button"
              onClick={handleChangePin}
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Changing PIN..."
                : "Change Transaction PIN"}
            </button>
          </div>
        )}

        {/* =========================
            RESET
        ========================== */}

        {mode === "reset" && (
          <div className="space-y-5">
            {!otpSent ? (
              <>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
                  <div className="flex items-start gap-3">
                    <Mail
                      size={19}
                      className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400"
                    />

                    <div>
                      <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">
                        Verify your identity
                      </p>

                      <p className="mt-1 text-xs leading-5 text-indigo-600 dark:text-indigo-400">
                        A 6-digit verification code will be sent to your registered email address.
                      </p>

                      {session?.user?.email && (
                        <p className="mt-2 break-all text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRequestReset}
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Sending Code..."
                    : "Send Verification Code"}
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    />

                    <div>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        Verification code sent
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                        Check your registered email and enter the 6-digit code below. The code expires in 10 minutes.
                      </p>
                    </div>
                  </div>
                </div>

                <OtpInput
                  value={otp}
                  onChange={setOtp}
                />

                <PinInput
                  label="New PIN"
                  value={newPin}
                  onChange={setNewPin}
                />

                <PinInput
                  label="Confirm New PIN"
                  value={confirmPin}
                  onChange={setConfirmPin}
                />

                <button
                  type="button"
                  onClick={handleResetPin}
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Resetting PIN..."
                    : "Reset Transaction PIN"}
                </button>

                <button
                  type="button"
                  onClick={handleRequestReset}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Send Code Again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * PIN INPUT
 */

function PinInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 4);

    onChange(value);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={value}
        onChange={handleChange}
        placeholder="••••"
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-bold tracking-[0.5em] text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
      />
    </div>
  );
}

/*
 * OTP INPUT
 */

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const value =
      e.target.value
        .replace(/\D/g, "")
        .slice(0, 6);

    onChange(value);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        Verification Code
      </label>

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={handleChange}
        placeholder="000000"
        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-bold tracking-[0.35em] text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
      />
    </div>
  );
}