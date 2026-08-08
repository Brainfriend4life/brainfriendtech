"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function WalletSuccessContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const reference = params.get("reference");

    if (!reference) {
      return;
    }

    async function verifyPayment() {
      try {
        const res = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reference,
          }),
        });

        const data = await res.json();

        if (data.success) {
          router.replace("/dashboard");
        } else {
          alert("Payment verification failed.");
        }
      } catch (error) {
        console.error(
          "PAYMENT VERIFICATION ERROR:",
          error
        );

        alert(
          "Something went wrong while verifying your payment."
        );
      }
    }

    verifyPayment();
  }, [params, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900">
          Verifying Payment...
        </h1>

        <p className="mt-3 text-gray-500">
          Please wait while we confirm your payment.
        </p>
      </div>
    </div>
  );
}

export default function WalletSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Verifying Payment...
            </h1>

            <p className="mt-3 text-gray-500">
              Please wait while we confirm your payment.
            </p>
          </div>
        </div>
      }
    >
      <WalletSuccessContent />
    </Suspense>
  );
}