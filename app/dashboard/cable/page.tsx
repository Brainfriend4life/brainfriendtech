
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Plan = {
  variation_code: string;
  name: string;
  variation_amount: string;
};

type Receipt = {
  serviceID: string;
  packageName: string;
  smartCard: string;
  customerName: string;
  amount: number;
  serviceFee: number;
  totalAmount: number;
  transactionId: string;
  requestId: string;
  status: string;
  phone: string;
};

export default function CablePage() {
  const [serviceID, setServiceID] = useState("dstv");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [variationCode, setVariationCode] = useState("");
  const [amount, setAmount] = useState("");
  const [smartCard, setSmartCard] = useState("");
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    fetchPlans();

    setVariationCode("");
    setAmount("");
    setVerified(false);
    setCustomerName("");
  }, [serviceID]);

  async function fetchPlans() {
    try {
      const res = await fetch(
        `/api/cable/plans?serviceID=${serviceID}`
      );

      const data = await res.json();

      const availablePlans =
        data.content?.variations || [];

      setPlans(availablePlans);
    } catch (error) {
      console.log(error);
      toast.error("Failed loading plans");
    }
  }

  function selectPlan(value: string) {
    setVariationCode(value);

    const selected = plans.find(
      (plan) =>
        plan.variation_code === value
    );

    if (selected) {
      setAmount(
        selected.variation_amount
      );
    }
  }

  async function verifySmartCard() {
    if (!smartCard.trim()) {
      toast.error(
        "Enter Smart Card number"
      );
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch(
        "/api/cable/verify",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            serviceID,
            smartCard:
              smartCard.trim(),
          }),
        }
      );

      const data = await res.json();

      console.log(
        "VERIFY RESULT:",
        data
      );

      if (!res.ok || !data.success) {
        setVerified(false);
        setCustomerName("");

        toast.error(
          data.message ||
            "Verification failed"
        );

        return;
      }

      const content =
        data.data?.content || {};

      const name =
        content.Customer_Name ||
        content.customer_name ||
        content.customerName ||
        content.Name ||
        "Verified Customer";

      setCustomerName(name);
      setVerified(true);

      toast.success(
        "Smart Card verified"
      );
    } catch (error) {
      console.log(error);

      setVerified(false);
      setCustomerName("");

      toast.error(
        "Verification error"
      );
    } finally {
      setVerifying(false);
    }
  }

  async function buyCable(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !variationCode ||
      !smartCard.trim() ||
      !phone.trim()
    ) {
      toast.error(
        "Complete all fields"
      );

      return;
    }

    if (!verified) {
      toast.error(
        "Verify Smart Card first"
      );

      return;
    }

    if (!amount) {
      toast.error(
        "Select a package"
      );

      return;
    }

    setLoading(true);

    try {
      const cableAmount =
        Number(amount);

      const serviceFee =
        cableAmount * 0.05;

      const totalAmount =
        cableAmount + serviceFee;

      const selectedPlan =
        plans.find(
          (plan) =>
            plan.variation_code ===
            variationCode
        );

      const payload = {
        serviceID,

        variation_code:
          variationCode,

        smartCard:
          smartCard.trim(),

        amount:
          cableAmount,

        phone:
          phone.trim(),
      };

      console.log(
        "CABLE PURCHASE PAYLOAD:",
        payload
      );

      const res = await fetch(
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

      const data = await res.json();

      console.log(
        "PURCHASE RESPONSE:",
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
            "Transaction failed"
        );

        return;
      }

      const vtpass =
        data.vtpass || {};

      const transaction =
        vtpass.content
          ?.transactions || {};

      const transactionId =
        transaction.transactionId ||
        vtpass.transactionId ||
        "N/A";

      const requestId =
        vtpass.requestId ||
        "N/A";

      const packageName =
        selectedPlan?.name ||
        transaction.product_name ||
        "Cable TV Subscription";

      const receiptData: Receipt = {
        serviceID,

        packageName,

        smartCard:
          smartCard.trim(),

        customerName:
          customerName ||
          vtpass.customerName ||
          "Customer",

        amount:
          Number(
            data.amount ||
              cableAmount
          ),

        serviceFee:
          Number(
            data.serviceFee ??
              serviceFee
          ),

        totalAmount:
          Number(
            data.totalAmount ??
              totalAmount
          ),

        transactionId,

        requestId,

        status:
          transaction.status ||
          "delivered",

        phone:
          phone.trim(),
      };

      setReceipt(receiptData);

      toast.success(
        "Cable subscription successful"
      );
    } catch (error) {
      console.log(error);

      toast.error(
        "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function closeReceipt() {
    setReceipt(null);
    setSmartCard("");
    setPhone("");
    setAmount("");
    setVariationCode("");
    setVerified(false);
    setCustomerName("");
  }

  /*
  ==========================================
  SUCCESS RECEIPT
  ==========================================
  */

  if (receipt) {
    return (
      <div className="w-full">
        {/* SUCCESS HEADER */}

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            ✓
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Subscription Successful
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Your cable TV subscription
            was completed successfully.
          </p>
        </div>

        {/* RECEIPT */}

        <div className="space-y-4 rounded-xl border bg-gray-50 p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-gray-500">
              Provider
            </span>

            <span className="font-semibold uppercase sm:text-right">
              {receipt.serviceID}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-gray-500">
              Package
            </span>

            <span className="break-words font-semibold sm:text-right">
              {receipt.packageName}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-gray-500">
              Customer
            </span>

            <span className="break-words font-semibold sm:text-right">
              {receipt.customerName}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-gray-500">
              Smart Card / IUC
            </span>

            <span className="break-all font-semibold sm:text-right">
              {receipt.smartCard}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-gray-500">
              Phone
            </span>

            <span className="break-all font-semibold sm:text-right">
              {receipt.phone}
            </span>
          </div>

          <div className="my-2 border-t" />

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-gray-500">
              Subscription
            </span>

            <span className="font-semibold sm:text-right">
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

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-gray-500">
              Service Fee (5%)
            </span>

            <span className="font-semibold sm:text-right">
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

          <div className="flex flex-col gap-1 border-t pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="font-bold text-gray-900">
              Total Deducted
            </span>

            <span className="font-bold text-indigo-600 sm:text-right">
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

        <div className="mt-5 rounded-xl border p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-gray-900">
            Transaction Details
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span className="text-gray-500">
                Status
              </span>

              <span className="font-semibold uppercase text-green-600 sm:text-right">
                {receipt.status}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-gray-500">
                Transaction ID
              </span>

              <span className="break-all font-medium sm:max-w-[70%] sm:text-right">
                {receipt.transactionId}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-gray-500">
                Request ID
              </span>

              <span className="break-all font-medium sm:max-w-[70%] sm:text-right">
                {receipt.requestId}
              </span>
            </div>
          </div>
        </div>

        {/* DONE BUTTON */}

        <button
          type="button"
          onClick={closeReceipt}
          className="mt-6 w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          Done
        </button>
      </div>
    );
  }

  /*
  ==========================================
  MAIN PAGE
  ==========================================
  */

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">
        Cable TV Subscription
      </h1>

      <form
        onSubmit={buyCable}
        className="space-y-5 rounded-xl bg-white p-4 shadow sm:p-6"
      >
        {/* PROVIDER */}

        <div>
          <label className="mb-2 block font-medium">
            Cable Provider
          </label>

          <select
            value={serviceID}
            onChange={(e) =>
              setServiceID(
                e.target.value
              )
            }
            disabled={loading}
            className="w-full rounded border p-3"
          >
            <option value="dstv">
              DSTV
            </option>

            <option value="gotv">
              GOTV
            </option>

            <option value="startimes">
              Startimes
            </option>
          </select>
        </div>

        {/* PACKAGE */}

        <div>
          <label className="mb-2 block font-medium">
            Subscription Package
          </label>

          <select
            value={variationCode}
            onChange={(e) =>
              selectPlan(
                e.target.value
              )
            }
            disabled={loading}
            className="w-full rounded border p-3"
          >
            <option value="">
              Select Package
            </option>

            {plans.map((plan) => (
              <option
                key={
                  plan.variation_code
                }
                value={
                  plan.variation_code
                }
              >
                {plan.name}
              </option>
            ))}
          </select>
        </div>

        {/* AMOUNT */}

        <div>
          <label className="mb-2 block font-medium">
            Subscription Amount
          </label>

          <input
            value={
              amount
                ? `₦${Number(
                    amount
                  ).toLocaleString(
                    "en-NG"
                  )}`
                : ""
            }
            readOnly
            placeholder="Select a package"
            className="w-full rounded border bg-gray-100 p-3"
          />

          {amount && (
            <p className="mt-2 text-sm text-gray-500">
              Service fee (5%): ₦
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

              <br />

              Total deduction: ₦
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
            </p>
          )}
        </div>

        {/* SMART CARD */}

        <div>
          <label className="mb-2 block font-medium">
            Smart Card / IUC Number
          </label>

          <input
            value={smartCard}
            onChange={(e) => {
              setSmartCard(
                e.target.value
              );

              setVerified(false);
              setCustomerName("");
            }}
            placeholder="Enter Smart Card / IUC number"
            disabled={loading}
            className="w-full rounded border p-3"
          />

          <button
            type="button"
            onClick={verifySmartCard}
            disabled={
              verifying ||
              loading ||
              !smartCard.trim()
            }
            className="mt-3 w-full rounded-lg bg-green-600 p-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifying
              ? "Verifying..."
              : "Verify Smart Card"}
          </button>
        </div>

        {/* VERIFIED CUSTOMER */}

        {verified && (
          <div className="rounded-lg bg-green-100 p-4 text-green-700">
            <p className="font-semibold">
              Customer Verified ✓
            </p>

            <p className="mt-1 break-words">
              Customer Name:{" "}
              <strong>
                {customerName}
              </strong>
            </p>

            <p className="mt-1 break-all text-sm">
              Smart Card: {smartCard}
            </p>
          </div>
        )}

        {/* PHONE */}

        <div>
          <label className="mb-2 block font-medium">
            Phone Number
          </label>

          <input
            type="tel"
            value={phone}
            onChange={(e) =>
              setPhone(
                e.target.value
              )
            }
            placeholder="08012345678"
            disabled={loading}
            maxLength={11}
            className="w-full rounded border p-3"
          />
        </div>

        {/* SUBSCRIBE */}

        <button
          type="submit"
          disabled={
            loading ||
            !verified ||
            !variationCode
          }
          className="w-full rounded-lg bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Processing..."
            : "Subscribe"}
        </button>
      </form>
    </div>
  );
}

