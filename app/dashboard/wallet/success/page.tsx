"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function WalletSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const reference = params.get("reference");

    if (!reference) return;

    async function verifyPayment() {
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
    }

    verifyPayment();
  }, [params, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">
          Verifying Payment...
        </h1>

        <p className="mt-3 text-gray-500">
          Please wait while we confirm your payment.
        </p>
      </div>
    </div>
  );
}