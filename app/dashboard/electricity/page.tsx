
"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function ElectricityPage() {
  const [serviceID, setServiceID] = useState(
    "portharcourt-electric"
  );

  const [meterType, setMeterType] =
    useState("prepaid");

  const [meterNumber, setMeterNumber] =
    useState("");

  const [amount, setAmount] = useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [verified, setVerified] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  /*
  ==========================================
  SUCCESS PAYMENT DETAILS
  ==========================================
  */

  const [paymentSuccess, setPaymentSuccess] =
    useState(false);

  const [token, setToken] = useState("");

  const [units, setUnits] = useState("");

  const [transactionId, setTransactionId] =
    useState("");

  const [paidAmount, setPaidAmount] =
    useState(0);

  const [serviceFee, setServiceFee] =
    useState(0);

  const [totalDeducted, setTotalDeducted] =
    useState(0);

  /*
  ==========================================
  VERIFY METER
  ==========================================
  */

  async function verifyMeter() {
    if (!meterNumber.trim()) {
      toast.error("Enter meter number");
      return;
    }

    setVerifying(true);

    try {
      const payload = {
        serviceID,
        billersCode: meterNumber.trim(),
        type: meterType,
      };

      console.log(
        "FRONTEND ELECTRICITY VERIFY PAYLOAD:",
        payload
      );

      const res = await fetch(
        "/api/electricity/verify",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      console.log(
        "ELECTRICITY VERIFY RESPONSE:",
        data
      );

      if (!res.ok || !data.success) {
        setVerified(false);
        setCustomerName("");

        toast.error(
          data.message ||
            "Meter verification failed"
        );

        return;
      }

      const content =
        data.data?.content || {};

      const name =
        content.Customer_Name ||
        content.customer_name ||
        content.name ||
        "Verified Customer";

      setCustomerName(name);
      setVerified(true);

      toast.success(
        "Meter verified successfully"
      );
    } catch (error) {
      console.error(
        "ELECTRICITY VERIFY FRONTEND ERROR:",
        error
      );

      setVerified(false);
      setCustomerName("");

      toast.error(
        "Unable to verify meter"
      );
    } finally {
      setVerifying(false);
    }
  }

  /*
  ==========================================
  BUY ELECTRICITY
  ==========================================
  */

  async function buyElectricity(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!verified) {
      toast.error("Verify meter first");
      return;
    }

    if (!meterNumber.trim()) {
      toast.error("Enter meter number");
      return;
    }

    if (!amount) {
      toast.error(
        "Enter payment amount"
      );
      return;
    }

    const electricityAmount =
      Number(amount);

    if (
      !Number.isFinite(
        electricityAmount
      ) ||
      electricityAmount <= 0
    ) {
      toast.error(
        "Enter a valid amount"
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        serviceID,

        meterType,

        meterNumber:
          meterNumber.trim(),

        amount:
          electricityAmount,
      };

      console.log(
        "FRONTEND ELECTRICITY PURCHASE:",
        payload
      );

      const res = await fetch(
        "/api/electricity/purchase",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

      const data = await res.json();

      console.log(
        "ELECTRICITY PURCHASE RESPONSE:",
        data
      );

      if (
        !res.ok ||
        !data.success
      ) {
        toast.error(
          data.message ||
            data.vtpass
              ?.response_description ||
            "Electricity payment failed"
        );

        return;
      }

      /*
      ==========================================
      SUCCESSFUL PAYMENT
      ==========================================
      */

      const vtpass =
        data.vtpass || {};

      const transaction =
        vtpass.content?.transactions ||
        {};

      const electricityToken =
        vtpass.token ||
        vtpass.purchased_code ||
        "";

      const electricityUnits =
        vtpass.units ||
        "";

      const vtpassTransactionId =
        transaction.transactionId ||
        "";

      const vtpassCustomerName =
        vtpass.customerName ||
        customerName ||
        "Verified Customer";

      const fee =
        Number(
          data.serviceFee ||
            electricityAmount * 0.05
        );

      const total =
        Number(
          data.totalAmount ||
            electricityAmount + fee
        );

      setToken(
        electricityToken
      );

      setUnits(
        String(electricityUnits)
      );

      setTransactionId(
        vtpassTransactionId
      );

      setPaidAmount(
        electricityAmount
      );

      setServiceFee(
        fee
      );

      setTotalDeducted(
        total
      );

      setCustomerName(
        vtpassCustomerName
      );

      setPaymentSuccess(
        true
      );

      toast.success(
        data.message ||
          "Electricity payment successful"
      );
    } catch (error) {
      console.error(
        "ELECTRICITY PURCHASE ERROR:",
        error
      );

      toast.error(
        "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  ==========================================
  COPY TOKEN
  ==========================================
  */

  async function copyToken() {
    if (!token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        token.replace(
          "Token: ",
          ""
        )
      );

      toast.success(
        "Token copied!"
      );
    } catch {
      toast.error(
        "Unable to copy token"
      );
    }
  }

  /*
  ==========================================
  NEW PAYMENT
  ==========================================
  */

  function startNewPayment() {
    setPaymentSuccess(false);
    setToken("");
    setUnits("");
    setTransactionId("");
    setPaidAmount(0);
    setServiceFee(0);
    setTotalDeducted(0);
    setMeterNumber("");
    setAmount("");
    setCustomerName("");
    setVerified(false);
  }

  /*
  ==========================================
  PROVIDER CHANGE
  ==========================================
  */

  function handleProviderChange(
    value: string
  ) {
    setServiceID(value);
    setVerified(false);
    setCustomerName("");
  }

  /*
  ==========================================
  METER TYPE CHANGE
  ==========================================
  */

  function handleMeterTypeChange(
    value: string
  ) {
    setMeterType(value);
    setVerified(false);
    setCustomerName("");
  }

  /*
  ==========================================
  METER NUMBER CHANGE
  ==========================================
  */

  function handleMeterNumberChange(
    value: string
  ) {
    setMeterNumber(value);
    setVerified(false);
    setCustomerName("");
  }

  /*
  ==========================================
  SUCCESS SCREEN
  ==========================================
  */

  if (paymentSuccess) {
    return (
      <div className="w-full max-w-2xl">
        {/* SUCCESS HEADER */}

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            ✓
          </div>

          <h1 className="text-xl font-bold text-green-700 sm:text-2xl">
            Electricity Payment Successful
          </h1>

          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Your electricity payment has
            been processed successfully.
          </p>
        </div>

        {/* CUSTOMER */}

        <div className="mb-4 rounded-xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">
            Customer
          </p>

          <p className="break-words font-semibold">
            {customerName}
          </p>
        </div>

        {/* PAYMENT DETAILS */}

        <div className="space-y-3 rounded-xl border bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-500">
              Electricity Amount
            </span>

            <span className="text-right font-semibold">
              ₦
              {paidAmount.toLocaleString(
                "en-NG"
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-500">
              Service Fee
            </span>

            <span className="text-right font-semibold">
              ₦
              {serviceFee.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <span className="font-semibold">
              Total Deducted
            </span>

            <span className="text-right font-bold text-indigo-600">
              ₦
              {totalDeducted.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </span>
          </div>

          {units && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-500">
                Units
              </span>

              <span className="text-right font-semibold">
                {units} kWh
              </span>
            </div>
          )}
        </div>

        {/* TOKEN */}

        {token && (
          <div className="mt-5 rounded-xl bg-indigo-50 p-4 sm:p-5">
            <p className="mb-2 text-sm font-medium text-indigo-700">
              Electricity Token
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 rounded-lg bg-white p-3">
                <p className="break-all text-center font-mono text-base font-bold tracking-wide text-gray-900 sm:text-lg">
                  {token.replace(
                    "Token: ",
                    ""
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={copyToken}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 sm:w-auto"
              >
                Copy
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-gray-500">
              Enter this token on your prepaid
              electricity meter.
            </p>
          </div>
        )}

        {/* TRANSACTION ID */}

        {transactionId && (
          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
              Transaction ID
            </p>

            <p className="mt-1 break-all font-mono text-xs sm:text-sm">
              {transactionId}
            </p>
          </div>
        )}

        {/* NEW PAYMENT */}

        <button
          type="button"
          onClick={
            startNewPayment
          }
          className="mt-6 w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white hover:bg-indigo-700"
        >
          Make Another Payment
        </button>
      </div>
    );
  }

  /*
  ==========================================
  PAYMENT PAGE
  ==========================================
  */

  return (
    <div className="w-full">
      {/* PAGE HEADER */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Pay Electricity Bill
        </h1>

        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Verify your meter and pay your
          electricity bill securely.
        </p>
      </div>

      {/* PAYMENT FORM */}

      <form
        onSubmit={buyElectricity}
        className="w-full max-w-2xl space-y-5 rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8"
      >
        {/* PROVIDER */}

        <div>
          <label
            htmlFor="provider"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Electricity Provider
          </label>

          <select
            id="provider"
            value={serviceID}
            onChange={(e) =>
              handleProviderChange(
                e.target.value
              )
            }
            disabled={loading || verifying}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
          >
            <option value="portharcourt-electric">
              Port Harcourt Electric - PHED
            </option>

            <option value="ikeja-electric">
              Ikeja Electric - IKEDC
            </option>

            <option value="eko-electric">
              Eko Electric - EKEDC
            </option>

            <option value="abuja-electric">
              Abuja Electric - AEDC
            </option>

            <option value="kano-electric">
              Kano Electric - KEDCO
            </option>

            <option value="jos-electric">
              Jos Electric - JED
            </option>

            <option value="kaduna-electric">
              Kaduna Electric - KAEDCO
            </option>

            <option value="enugu-electric">
              Enugu Electric - EEDC
            </option>

            <option value="ibadan-electric">
              Ibadan Electric - IBEDC
            </option>

            <option value="benin-electric">
              Benin Electric - BEDC
            </option>

            <option value="aba-electric">
              Aba Electric - ABEDC
            </option>

            <option value="yola-electric">
              Yola Electric - YEDC
            </option>
          </select>
        </div>

        {/* METER TYPE */}

        <div>
          <label
            htmlFor="meter-type"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Meter Type
          </label>

          <select
            id="meter-type"
            value={meterType}
            onChange={(e) =>
              handleMeterTypeChange(
                e.target.value
              )
            }
            disabled={loading || verifying}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
          >
            <option value="prepaid">
              Prepaid
            </option>

            <option value="postpaid">
              Postpaid
            </option>
          </select>
        </div>

        {/* METER NUMBER */}

        <div>
          <label
            htmlFor="meter-number"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Meter Number
          </label>

          <input
            id="meter-number"
            type="text"
            inputMode="numeric"
            value={meterNumber}
            onChange={(e) =>
              handleMeterNumberChange(
                e.target.value
              )
            }
            placeholder="Enter meter number"
            disabled={loading || verifying}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
          />

          <button
            type="button"
            onClick={verifyMeter}
            disabled={
              verifying ||
              loading ||
              !meterNumber.trim()
            }
            className="mt-3 w-full rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {verifying
              ? "Verifying..."
              : "Verify Meter"}
          </button>
        </div>

        {/* VERIFIED CUSTOMER */}

        {verified && (
          <div className="rounded-xl bg-green-100 p-4 text-green-700">
            <p className="font-medium">
              Meter Verified ✓
            </p>

            <p className="mt-1 break-words text-sm sm:text-base">
              Customer Name:{" "}
              <strong>
                {customerName}
              </strong>
            </p>

            <p className="mt-1 break-all text-sm">
              Meter: {meterNumber}
            </p>
          </div>
        )}

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
            min="1"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            placeholder="Enter amount"
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:text-base"
          />

          {amount &&
            Number(amount) > 0 && (
              <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">
                    Service fee (5%)
                  </span>

                  <span className="font-medium">
                    ₦
                    {(
                      Number(amount) *
                      0.05
                    ).toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-4 font-semibold">
                  <span>
                    Total deduction
                  </span>

                  <span className="text-indigo-600">
                    ₦
                    {(
                      Number(amount) *
                      1.05
                    ).toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
              </div>
            )}
        </div>

        {/* PURCHASE BUTTON */}

        <button
          type="submit"
          disabled={
            loading || !verified
          }
          className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Processing..."
            : "Pay Electricity"}
        </button>
      </form>
    </div>
  );
}

