"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-hot-toast";
import TransactionPinModal from "@/components/TransactionPinModal";

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
  serviceFeePercentage: number;
};

const PROVIDERS = [
  "DSTV",
  "GOTV",
  "STARTIMES",
];

export default function CablePage() {
  const [plans, setPlans] =
    useState<CablePlan[]>([]);

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

  const [
    serviceFeePercentage,
    setServiceFeePercentage,
  ] = useState<number | null>(null);

  const [
    loadingServiceFee,
    setLoadingServiceFee,
  ] = useState(true);

  const [showPinModal, setShowPinModal] =
    useState(false);

  const [receipt, setReceipt] =
    useState<Receipt | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadServiceFee() {
      try {
        setLoadingServiceFee(true);

        const response = await fetch(
          "/api/service-fee",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache",
            },
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
          console.error(
            "CABLE SERVICE FEE NON-JSON RESPONSE:",
            responseText
          );

          throw new Error(
            `Service fee API returned an invalid response (${response.status}).`
          );
        }

        console.log(
          "CABLE SERVICE FEE RESPONSE:",
          result
        );

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Unable to load service fee."
          );
        }

        const percentage = Number(
          result.percentage ??
            result.serviceFeePercentage ??
            result.serviceFee ??
            result.data?.percentage ??
            result.data?.serviceFeePercentage ??
            result.data?.serviceFee ??
            result.data?.value ??
            result.setting?.value
        );

        if (
          !Number.isFinite(percentage) ||
          percentage < 0 ||
          percentage > 100
        ) {
          throw new Error(
            "Invalid service fee percentage returned by the server."
          );
        }

        if (!cancelled) {
          setServiceFeePercentage(
            percentage
          );
        }
      } catch (error) {
        console.error(
          "LOAD CABLE SERVICE FEE ERROR:",
          error
        );

        if (!cancelled) {
          setServiceFeePercentage(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingServiceFee(false);
        }
      }
    }

    loadServiceFee();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        setLoadingPlans(true);

        const response =
          await fetch(
            `/api/cable/plans?provider=${encodeURIComponent(
              provider
            )}`,
            {
              method: "GET",
              cache: "no-store",
              headers: {
                Accept: "application/json",
              },
            }
          );

        const text =
          await response.text();

        let result: any = null;

        try {
          result = text
            ? JSON.parse(text)
            : null;
        } catch {
          console.error(
            "CABLE PLANS NON-JSON RESPONSE:",
            text
          );

          throw new Error(
            `Cable plans API returned an invalid response (${response.status}).`
          );
        }

        console.log(
          "CABLE PLANS RESPONSE:",
          result
        );

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Unable to load cable plans."
          );
        }

        if (!cancelled) {
          setPlans(
            Array.isArray(result.data)
              ? result.data
              : []
          );
        }
      } catch (error) {
        console.error(
          "LOAD CABLE PLANS ERROR:",
          error
        );

        if (!cancelled) {
          setPlans([]);

          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load cable plans."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPlans(false);
        }
      }
    }

    loadPlans();

    setPlanId("");
    setVerified(false);
    setCustomerName("");

    return () => {
      cancelled = true;
    };
  }, [provider]);

  const filteredPlans =
    useMemo(() => {
      return plans.filter(
        (plan) =>
          String(
            plan.provider
          ).toUpperCase() ===
          provider.toUpperCase()
      );
    }, [
      plans,
      provider,
    ]);

  const selectedPlan =
    filteredPlans.find(
      (plan) =>
        String(plan.id) ===
        planId
    );

  const amount = Number(
    selectedPlan?.price || 0
  );

  const serviceFee =
    serviceFeePercentage !== null &&
    amount > 0
      ? Number(
          (
            amount *
            (serviceFeePercentage / 100)
          ).toFixed(2)
        )
      : 0;

  const totalAmount =
    serviceFeePercentage !== null &&
    amount > 0
      ? Number(
          (
            amount +
            serviceFee
          ).toFixed(2)
        )
      : amount;

  function handleProviderChange(
    value: string
  ) {
    setProvider(value);
    setPlanId("");
    setVerified(false);
    setCustomerName("");
  }

  function handlePlanChange(
    value: string
  ) {
    setPlanId(value);
  }

  async function verifySmartCard() {
    const cleanCard =
      cardnumber.trim();

    if (!cleanCard) {
      toast.error(
        "Enter Smart Card / IUC number."
      );

      return;
    }

    setVerifying(true);
    setVerified(false);
    setCustomerName("");

    try {
      const response =
        await fetch(
          "/api/cable/verify",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
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

      const responseText =
        await response.text();

      let result: any = null;

      try {
        result = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        console.error(
          "CABLE VERIFY NON-JSON RESPONSE:",
          responseText
        );

        throw new Error(
          `Cable verification API returned an invalid response (${response.status}).`
        );
      }

      console.log(
        "CABLE VERIFY RESPONSE:",
        result
      );

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Smart Card verification failed."
        );
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
        "Verified Customer";

      setCustomerName(
        String(name)
      );

      setVerified(true);

      toast.success(
        "Smart Card verified successfully."
      );
    } catch (error) {
      console.error(
        "VERIFY SMART CARD ERROR:",
        error
      );

      setVerified(false);
      setCustomerName("");

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to verify Smart Card."
      );
    } finally {
      setVerifying(false);
    }
  }

  function buyCable(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!planId) {
      toast.error(
        "Please select subscription plan."
      );

      return;
    }

    if (!selectedPlan) {
      toast.error(
        "Invalid subscription plan."
      );

      return;
    }

    if (!cardnumber.trim()) {
      toast.error(
        "Enter Smart Card number."
      );

      return;
    }

    if (!verified) {
      toast.error(
        "Verify Smart Card first."
      );

      return;
    }

    if (
      serviceFeePercentage === null ||
      loadingServiceFee
    ) {
      toast.error(
        "Service fee is still loading. Please wait and try again."
      );

      return;
    }

    if (amount <= 0) {
      toast.error(
        "Invalid subscription amount."
      );

      return;
    }

    const cleanPhone =
      phone
        .replace(/\s+/g, "")
        .trim();

    if (
      !/^0\d{10}$/.test(
        cleanPhone
      )
    ) {
      toast.error(
        "Enter valid Nigerian phone number."
      );

      return;
    }

    setShowPinModal(true);
  }

  async function processBuyCable(
    pin: string
  ) {
    const cleanCard =
      cardnumber.trim();

    const cleanPhone =
      phone
        .replace(/\s+/g, "")
        .trim();

    if (!selectedPlan) {
      toast.error(
        "Invalid subscription plan."
      );

      return;
    }

    setBuying(true);

    try {
      const payload = {
        planId:
          Number(
            selectedPlan.id
          ),

        cardnumber:
          cleanCard,

        phone:
          cleanPhone,

        transactionPin:
          pin,
      };

      console.log(
        "CABLE PURCHASE REQUEST:",
        {
          planId:
            Number(
              selectedPlan.id
            ),
          cardnumber:
            cleanCard,
          phone:
            cleanPhone,
        }
      );

      const response =
        await fetch(
          "/api/cable/purchase",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
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
        console.error(
          "CABLE PURCHASE NON-JSON RESPONSE:",
          responseText
        );

        throw new Error(
          `Cable purchase API returned an invalid response (${response.status}).`
        );
      }

      console.log(
        "CABLE PURCHASE RESPONSE:",
        result
      );

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Cable subscription failed."
        );
      }

      const finalAmount =
        Number(
          result.amount ??
            amount
        );

      const finalServiceFee =
        Number(
          result.serviceFee ??
            0
        );

      const finalTotalAmount =
        Number(
          result.totalAmount ??
            (
              finalAmount +
              finalServiceFee
            )
        );

      const finalServiceFeePercentage =
        Number(
          result.serviceFeePercentage ??
            serviceFeePercentage ??
            0
        );

      if (
        Number.isFinite(
          finalServiceFeePercentage
        )
      ) {
        setServiceFeePercentage(
          finalServiceFeePercentage
        );
      }

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
          finalAmount,

        serviceFee:
          finalServiceFee,

        totalAmount:
          finalTotalAmount,

        serviceFeePercentage:
          finalServiceFeePercentage,

        reference:
          result.reference ||
          result.transactionReference ||
          "N/A",

        providerReference:
          result.providerReference ||
          result.provider_transaction_id ||
          "N/A",

        status:
          result.status ||
          "SUCCESS",
      };

      setReceipt(
        receiptData
      );

      setShowPinModal(
        false
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
        error instanceof Error
          ? error.message
          : "Cable subscription failed."
      );
    } finally {
      setBuying(false);
    }
  }

  function closeReceipt() {
    setReceipt(null);

    setPlanId("");

    setCardnumber("");

    setPhone("");

    setCustomerName("");

    setVerified(false);
  }

  if (receipt) {
    return (
      <div className="w-full">

        {/* HEADER */}

        <div className="mb-6 text-center">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-600 dark:bg-green-950/40 dark:text-green-400">
            ✓
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Subscription Successful
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your cable subscription was completed successfully.
          </p>

        </div>

        {/* RECEIPT */}

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              Provider
            </span>

            <span className="text-right font-semibold text-foreground">
              {receipt.provider}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              Package
            </span>

            <span className="text-right font-semibold text-foreground">
              {receipt.planName}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              Customer
            </span>

            <span className="text-right font-semibold text-foreground">
              {receipt.customerName}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              Smart Card
            </span>

            <span className="text-right font-semibold text-foreground">
              {receipt.cardnumber}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              Phone
            </span>

            <span className="text-right font-semibold text-foreground">
              {receipt.phone}
            </span>
          </div>

          <div className="border-t border-border pt-4" />

          {/* SUBSCRIPTION AMOUNT */}

          <div className="flex justify-between text-foreground">
            <span>
              Subscription
            </span>

            <span>
              ₦
              {receipt.amount.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </span>
          </div>

          {/* SERVICE FEE */}

          <div className="flex justify-between text-foreground">
            <span>
              Service Fee (
              {receipt.serviceFeePercentage}
              %)
            </span>

            <span>
              ₦
              {receipt.serviceFee.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </span>
          </div>

          {/* TOTAL */}

          <div className="flex justify-between border-t border-border pt-4 font-bold text-foreground">

            <span>
              Total Deducted
            </span>

            <span className="text-indigo-600 dark:text-indigo-400">
              ₦
              {receipt.totalAmount.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </span>

          </div>

        </div>

        {/* TRANSACTION DETAILS */}

        <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">

          <h2 className="mb-4 font-semibold text-foreground">
            Transaction Details
          </h2>

          <p className="text-sm text-foreground">
            Status:

            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
              {receipt.status}
            </span>
          </p>

          <p className="mt-3 break-all text-sm text-foreground">
            Reference:
            <br />
            <span className="font-medium">
              {receipt.reference}
            </span>
          </p>

          <p className="mt-3 break-all text-sm text-foreground">
            Provider Reference:
            <br />
            <span className="font-medium">
              {receipt.providerReference}
            </span>
          </p>

        </div>

        {/* DONE */}

        <button
          type="button"
          onClick={
            closeReceipt
          }
          className="mt-6 w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Done
        </button>

      </div>
    );
  }

  return (
    <div className="w-full">

      {/* HEADER */}

      <div className="mb-6">

        <h1 className="text-2xl font-bold text-foreground">
          Cable TV Subscription
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Subscribe to DSTV, GOTV and Startimes.
        </p>

      </div>

      {/* FORM */}

      <form
        onSubmit={
          buyCable
        }
        className="max-w-2xl space-y-5 rounded-2xl bg-card p-5 shadow-sm sm:p-6"
      >

        {/* PROVIDER */}

        <div>

          <label className="mb-2 block text-sm font-medium text-foreground">
            Provider
          </label>

          <select
            value={
              provider
            }
            onChange={(
              e
            ) =>
              handleProviderChange(
                e.target.value
              )
            }
            disabled={
              buying ||
              verifying
            }
            className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none transition focus:border-indigo-500"
          >

            {PROVIDERS.map(
              (
                item
              ) => (
                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>
              )
            )}

          </select>

        </div>

        {/* PACKAGE */}

        <div>

          <label className="mb-2 block text-sm font-medium text-foreground">
            Package
          </label>

          <select
            value={
              planId
            }
            onChange={(
              e
            ) =>
              handlePlanChange(
                e.target.value
              )
            }
            disabled={
              loadingPlans ||
              buying
            }
            className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none transition focus:border-indigo-500"
          >

            <option value="">
              {loadingPlans
                ? "Loading plans..."
                : "Select package"}
            </option>

            {filteredPlans.map(
              (
                plan
              ) => (
                <option
                  key={
                    plan.id
                  }
                  value={
                    plan.id
                  }
                >
                  {plan.name} - ₦
                  {plan.price.toLocaleString(
                    "en-NG"
                  )}
                </option>
              )
            )}

          </select>

        </div>

        {/* SMART CARD */}

        <div>

          <label className="mb-2 block text-sm font-medium text-foreground">
            Smart Card / IUC Number
          </label>

          <input
            type="text"
            inputMode="numeric"
            value={
              cardnumber
            }
            onChange={(
              e
            ) => {
              setCardnumber(
                e.target.value
              );

              setVerified(
                false
              );

              setCustomerName(
                ""
              );
            }}
            placeholder="Enter Smart Card number"
            disabled={
              verifying ||
              buying
            }
            className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none transition focus:border-indigo-500"
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

        {/* VERIFIED CUSTOMER */}

        {verified && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">

            Customer:

            <strong className="ml-1">
              {customerName}
            </strong>

          </div>
        )}

        {/* PHONE */}

        <div>

          <label className="mb-2 block text-sm font-medium text-foreground">
            Phone Number
          </label>

          <input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            value={
              phone
            }
            onChange={(
              e
            ) =>
              setPhone(
                e.target.value
              )
            }
            placeholder="08012345678"
            disabled={
              buying
            }
            className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none transition focus:border-indigo-500"
          />

        </div>

        {/* PRICE SUMMARY */}

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm dark:border-indigo-900 dark:bg-indigo-950/30">

          <p className="mb-3 font-semibold text-indigo-900 dark:text-indigo-200">
            Payment Summary
          </p>

          {/* SUBSCRIPTION */}

          <div className="flex justify-between">

            <span className="text-muted-foreground">
              Subscription
            </span>

            <span className="font-medium text-foreground">
              ₦
              {amount.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </span>

          </div>

          {/* SERVICE FEE */}

          <div className="mt-2 flex justify-between">

            <span className="text-muted-foreground">
              {loadingServiceFee
                ? "Loading service fee..."
                : serviceFeePercentage ===
                    null
                  ? "Service Fee unavailable"
                  : `Service Fee (${serviceFeePercentage}%)`}
            </span>

            <span className="font-medium text-foreground">

              {loadingServiceFee
                ? "..."
                : serviceFeePercentage ===
                    null
                  ? "—"
                  : `₦${serviceFee.toLocaleString(
                      "en-NG",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}`}

            </span>

          </div>

          {/* TOTAL */}

          {serviceFeePercentage !==
            null && (
            <>
              <div className="my-3 border-t border-indigo-200 dark:border-indigo-900" />

              <div className="flex justify-between">

                <span className="font-semibold text-foreground">
                  Total
                </span>

                <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                  ₦
                  {totalAmount.toLocaleString(
                    "en-NG",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>

              </div>
            </>
          )}

        </div>

        {/* SUBSCRIBE */}

        <button
          type="submit"
          disabled={
            buying ||
            verifying ||
            !verified ||
            !planId ||
            !phone ||
            serviceFeePercentage ===
              null ||
            loadingServiceFee
          }
          className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buying
            ? "Processing..."
            : "Subscribe"}
        </button>

      </form>

      {/* TRANSACTION PIN MODAL */}

      <TransactionPinModal
        open={
          showPinModal
        }
        onClose={() => {
          if (!buying) {
            setShowPinModal(
              false
            );
          }
        }}
        onSuccess={(
          pin
        ) => {
          processBuyCable(
            pin
          );
        }}
      />

    </div>
  );
}