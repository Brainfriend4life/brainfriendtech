"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

type CablePlan = {
  id: number;
  provider: string;
  name: string;
  price: number;
};

type Receipt = {
  provider: string;
  planName: string;
  cardnumber: string;
  customerName: string;
  phone: string;
  amount: number;
  serviceFee: number;
  totalAmount: number;
  reference: string;
  providerReference: string;
  status: string;
};

const PROVIDERS = [
  "DSTV",
  "GOTV",
  "STARTIMES",
];

export default function CablePage() {
  const [plans, setPlans] = useState<CablePlan[]>([]);

  const [provider, setProvider] =
    useState("DSTV");

  const [planId, setPlanId] =
    useState("");

  const [cardnumber, setCardnumber] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [verified, setVerified] =
    useState(false);

  const [loadingPlans, setLoadingPlans] =
    useState(true);

  const [verifying, setVerifying] =
    useState(false);

  const [buying, setBuying] =
    useState(false);

  const [receipt, setReceipt] =
    useState<Receipt | null>(null);

  // ==========================================
  // LOAD CABLE PLANS
  // ==========================================

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);

        const response = await fetch(
          `/api/cable/plans?provider=${provider}`,
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        console.log(
          "CABLE PLANS:",
          result
        );

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to load cable plans."
          );
        }

        setPlans(
          Array.isArray(result.data)
            ? result.data
            : []
        );
      } catch (error) {
        console.error(
          "LOAD CABLE PLANS ERROR:",
          error
        );

        setPlans([]);

        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load cable plans."
        );
      } finally {
        setLoadingPlans(false);
      }
    }

    loadPlans();

    // Clear selected plan
    setPlanId("");

    // Clear verification
    setVerified(false);
    setCustomerName("");
  }, [provider]);

  // ==========================================
  // FILTER PLANS
  // ==========================================

  const filteredPlans = useMemo(() => {
    return plans.filter(
      (plan) =>
        plan.provider.toUpperCase() ===
        provider.toUpperCase()
    );
  }, [plans, provider]);

  // ==========================================
  // SELECT PROVIDER
  // ==========================================

  function handleProviderChange(
    value: string
  ) {
    setProvider(value);

    setPlanId("");

    setVerified(false);

    setCustomerName("");
  }

  // ==========================================
  // SELECT PLAN
  // ==========================================

  function handlePlanChange(
    value: string
  ) {
    setPlanId(value);
  }

  // ==========================================
  // SELECTED PLAN
  // ==========================================

  const selectedPlan =
    filteredPlans.find(
      (plan) =>
        String(plan.id) === planId
    );

  const amount =
    selectedPlan?.price || 0;

  const serviceFee =
    amount * 0.05;

  const totalAmount =
    amount + serviceFee;

  // ==========================================
  // VERIFY SMART CARD
  // ==========================================

  async function verifySmartCard() {
    const cleanCard =
      cardnumber.trim();

    if (!cleanCard) {
      toast.error(
        "Enter Smart Card / IUC number."
      );

      return;
    }

    if (!provider) {
      toast.error(
        "Please select a cable provider."
      );

      return;
    }

    setVerifying(true);

    setVerified(false);

    setCustomerName("");

    try {
      const response = await fetch(
        "/api/cable/verify",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            serviceID:
              provider.toLowerCase(),

            smartCard:
              cleanCard,

            cardnumber:
              cleanCard,
          }),
        }
      );

      const result =
        await response.json();

      console.log(
        "CABLE VERIFY RESPONSE:",
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        toast.error(
          result.message ||
            result.error ||
            "Smart Card verification failed."
        );

        return;
      }

      const content =
        result.data?.content ||
        result.content ||
        {};

      const name =
        content.Customer_Name ||
        content.customer_name ||
        content.customerName ||
        content.Name ||
        result.customerName ||
        "Verified Customer";

      setCustomerName(name);

      setVerified(true);

      toast.success(
        "Smart Card verified successfully."
      );
    } catch (error) {
      console.error(
        "SMART CARD VERIFY ERROR:",
        error
      );

      toast.error(
        "Unable to verify Smart Card."
      );
    } finally {
      setVerifying(false);
    }
  }

  // ==========================================
  // BUY CABLE
  // ==========================================

  async function buyCable(
    event: React.FormEvent
  ) {
    event.preventDefault();

    // ------------------------------
    // PLAN
    // ------------------------------

    if (!planId) {
      toast.error(
        "Please select a subscription plan."
      );

      return;
    }

    // ------------------------------
    // SMART CARD
    // ------------------------------

    const cleanCard =
      cardnumber.trim();

    if (!cleanCard) {
      toast.error(
        "Please enter Smart Card / IUC number."
      );

      return;
    }

    // ------------------------------
    // VERIFICATION
    // ------------------------------

    if (!verified) {
      toast.error(
        "Please verify your Smart Card first."
      );

      return;
    }

    // ------------------------------
    // PHONE
    // ------------------------------

    const cleanPhone =
      phone.replace(/\s+/g, "");

    if (
      !/^0\d{10}$/.test(cleanPhone)
    ) {
      toast.error(
        "Please enter a valid Nigerian phone number."
      );

      return;
    }

    // ------------------------------
    // PLAN
    // ------------------------------

    if (!selectedPlan) {
      toast.error(
        "Selected plan could not be found."
      );

      return;
    }

    setBuying(true);

    try {
      // ========================================
      // EXACT CHEAPDATAHUB PAYLOAD
      // ========================================

      const payload = {
        planId:
          Number(selectedPlan.id),

        cardnumber:
          cleanCard,

        phone:
          cleanPhone,
      };

      console.log(
        "CABLE PURCHASE PAYLOAD:",
        payload
      );

      // ========================================
      // PURCHASE
      // ========================================

      const response = await fetch(
        "/api/cable/purchase",
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

      const result =
        await response.json();

      console.log(
        "CABLE PURCHASE RESPONSE:",
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        toast.error(
          result.message ||
            result.error ||
            "Cable subscription failed."
        );

        return;
      }

      // ========================================
      // RECEIPT
      // ========================================

      const providerReference =
        result.providerReference ||
        result.providerResponse
          ?.reference ||
        result.providerResponse
          ?.transaction_id ||
        "N/A";

      const reference =
        result.reference ||
        "N/A";

      const receiptData: Receipt = {
        provider,

        planName:
          selectedPlan.name,

        cardnumber:
          cleanCard,

        customerName:
          customerName ||
          "Customer",

        phone:
          cleanPhone,

        amount:
          Number(
            result.amount ??
              amount
          ),

        serviceFee:
          Number(
            result.serviceFee ??
              serviceFee
          ),

        totalAmount:
          Number(
            result.totalAmount ??
              totalAmount
          ),

        reference,

        providerReference,

        status:
          result.status ||
          "SUCCESS",
      };

      setReceipt(
        receiptData
      );

      toast.success(
        "Cable subscription successful!"
      );
    } catch (error) {
      console.error(
        "CABLE PURCHASE ERROR:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );
    } finally {
      setBuying(false);
    }
  }

  // ==========================================
  // CLOSE RECEIPT
  // ==========================================

  function closeReceipt() {
    setReceipt(null);

    setPlanId("");

    setCardnumber("");

    setPhone("");

    setCustomerName("");

    setVerified(false);
  }

  // ==========================================
  // SUCCESS RECEIPT
  // ==========================================

  if (receipt) {
    return (
      <div className="w-full">
        {/* HEADER */}

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-600">
            ✓
          </div>

          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Subscription Successful
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Your cable TV subscription
            was completed successfully.
          </p>
        </div>

        {/* RECEIPT */}

        <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">
              Provider
            </span>

            <span className="font-semibold uppercase">
              {receipt.provider}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">
              Package
            </span>

            <span className="font-semibold sm:text-right">
              {receipt.planName}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">
              Customer
            </span>

            <span className="font-semibold sm:text-right">
              {receipt.customerName}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">
              Smart Card / IUC
            </span>

            <span className="break-all font-semibold sm:text-right">
              {receipt.cardnumber}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-gray-500">
              Phone
            </span>

            <span className="font-semibold">
              {receipt.phone}
            </span>
          </div>

          <div className="border-t pt-4" />

          <div className="flex justify-between">
            <span className="text-gray-500">
              Subscription
            </span>

            <span className="font-semibold">
              ₦
              {receipt.amount.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Service Fee (5%)
            </span>

            <span className="font-semibold">
              ₦
              {receipt.serviceFee.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </span>
          </div>

          <div className="flex justify-between border-t pt-4">
            <span className="font-bold">
              Total Deducted
            </span>

            <span className="font-bold text-indigo-600">
              ₦
              {receipt.totalAmount.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </span>
          </div>
        </div>

        {/* TRANSACTION */}

        <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">
            Transaction Details
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-gray-500">
                Status
              </span>

              <span className="font-semibold uppercase text-green-600">
                {receipt.status}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-gray-500">
                Reference
              </span>

              <span className="break-all font-medium">
                {receipt.reference}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-gray-500">
                Provider Reference
              </span>

              <span className="break-all font-medium">
                {receipt.providerReference}
              </span>
            </div>
          </div>
        </div>

        {/* DONE */}

        <button
          type="button"
          onClick={closeReceipt}
          className="mt-6 w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white transition hover:bg-indigo-700"
        >
          Done
        </button>
      </div>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Cable TV Subscription
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Select your provider, package and
          enter your Smart Card number.
        </p>
      </div>

      <form
        onSubmit={buyCable}
        className="w-full max-w-2xl space-y-5 rounded-2xl bg-white p-4 shadow-sm sm:p-6"
      >
        {/* PROVIDER */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Cable Provider
          </label>

          <select
            value={provider}
            onChange={(e) =>
              handleProviderChange(
                e.target.value
              )
            }
            disabled={
              loadingPlans ||
              buying
            }
            className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            {PROVIDERS.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>
        </div>

        {/* PLAN */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Subscription Package
          </label>

          <select
            value={planId}
            onChange={(e) =>
              handlePlanChange(
                e.target.value
              )
            }
            disabled={
              loadingPlans ||
              buying ||
              filteredPlans.length === 0
            }
            className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">
              {loadingPlans
                ? "Loading plans..."
                : filteredPlans.length ===
                  0
                ? "No plans available"
                : "Select package"}
            </option>

            {filteredPlans.map(
              (plan) => (
                <option
                  key={plan.id}
                  value={plan.id}
                >
                  {plan.name} - ₦
                  {Number(
                    plan.price
                  ).toLocaleString(
                    "en-NG"
                  )}
                </option>
              )
            )}
          </select>
        </div>

        {/* AMOUNT */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Subscription Amount
          </label>

          <input
            type="text"
            value={
              amount
                ? `₦${amount.toLocaleString(
                    "en-NG"
                  )}`
                : ""
            }
            readOnly
            placeholder="Select a package"
            className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3"
          />

          {amount > 0 && (
            <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
              <p>
                Service fee (5%):{" "}
                <strong>
                  ₦
                  {serviceFee.toLocaleString(
                    "en-NG",
                    {
                      minimumFractionDigits: 2,
                    }
                  )}
                </strong>
              </p>

              <p className="mt-1">
                Total deduction:{" "}
                <strong className="text-gray-700">
                  ₦
                  {totalAmount.toLocaleString(
                    "en-NG",
                    {
                      minimumFractionDigits: 2,
                    }
                  )}
                </strong>
              </p>
            </div>
          )}
        </div>

        {/* SMART CARD */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Smart Card / IUC Number
          </label>

          <input
            type="text"
            inputMode="numeric"
            value={cardnumber}
            onChange={(e) => {
              setCardnumber(
                e.target.value
              );

              setVerified(false);

              setCustomerName("");
            }}
            placeholder="Enter Smart Card / IUC number"
            disabled={buying}
            className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <button
            type="button"
            onClick={
              verifySmartCard
            }
            disabled={
              verifying ||
              buying ||
              !cardnumber.trim()
            }
            className="mt-3 w-full rounded-xl bg-green-600 p-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying
              ? "Verifying..."
              : "Verify Smart Card"}
          </button>
        </div>

        {/* VERIFIED */}

        {verified && (
          <div className="rounded-xl bg-green-50 p-4 text-green-700">
            <p className="font-semibold">
              Customer Verified ✓
            </p>

            <p className="mt-1">
              Customer Name:{" "}
              <strong>
                {customerName}
              </strong>
            </p>

            <p className="mt-1 text-sm">
              Smart Card:{" "}
              {cardnumber}
            </p>
          </div>
        )}

        {/* PHONE */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
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
            disabled={buying}
            className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* SUBSCRIBE */}

        <button
          type="submit"
          disabled={
            buying ||
            loadingPlans ||
            !planId ||
            !verified ||
            !phone.trim()
          }
          className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buying
            ? "Processing..."
            : "Subscribe"}
        </button>
      </form>
    </div>
  );
}