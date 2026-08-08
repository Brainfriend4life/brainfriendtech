"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Copy,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

type ExamService = {
  serviceID: string;
  name: string;
  minimum_amount?: string | null;
  maximum_amount?: string | null;
  convenience_fee?: string;
  product_type?: string;
  image?: string;
};

type ExamPlan = {
  variation_code: string;
  name: string;
  variation_amount: string;
};

type ExamPin = {
  id: string;
  provider: string;
  pin: string;
  serial: string;
  amount: number;
  reference: string;
  createdAt: string;
};

export default function ExamsPage() {
  const [services, setServices] = useState<ExamService[]>([]);
  const [plans, setPlans] = useState<ExamPlan[]>([]);

  const [serviceID, setServiceID] = useState("");
  const [variationCode, setVariationCode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");

  // JAMB Profile ID
  const [billersCode, setBillersCode] = useState("");

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingPins, setLoadingPins] = useState(true);

  const [purchasing, setPurchasing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [purchasedPins, setPurchasedPins] = useState<ExamPin[]>([]);
  const [copiedPin, setCopiedPin] = useState("");

  /*
  ==========================================
  LOAD PURCHASED EXAM PINS
  ==========================================
  */

  useEffect(() => {
    const loadPurchasedPins = async () => {
      try {
        setLoadingPins(true);

        const response = await fetch("/api/exams/pins", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load exam PINs"
          );
        }

        setPurchasedPins(
          Array.isArray(data.pins) ? data.pins : []
        );
      } catch (err) {
        console.error(
          "LOAD EXAM PINS ERROR:",
          err
        );
      } finally {
        setLoadingPins(false);
      }
    };

    loadPurchasedPins();
  }, []);

  /*
  ==========================================
  LOAD EXAM SERVICES
  ==========================================
  */

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoadingServices(true);
        setError("");

        const response = await fetch(
          "/api/exams/services"
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Failed to load exam services"
          );
        }

        const availableServices =
          Array.isArray(data.services)
            ? data.services
            : [];

        setServices(availableServices);

        if (availableServices.length > 0) {
          setServiceID(
            availableServices[0].serviceID
          );
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load exam services";

        setError(message);
      } finally {
        setLoadingServices(false);
      }
    };

    loadServices();
  }, []);

  /*
  ==========================================
  LOAD PLANS WHEN SERVICE CHANGES
  ==========================================
  */

  useEffect(() => {
    if (!serviceID) {
      setPlans([]);
      setVariationCode("");
      setBillersCode("");
      return;
    }

    const loadPlans = async () => {
      try {
        setLoadingPlans(true);
        setError("");
        setVariationCode("");

        // Clear JAMB Profile ID when
        // changing to another service.
        if (
          serviceID.toLowerCase() !== "jamb"
        ) {
          setBillersCode("");
        }

        const response = await fetch(
          `/api/exams/plans?serviceID=${encodeURIComponent(
            serviceID
          )}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Failed to load exam plans"
          );
        }

        const loadedPlans = Array.isArray(
          data.plans
        )
          ? data.plans
          : [];

        setPlans(loadedPlans);

        if (loadedPlans.length > 0) {
          setVariationCode(
            loadedPlans[0].variation_code
          );
        }
      } catch (err) {
        setPlans([]);
        setVariationCode("");

        const message =
          err instanceof Error
            ? err.message
            : "Failed to load exam plans";

        setError(message);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, [serviceID]);

  /*
  ==========================================
  SELECTED PLAN
  ==========================================
  */

  const selectedPlan = plans.find(
    (plan) =>
      plan.variation_code === variationCode
  );

  const unitPrice = selectedPlan
    ? Number(selectedPlan.variation_amount)
    : 0;

  const safeQuantity =
    Number.isFinite(quantity) && quantity >= 1
      ? quantity
      : 1;

  const totalAmount =
    unitPrice * safeQuantity;

  /*
  ==========================================
  PURCHASE EXAM PIN
  ==========================================
  */

  const buyPin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!serviceID) {
      setError(
        "Please select an exam service."
      );
      return;
    }

    if (!variationCode) {
      setError(
        "Please select an exam plan."
      );
      return;
    }

    // JAMB requires Profile ID
    if (
      serviceID.toLowerCase() === "jamb" &&
      !billersCode.trim()
    ) {
      setError(
        "Please enter your JAMB Profile ID."
      );
      return;
    }

    if (!phone.trim()) {
      setError(
        "Please enter your phone number."
      );
      return;
    }

    if (safeQuantity < 1) {
      setError(
        "Quantity must be at least 1."
      );
      return;
    }

    try {
      setPurchasing(true);

      const response = await fetch(
        "/api/exams/purchase",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            serviceID,

            variation_code:
              variationCode,

            quantity: safeQuantity,

            phone: phone.trim(),

            ...(serviceID.toLowerCase() ===
            "jamb"
              ? {
                  billersCode:
                    billersCode.trim(),
                }
              : {}),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Exam purchase failed"
        );
      }

      setMessage(
        "Exam PIN purchased successfully."
      );

      /*
      ========================================
      EXTRACT RETURNED PINS
      ========================================
      */

      const returnedPins: ExamPin[] = [];

      /*
      WAEC AND OTHER CARD-BASED SERVICES
      */

      if (
        Array.isArray(
          data.data?.cards
        )
      ) {
        data.data.cards.forEach(
          (
            card: any,
            index: number
          ) => {
            if (!card?.Pin) {
              return;
            }

            returnedPins.push({
              id: `${
                data.data.requestId ||
                Date.now()
              }-${index}`,

              provider:
                serviceID.toUpperCase(),

              pin: String(card.Pin),

              serial: String(
                card.Serial || "-"
              ),

              amount: unitPrice,

              reference:
                data.data.requestId ||
                "",

              createdAt:
                data.data
                  .transaction_date ||
                new Date().toISOString(),
            });
          }
        );
      }

      /*
      JAMB

      VTpass may return:

      Pin: "Pin : 3678251321392432"
      */

      if (
        serviceID.toLowerCase() ===
          "jamb" &&
        data.data?.Pin
      ) {
        let jambPin = String(
          data.data.Pin
        ).trim();

        jambPin = jambPin
          .replace(
            /^Pin\s*:\s*/i,
            ""
          )
          .trim();

        if (jambPin) {
          returnedPins.push({
            id: `${
              data.data.requestId ||
              Date.now()
            }-jamb`,

            provider: "JAMB",

            pin: jambPin,

            serial: "JAMB",

            amount: unitPrice,

            reference:
              data.data.requestId ||
              "",

            createdAt:
              data.data
                .transaction_date ||
              new Date().toISOString(),
          });
        }
      }

      /*
      ========================================
      SHOW NEWLY PURCHASED PINS
      ========================================
      */

      if (returnedPins.length > 0) {
        setPurchasedPins(
          (currentPins) => [
            ...returnedPins,
            ...currentPins,
          ]
        );
      }

      /*
      ========================================
      RELOAD PINS FROM DATABASE
      ========================================
      */

      try {
        const pinsResponse =
          await fetch(
            "/api/exams/pins",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const pinsData =
          await pinsResponse.json();

        if (
          pinsResponse.ok &&
          pinsData.success &&
          Array.isArray(
            pinsData.pins
          )
        ) {
          setPurchasedPins(
            pinsData.pins
          );
        }
      } catch (refreshError) {
        console.error(
          "REFRESH EXAM PINS ERROR:",
          refreshError
        );
      }

      /*
      Clear sensitive/input fields
      after successful purchase.
      */

      setPhone("");

      if (
        serviceID.toLowerCase() ===
        "jamb"
      ) {
        setBillersCode("");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Exam PIN purchase failed";

      setError(message);
    } finally {
      setPurchasing(false);
    }
  };

  /*
  ==========================================
  COPY PIN
  ==========================================
  */

  const copyPin = async (
    pin: string
  ) => {
    try {
      await navigator.clipboard.writeText(
        pin
      );

      setCopiedPin(pin);

      setTimeout(() => {
        setCopiedPin("");
      }, 2000);
    } catch {
      setError(
        "Unable to copy PIN. Please copy it manually."
      );
    }
  };

  /*
  ==========================================
  PAGE
  ==========================================
  */

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}

      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 sm:h-12 sm:w-12">
          <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>

        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Exams & Education
          </h1>

          <p className="text-sm text-gray-500 sm:text-base">
            Purchase exam PINs instantly.
          </p>
        </div>
      </div>

      {/* PURCHASE FORM */}

      <form
        onSubmit={buyPin}
        className="space-y-5 rounded-2xl bg-white p-4 shadow-sm sm:space-y-6 sm:p-6 lg:p-7"
      >
        {/* EXAM SERVICE */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Exam Service
          </label>

          <select
            value={serviceID}
            onChange={(event) => {
              setServiceID(
                event.target.value
              );

              setError("");
              setMessage("");
            }}
            disabled={
              loadingServices ||
              purchasing
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
          >
            {loadingServices ? (
              <option value="">
                Loading services...
              </option>
            ) : (
              <>
                <option value="">
                  Select exam service
                </option>

                {services.map(
                  (service) => (
                    <option
                      key={
                        service.serviceID
                      }
                      value={
                        service.serviceID
                      }
                    >
                      {service.name}
                    </option>
                  )
                )}
              </>
            )}
          </select>
        </div>

        {/* JAMB PROFILE ID */}

        {serviceID.toLowerCase() ===
          "jamb" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              JAMB Profile ID
            </label>

            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter JAMB Profile ID"
              value={billersCode}
              onChange={(event) =>
                setBillersCode(
                  event.target.value
                )
              }
              disabled={purchasing}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            <p className="mt-2 text-xs text-gray-500">
              Enter the JAMB Profile ID
              you want to use for this
              purchase.
            </p>
          </div>
        )}

        {/* EXAM PLAN */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Exam Plan
          </label>

          <select
            value={variationCode}
            onChange={(event) =>
              setVariationCode(
                event.target.value
              )
            }
            disabled={
              !serviceID ||
              loadingPlans ||
              purchasing
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
          >
            {loadingPlans ? (
              <option value="">
                Loading plans...
              </option>
            ) : plans.length === 0 ? (
              <option value="">
                No plans available
              </option>
            ) : (
              <>
                <option value="">
                  Select exam plan
                </option>

                {plans.map(
                  (plan) => (
                    <option
                      key={
                        plan.variation_code
                      }
                      value={
                        plan.variation_code
                      }
                    >
                      {plan.name} - ₦
                      {Number(
                        plan.variation_amount
                      ).toLocaleString(
                        "en-NG"
                      )}
                    </option>
                  )
                )}
              </>
            )}
          </select>
        </div>

        {/* QUANTITY */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Quantity
          </label>

          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => {
              const value =
                Number(
                  event.target.value
                );

              setQuantity(
                Number.isFinite(
                  value
                ) && value >= 1
                  ? value
                  : 1
              );
            }}
            disabled={purchasing}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
          />
        </div>

        {/* PHONE */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Phone Number
          </label>

          <input
            type="tel"
            inputMode="numeric"
            placeholder="08012345678"
            value={phone}
            onChange={(event) =>
              setPhone(
                event.target.value
              )
            }
            disabled={purchasing}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
          />
        </div>

        {/* PRICE SUMMARY */}

        {selectedPlan && (
          <div className="rounded-xl bg-gray-50 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-500">
                Unit price
              </span>

              <span className="font-medium text-gray-900">
                ₦
                {unitPrice.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-500">
                Quantity
              </span>

              <span className="font-medium text-gray-900">
                {safeQuantity}
              </span>
            </div>

            <div className="my-3 border-t border-gray-200" />

            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-gray-900">
                Total
              </span>

              <span className="text-lg font-bold text-indigo-600 sm:text-xl">
                ₦
                {totalAmount.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-600">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm leading-5 text-green-700">
            {message}
          </div>
        )}

        {/* PURCHASE BUTTON */}

        <button
          type="submit"
          disabled={
            purchasing ||
            loadingServices ||
            loadingPlans ||
            !serviceID ||
            !variationCode ||
            (serviceID.toLowerCase() ===
              "jamb" &&
              !billersCode.trim())
          }
          className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
        >
          {purchasing
            ? "Processing..."
            : "Purchase Exam PIN"}
        </button>
      </form>

      {/* PURCHASED PINS */}

      {(loadingPins ||
        purchasedPins.length > 0) && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
              Purchased PINs
            </h2>

            <p className="text-sm text-gray-500">
              Keep these details safe.
            </p>
          </div>

          {loadingPins ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
              Loading your purchased
              PINs...
            </div>
          ) : (
            purchasedPins.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-5"
                >
                  {/* PIN HEADER */}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {item.provider}
                      </p>

                      <p className="mt-1 text-xs text-gray-600">
                        Serial Number
                      </p>

                      <p className="break-all font-semibold text-gray-900">
                        {item.serial}
                      </p>
                    </div>

                    <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
                  </div>

                  {/* PIN */}

                  <div className="mt-4 rounded-xl bg-white p-3 sm:p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      PIN
                    </p>

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="min-w-0 break-all text-base font-bold tracking-wider text-gray-900 sm:text-lg">
                        {item.pin}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          copyPin(
                            item.pin
                          )
                        }
                        className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 sm:w-auto"
                      >
                        {copiedPin ===
                        item.pin ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AMOUNT */}

                  <div className="mt-3 text-xs text-gray-500">
                    Amount: ₦
                    {Number(
                      item.amount
                    ).toLocaleString(
                      "en-NG"
                    )}
                  </div>

                  {/* REFERENCE */}

                  {item.reference && (
                    <div className="mt-1 break-all text-xs text-gray-400">
                      Reference:{" "}
                      {item.reference}
                    </div>
                  )}

                  {/* DATE */}

                  {item.createdAt && (
                    <div className="mt-1 text-xs text-gray-400">
                      {new Date(
                        item.createdAt
                      ).toLocaleString(
                        "en-NG"
                      )}
                    </div>
                  )}
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}