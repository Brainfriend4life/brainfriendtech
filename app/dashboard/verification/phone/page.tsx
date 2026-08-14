
"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  CreditCard,
} from "lucide-react";

type CardType =
  | "standard"
  | "regular"
  | "premium"
  | "vnin_slip";

type Pricing = {
  basePrice: number;
  serviceFee: number;
  price: number;
  serviceFeePercentage: number;
  apiPrice: number;
};

type ResultDetails = {
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  telephone?: string | null;
  nin?: string | null;
  photo?: string | null;
};

type VerificationResult = {
  verification_id: string;
  transaction_id: string;
  reference: string;
  phone: string;
  card_type: string;
  basePrice: number;
  serviceFeePercentage: number;
  serviceFee: number;
  amount: number;
  providerCost: number;
  profit: number;
  details: ResultDetails;
  walletBalance: number;
};

export default function PhoneVerificationPage() {
  const [phone, setPhone] =
    useState("");

  const [cardType, setCardType] =
    useState<CardType>("standard");

  const [pricing, setPricing] =
    useState<
      Record<
        CardType,
        Pricing
      > | null
    >(null);

  const [
    serviceFeePercentage,
    setServiceFeePercentage,
  ] = useState(5);

  const [loadingPricing, setLoadingPricing] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [result, setResult] =
    useState<VerificationResult | null>(
      null
    );

  /*
  |--------------------------------------------------------------------------
  | LOAD PRICING
  |--------------------------------------------------------------------------
  */

  async function loadPricing() {
    try {
      setLoadingPricing(true);
      setError("");

      const response =
        await fetch(
          "/api/verification/phone",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load pricing."
        );
      }

      setPricing(data.data);

      setServiceFeePercentage(
        Number(
          data.serviceFeePercentage ??
            5
        )
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load verification pricing."
      );
    } finally {
      setLoadingPricing(false);
    }
  }

  useEffect(() => {
    loadPricing();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | PHONE FORMAT
  |--------------------------------------------------------------------------
  */

  function handlePhoneChange(
    value: string
  ) {
    const cleaned =
      value.replace(/\D/g, "");

    setPhone(
      cleaned.substring(0, 11)
    );
  }

  /*
  |--------------------------------------------------------------------------
  | VERIFY
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setResult(null);

    const cleanedPhone =
      phone.replace(/\D/g, "");

    if (
      !/^0\d{10}$/.test(
        cleanedPhone
      )
    ) {
      setError(
        "Enter a valid Nigerian 11-digit phone number."
      );

      return;
    }

    if (!pricing) {
      setError(
        "Verification pricing is not available."
      );

      return;
    }

    try {
      setSubmitting(true);

      const response =
        await fetch(
          "/api/verification/phone",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              phone:
                cleanedPhone,

              cardType,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Phone verification failed."
        );
      }

      setResult(data.data);

      setSuccess(
        "Phone number verification completed successfully."
      );

      setPhone("");
    } catch (err: any) {
      setError(
        err?.message ||
          "Phone verification failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPrice =
    pricing?.[cardType];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Phone size={24} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Phone Number Verification
        </h1>

        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Search and verify NIN information
          using a Nigerian phone number.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* PHONE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Number
            </label>

            <div className="relative">
              <Phone
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  handlePhoneChange(
                    e.target.value
                  )
                }
                placeholder="08012345678"
                maxLength={11}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* CARD TYPE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Verification Type
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  "standard",
                  "regular",
                  "premium",
                  "vnin_slip",
                ] as CardType[]
              ).map((type) => {
                const item =
                  pricing?.[type];

                const active =
                  cardType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setCardType(type)
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                        : "border-gray-200 hover:border-blue-300 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize text-gray-900 dark:text-white">
                        {type ===
                        "vnin_slip"
                          ? "VNIN Slip"
                          : type}
                      </span>

                      <CreditCard
                        size={18}
                        className={
                          active
                            ? "text-blue-600"
                            : "text-gray-400"
                        }
                      />
                    </div>

                    <div className="mt-2 text-lg font-bold text-blue-600">
                      {loadingPricing
                        ? "Loading..."
                        : `₦${Number(
                            item?.price ||
                              0
                          ).toLocaleString(
                            "en-NG",
                            {
                              minimumFractionDigits:
                                0,
                              maximumFractionDigits:
                                2,
                            }
                          )}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRICE */}

          {selectedPrice && (
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Base price
                </span>

                <span className="font-medium text-gray-900 dark:text-white">
                  ₦
                  {selectedPrice.basePrice.toLocaleString(
                    "en-NG"
                  )}
                </span>
              </div>

              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Service fee (
                  {
                    serviceFeePercentage
                  }
                  %)
                </span>

                <span className="font-medium text-gray-900 dark:text-white">
                  ₦
                  {selectedPrice.serviceFee.toLocaleString(
                    "en-NG",
                    {
                      minimumFractionDigits:
                        0,
                      maximumFractionDigits:
                        2,
                    }
                  )}
                </span>
              </div>

              <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-white">
                  You pay
                </span>

                <span className="text-xl font-bold text-blue-600">
                  ₦
                  {selectedPrice.price.toLocaleString(
                    "en-NG",
                    {
                      minimumFractionDigits:
                        0,
                      maximumFractionDigits:
                        2,
                    }
                  )}
                </span>
              </div>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{success}</span>
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              submitting ||
              loadingPricing
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Verifying...
              </>
            ) : (
              <>
                <Search size={18} />
                Verify Phone Number
              </>
            )}
          </button>
        </form>
      </div>

      {/* RESULT */}

      {result && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-white p-6 shadow-sm dark:border-green-900 dark:bg-gray-900">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950">
              <CheckCircle2
                size={22}
              />
            </div>

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Verification Successful
              </h2>

              <p className="text-xs text-gray-500">
                {result.reference}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ResultItem
              label="First Name"
              value={
                result.details
                  .firstName
              }
            />

            <ResultItem
              label="Middle Name"
              value={
                result.details
                  .middleName
              }
            />

            <ResultItem
              label="Surname"
              value={
                result.details
                  .surname
              }
            />

            <ResultItem
              label="Gender"
              value={
                result.details
                  .gender
              }
            />

            <ResultItem
              label="Date of Birth"
              value={
                result.details
                  .birthDate
              }
            />

            <ResultItem
              label="Phone"
              value={
                result.details
                  .telephone
              }
            />

            <ResultItem
              label="NIN"
              value={
                result.details
                  .nin
              }
            />

            <ResultItem
              label="Amount Paid"
              value={`₦${Number(
                result.amount
              ).toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits:
                    0,
                  maximumFractionDigits:
                    2,
                }
              )}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ResultItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
      <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
        {label}
      </div>

      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
        {label === "First Name" && (
          <User
            size={15}
            className="text-blue-500"
          />
        )}

        {value || "Not available"}
      </div>
    </div>
  );
}

