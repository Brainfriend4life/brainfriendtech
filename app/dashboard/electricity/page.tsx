"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import TransactionPinModal from "@/components/TransactionPinModal";

const DISCOS = [
  { id: 1, name: "Abuja Electric AEDC" },
  { id: 2, name: "Eko Electric (EKEDC)" },
  { id: 3, name: "Ibadan Electric (IBEDC)" },
  { id: 4, name: "Ikeja Electric (IKEDC)" },
  { id: 5, name: "Kaduna Electric" },
  { id: 6, name: "Port Harcourt Electric" },
  {
    id: 7,
    name: "Jos Electricity Distribution PLC (JEDplc)",
  },
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
  const [loadingFee, setLoadingFee] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [token, setToken] = useState("");
  const [units, setUnits] = useState("");

  const [serviceFeePercent, setServiceFeePercent] =
    useState<number | null>(null);

  const [serviceFee, setServiceFee] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [showPinModal, setShowPinModal] = useState(false);

  function formatMoney(value: number) {
    return `₦${value.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadServiceFee() {
      try {
        setLoadingFee(true);

        const response = await fetch(
          "/api/electricity/purchase",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const responseText = await response.text();

        let result: any = null;

        try {
          result = responseText
            ? JSON.parse(responseText)
            : null;
        } catch {
          throw new Error(
            "The electricity service-fee API returned an invalid response."
          );
        }

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Unable to load electricity service fee."
          );
        }

        const percentage = Number(
          result.serviceFeePercentage ??
            result.serviceFeePercent ??
            result.percentage
        );

        if (
          !Number.isFinite(percentage) ||
          percentage < 0 ||
          percentage > 100
        ) {
          throw new Error(
            "Invalid electricity service fee percentage."
          );
        }

        if (!cancelled) {
          setServiceFeePercent(percentage);
        }
      } catch (error) {
        console.error(
          "LOAD ELECTRICITY SERVICE FEE ERROR:",
          error
        );

        if (!cancelled) {
          setServiceFeePercent(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingFee(false);
        }
      }
    }

    loadServiceFee();

    return () => {
      cancelled = true;
    };
  }, []);

  const numericAmount = Number(amount);

  const calculatedServiceFee =
    serviceFeePercent !== null &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0
      ? Number(
          (
            numericAmount *
            (serviceFeePercent / 100)
          ).toFixed(2)
        )
      : 0;

  const calculatedTotal =
    serviceFeePercent !== null &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0
      ? Number(
          (
            numericAmount +
            calculatedServiceFee
          ).toFixed(2)
        )
      : 0;

  function validatePurchase() {
    if (!discoId) {
      toast.error(
        "Please select electricity provider."
      );

      return false;
    }

    const cleanedMeter =
      meterNumber.replace(/\s+/g, "");

    if (!/^\d{6,20}$/.test(cleanedMeter)) {
      toast.error(
        "Please enter valid meter number."
      );

      return false;
    }

    const numericAmountValue =
      Number(amount);

    if (
      !Number.isFinite(numericAmountValue) ||
      numericAmountValue <= 0
    ) {
      toast.error(
        "Please enter valid amount."
      );

      return false;
    }

    if (numericAmountValue < 100) {
      toast.error(
        "Minimum electricity amount is ₦100."
      );

      return false;
    }

    const cleanedPhone =
      phone
        .replace(/\s+/g, "")
        .trim();

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      toast.error(
        "Please enter valid Nigerian phone number."
      );

      return false;
    }

    return true;
  }

  function handlePurchase(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setMessage("");
    setToken("");
    setUnits("");

    if (!validatePurchase()) {
      return;
    }

    setShowPinModal(true);
  }

  async function processElectricity(
    pin: string
  ) {
    const cleanedMeter =
      meterNumber.replace(/\s+/g, "");

    const cleanedPhone =
      phone
        .replace(/\s+/g, "")
        .trim();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/electricity/purchase",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            discoId: Number(discoId),
            meterNumber: cleanedMeter,
            amount: Number(amount),
            meterType,
            phone: cleanedPhone,
            transactionPin: pin,
          }),
        }
      );

      const responseText =
        await response.text();

      let result: any = null;

      try {
        result = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`
        );
      }

      console.log(
        "ELECTRICITY RESPONSE:",
        result
      );

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Electricity purchase failed."
        );
      }

      const returnedFeePercent =
        result.serviceFeePercentage ??
        result.serviceFeePercent;

      if (
        returnedFeePercent !==
          undefined &&
        returnedFeePercent !== null
      ) {
        setServiceFeePercent(
          Number(returnedFeePercent)
        );
      }

      if (
        result.serviceFee !==
          undefined &&
        result.serviceFee !== null
      ) {
        setServiceFee(
          Number(result.serviceFee)
        );
      }

      if (
        result.totalAmount !==
          undefined &&
        result.totalAmount !== null
      ) {
        setTotalAmount(
          Number(result.totalAmount)
        );
      }

      setMessage(
        result.message ||
          "Electricity payment successful."
      );

      if (
        result.token !==
          undefined &&
        result.token !== null
      ) {
        setToken(
          String(result.token)
        );
      }

      if (
        result.units !==
          undefined &&
        result.units !== null
      ) {
        setUnits(
          String(result.units)
        );
      }

      setShowPinModal(false);

      setMeterNumber("");
      setAmount("");
      setPhone("");

      toast.success(
        "Electricity payment successful."
      );
    } catch (error) {
      console.error(
        "ELECTRICITY ERROR:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Electricity purchase failed.";

      setError(errorMessage);

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">

      {/* HEADER */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Buy Electricity
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Pay your electricity bill quickly and securely.
        </p>
      </div>

      <div className="w-full max-w-2xl rounded-2xl bg-card p-4 shadow-sm sm:p-6 lg:p-8">

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
            {message}
          </div>
        )}

        {/* TOKEN */}

        {token && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">

            <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">
              Electricity Token
            </p>

            <p className="break-all text-xl font-bold tracking-wider text-green-900 dark:text-green-200">
              {token}
            </p>

            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(
                  token
                )
              }
              className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              Copy Token
            </button>

          </div>
        )}

        {/* UNITS */}

        {units && (
          <div className="mb-5 rounded-xl bg-muted p-4">

            <p className="text-sm text-muted-foreground">
              Electricity Units
            </p>

            <p className="text-xl font-bold text-foreground">
              {units}
            </p>

          </div>
        )}

        {/* FORM */}

        <form onSubmit={handlePurchase}>

          <div className="space-y-5">

            {/* PROVIDER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Electricity Provider
              </label>

              <select
                value={discoId}
                onChange={(e) =>
                  setDiscoId(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-indigo-500"
              >

                <option value="">
                  Select electricity provider
                </option>

                {DISCOS.map(
                  (disco) => (
                    <option
                      key={disco.id}
                      value={disco.id}
                    >
                      {disco.name}
                    </option>
                  )
                )}

              </select>
            </div>

            {/* METER NUMBER */}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Meter Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={meterNumber}
                onChange={(e) =>
                  setMeterNumber(
                    e.target.value
                  )
                }
                placeholder="Enter meter number"
                disabled={loading}
                className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-indigo-500"
              />
            </div>

            {/* METER TYPE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Meter Type
              </label>

              <select
                value={meterType}
                onChange={(e) =>
                  setMeterType(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-indigo-500"
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
              <label className="mb-2 block text-sm font-medium text-foreground">
                Electricity Amount
              </label>

              <input
                type="number"
                inputMode="decimal"
                min="100"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                placeholder="Enter amount"
                disabled={loading}
                className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-indigo-500"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Minimum amount: ₦100
              </p>
            </div>

            {/* PHONE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Phone Number
              </label>

              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value
                  )
                }
                placeholder="08012345678"
                maxLength={11}
                disabled={loading}
                className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-indigo-500"
              />
            </div>

            {/* PAYMENT SUMMARY */}

            {amount &&
              Number(amount) >= 100 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">

                  <p className="mb-3 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                    Payment Summary
                  </p>

                  <div className="space-y-3">

                    {/* ELECTRICITY */}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Electricity Amount
                      </span>

                      <span className="font-medium text-foreground">
                        {formatMoney(
                          numericAmount
                        )}
                      </span>
                    </div>

                    {/* SERVICE FEE */}

                    {loadingFee ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Service Fee
                        </span>

                        <span className="text-muted-foreground">
                          Loading...
                        </span>
                      </div>
                    ) : serviceFeePercent !==
                      null ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Service Fee (
                          {serviceFeePercent}%)
                        </span>

                        <span className="font-medium text-foreground">
                          {formatMoney(
                            calculatedServiceFee
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Service Fee
                        </span>

                        <span className="text-muted-foreground">
                          Calculated at payment
                        </span>
                      </div>
                    )}

                    {/* TOTAL */}

                    {serviceFeePercent !==
                      null && (
                      <>
                        <div className="border-t border-indigo-200 dark:border-indigo-900" />

                        <div className="flex items-center justify-between">

                          <span className="font-semibold text-foreground">
                            Total Amount
                          </span>

                          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                            {formatMoney(
                              calculatedTotal
                            )}
                          </span>

                        </div>
                      </>
                    )}

                  </div>
                </div>
              )}

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

      {/* TRANSACTION PIN */}

      <TransactionPinModal
        open={showPinModal}
        onClose={() => {
          if (!loading) {
            setShowPinModal(false);
          }
        }}
        onSuccess={(pin) => {
          processElectricity(pin);
        }}
      />

    </div>
  );
}