"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "loading" | "success" | "error";

function WalletSuccessContent() {
  const params = useSearchParams();

  const [status, setStatus] =
    useState<Status>("loading");

  const [message, setMessage] = useState(
    "Please wait while we confirm your payment."
  );

  const [amount, setAmount] =
    useState<number | null>(null);

  const [reference, setReference] =
    useState<string>("");

  useEffect(() => {
    const paymentReference =
      params.get("reference");

    if (!paymentReference) {
      setStatus("error");
      setMessage(
        "Payment reference was not found."
      );
      return;
    }

    setReference(paymentReference);

    async function verifyPayment() {
      try {
        const res = await fetch(
          "/api/paystack/verify",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              reference:
                paymentReference,
            }),
          }
        );

        const data =
          await res.json();

        if (!res.ok || !data.success) {
          throw new Error(
            data.message ||
              "Payment verification failed."
          );
        }

        setAmount(
          typeof data.amount === "number"
            ? data.amount
            : null
        );

        setStatus("success");

        setMessage(
          data.alreadyCredited
            ? "This payment has already been credited to your wallet."
            : "Your payment has been verified and your wallet has been credited successfully."
        );

        /*
         * Tell the wallet page to refresh
         * its balance if it is listening.
         */
        window.dispatchEvent(
          new Event("walletUpdated")
        );
      } catch (error) {
        console.error(
          "PAYMENT VERIFICATION ERROR:",
          error
        );

        setStatus("error");

        setMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while verifying your payment."
        );
      }
    }

    verifyPayment();
  }, [params]);

  /*
   * ================================
   * VERIFYING
   * ================================
   */

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Verifying Payment...
          </h1>

          <p className="mt-3 text-gray-500">
            {message}
          </p>

          <p className="mt-4 text-xs text-gray-400">
            Please do not close this page.
          </p>
        </div>
      </div>
    );
  }

  /*
   * ================================
   * SUCCESS
   * ================================
   */

  if (status === "success") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <span className="text-3xl font-bold text-green-600">
              ✓
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Payment Successful
          </h1>

          <p className="mt-3 text-gray-600">
            {message}
          </p>

          {amount !== null && (
            <div className="mt-6 rounded-xl bg-indigo-50 p-5">
              <p className="text-sm text-indigo-600">
                Amount Credited
              </p>

              <p className="mt-1 text-3xl font-bold text-indigo-700">
                ₦
                {amount.toLocaleString(
                  "en-NG",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </p>
            </div>
          )}

          {reference && (
            <div className="mt-5 rounded-xl bg-gray-50 p-4 text-left">
              <p className="text-xs font-medium text-gray-500">
                Payment Reference
              </p>

              <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                {reference}
              </p>
            </div>
          )}

          <Link
            href="/dashboard/wallet"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            Go to Wallet
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ================================
   * ERROR
   * ================================
   */

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <span className="text-3xl font-bold text-red-600">
            !
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Payment Verification Failed
        </h1>

        <p className="mt-3 text-red-600">
          {message}
        </p>

        {reference && (
          <div className="mt-5 rounded-xl bg-gray-50 p-4 text-left">
            <p className="text-xs font-medium text-gray-500">
              Payment Reference
            </p>

            <p className="mt-1 break-all text-sm font-semibold text-gray-900">
              {reference}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/dashboard/wallet"
            className="rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Back to Wallet
          </Link>

          <Link
            href="/dashboard/wallet/fund"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WalletSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />

            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Verifying Payment...
            </h1>

            <p className="mt-3 text-gray-500">
              Please wait while we confirm
              your payment.
            </p>
          </div>
        </div>
      }
    >
      <WalletSuccessContent />
    </Suspense>
  );
}