"use client";

import { useEffect, useMemo, useState } from "react";

type ExamProduct = {
  id: number;
  exam_name: string;
  price: number;
  reseller_price: number;
  api_price: number;
  availability?: string;
  is_active: boolean;
};

type ExamCard = {
  pin: string;
  serial: string;
};

type PurchaseResult = {
  success: boolean;
  message?: string;
  examName?: string;
  quantity?: number;
  unitPrice?: number;
  baseAmount?: number;
  serviceFee?: number;
  serviceFeePercent?: number;
  totalAmount?: number;
  profit?: number;
  pins?: string[];
  cards?: ExamCard[];
  reference?: string;
  providerReference?: string | null;
  walletBalance?: number;
  provider?: string;
  status?: string;
};

const DEFAULT_SERVICE_FEE_PERCENT = 5;

export default function ExamPinsPage() {
  const [products, setProducts] = useState<ExamProduct[]>([]);
  const [selectedProductId, setSelectedProductId] =
    useState<number | null>(null);

  const [quantity, setQuantity] = useState(1);

  const [serviceFeePercent, setServiceFeePercent] =
    useState(DEFAULT_SERVICE_FEE_PERCENT);

  const [transactionPin, setTransactionPin] = useState("");

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [purchaseResult, setPurchaseResult] =
    useState<PurchaseResult | null>(null);

  // -------------------------------------------------------
  // LOAD PRODUCTS + SERVICE FEE
  // -------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [productsResponse, serviceFeeResponse] =
          await Promise.all([
            fetch("/api/exams/products", {
              cache: "no-store",
            }),

            fetch("/api/settings/service-fee", {
              cache: "no-store",
            }),
          ]);

        // ---------------------------------------------------
        // PRODUCTS
        // ---------------------------------------------------

        const productsText = await productsResponse.text();

        let productsResult: any;

        try {
          productsResult = JSON.parse(productsText);
        } catch {
          throw new Error(
            "Invalid response received from Exam PIN provider."
          );
        }

        if (
          !productsResponse.ok ||
          !productsResult?.success
        ) {
          throw new Error(
            productsResult?.message ||
              "Unable to load Exam PIN products."
          );
        }

        const activeProducts = Array.isArray(
          productsResult?.data
        )
          ? productsResult.data.filter(
              (product: ExamProduct) =>
                product.is_active
            )
          : [];

        if (activeProducts.length === 0) {
          throw new Error(
            "No Exam PIN products are currently available."
          );
        }

        // ---------------------------------------------------
        // SERVICE FEE
        // ---------------------------------------------------

        let feePercent =
          DEFAULT_SERVICE_FEE_PERCENT;

        if (serviceFeeResponse.ok) {
          try {
            const feeResult =
              await serviceFeeResponse.json();

            const possibleFee =
              feeResult?.data?.percentage ??
              feeResult?.data?.serviceFeePercent ??
              feeResult?.percentage ??
              feeResult?.serviceFeePercent;

            const parsedFee = Number(
              possibleFee
            );

            if (
              Number.isFinite(parsedFee) &&
              parsedFee >= 0 &&
              parsedFee <= 100
            ) {
              feePercent = parsedFee;
            }
          } catch (feeError) {
            console.error(
              "SERVICE FEE RESPONSE ERROR:",
              feeError
            );
          }
        }

        if (cancelled) return;

        setProducts(activeProducts);

        setSelectedProductId(
          Number(activeProducts[0].id)
        );

        setServiceFeePercent(feePercent);
      } catch (err: any) {
        if (cancelled) return;

        console.error(
          "Exam PIN loading error:",
          err
        );

        setError(
          err?.message ||
            "Unable to connect to the Exam PIN provider."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------
  // SELECTED PRODUCT
  // -------------------------------------------------------

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          product.id === selectedProductId
      ) || null,
    [products, selectedProductId]
  );

  // -------------------------------------------------------
  // PRICE CALCULATIONS
  // -------------------------------------------------------

  const unitPrice = Number(
    selectedProduct?.reseller_price ??
      selectedProduct?.price ??
      0
  );

  const subtotal = Number(
    (unitPrice * quantity).toFixed(2)
  );

  const serviceFee = Number(
    (
      subtotal *
      (serviceFeePercent / 100)
    ).toFixed(2)
  );

  const totalAmount = Number(
    (subtotal + serviceFee).toFixed(2)
  );

  // -------------------------------------------------------
  // FORMAT MONEY
  // -------------------------------------------------------

  function formatMoney(amount: number) {
    return `₦${Number(
      amount || 0
    ).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // -------------------------------------------------------
  // PURCHASE
  // -------------------------------------------------------

  async function handlePurchase() {
    try {
      setError("");
      setSuccess("");
      setPurchaseResult(null);

      if (!selectedProduct) {
        setError("Please select an Exam PIN.");
        return;
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        quantity > 100
      ) {
        setError(
          "Quantity must be between 1 and 100."
        );
        return;
      }

      if (!transactionPin.trim()) {
        setError(
          "Please enter your transaction PIN."
        );
        return;
      }

      setPurchasing(true);

      const response = await fetch(
        "/api/exams/purchase",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: selectedProduct.id,
            quantity,
            transactionPin:
              transactionPin.trim(),
          }),
        }
      );

      const responseText =
        await response.text();

      let result: PurchaseResult;

      try {
        result = JSON.parse(
          responseText
        );
      } catch {
        throw new Error(
          "Invalid response received from server."
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            "Exam PIN purchase failed."
        );
      }

      setPurchaseResult(result);

      setSuccess(
        result.message ||
          "Exam PIN purchase successful."
      );

      setTransactionPin("");
    } catch (err: any) {
      console.error(
        "Exam PIN purchase error:",
        err
      );

      setError(
        err?.message ||
          "Unable to complete Exam PIN purchase."
      );
    } finally {
      setPurchasing(false);
    }
  }

  // -------------------------------------------------------
  // LOADING
  // -------------------------------------------------------

  if (loading) {
    return (
      <div className="p-3 sm:p-5">
        <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-4 border-gray-300 border-t-black dark:border-gray-700 dark:border-t-white" />

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Loading Exam PINs...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // MAIN UI
  // -------------------------------------------------------

  return (
    <div className="px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-2xl">
        {/* HEADER */}

        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Exam PINs
          </h1>

          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Buy WAEC, NECO and other examination
            PINs instantly.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
            <p className="text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-900/50 dark:bg-green-950/40">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">
              {success}
            </p>
          </div>
        )}

        {/* PURCHASE CARD */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5">
          {/* EXAM + QUANTITY */}

          <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
            {/* EXAM */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Examination
              </label>

              <select
                value={
                  selectedProductId ?? ""
                }
                onChange={(event) =>
                  setSelectedProductId(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
              >
                {products.map(
                  (product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.exam_name} —{" "}
                      {formatMoney(
                        product.reseller_price ??
                          product.price
                      )}
                    </option>
                  )
                )}
              </select>

              {selectedProduct && (
                <p className="mt-1 text-[11px] text-gray-400">
                  {selectedProduct.availability ||
                    "Available"}
                </p>
              )}
            </div>

            {/* QUANTITY */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Quantity
              </label>

              <select
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
              >
                {[1, 2, 5, 10, 20, 50, 100].map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* TRANSACTION PIN */}

          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Transaction PIN
            </label>

            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              value={transactionPin}
              onChange={(event) =>
                setTransactionPin(
                  event.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              placeholder="Enter transaction PIN"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-white dark:focus:ring-white/10"
            />
          </div>

          {/* SUMMARY */}

          <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
            <div className="space-y-1.5">
              {/* UNIT PRICE */}

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Unit price
                </span>

                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {formatMoney(
                    unitPrice
                  )}
                </span>
              </div>

              {/* QUANTITY */}

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Quantity
                </span>

                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {quantity}
                </span>
              </div>

              {/* SUBTOTAL */}

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Subtotal
                </span>

                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {formatMoney(
                    subtotal
                  )}
                </span>
              </div>

              {/* SERVICE FEE */}

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Service fee ({serviceFeePercent}%)
                </span>

                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {formatMoney(
                    serviceFee
                  )}
                </span>
              </div>

              {/* DIVIDER */}

              <div className="my-1.5 border-t border-gray-200 dark:border-gray-700" />

              {/* TOTAL */}

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Total
                </span>

                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {formatMoney(
                    totalAmount
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* BUY BUTTON */}

          <button
            type="button"
            onClick={handlePurchase}
            disabled={
              purchasing ||
              !selectedProduct
            }
            className="mt-4 h-11 w-full rounded-lg bg-black px-4 text-sm font-semibold text-white transition hover:bg-gray-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {purchasing
              ? "Processing..."
              : `Buy ${
                  selectedProduct?.exam_name ||
                  "Exam PIN"
                }`}
          </button>

          <p className="mt-2 text-center text-[11px] text-gray-400">
            Your PIN will be delivered immediately
            after a successful purchase.
          </p>
        </div>

        {/* RECEIPT */}

        {purchaseResult && (
          <div className="mt-4 rounded-xl border border-green-200 bg-white p-4 shadow-sm dark:border-green-900/50 dark:bg-gray-900 sm:p-5">
            {/* RECEIPT HEADER */}

            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700 dark:bg-green-950/50 dark:text-green-300">
                ✓
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  Purchase Successful
                </h2>

                <p className="text-[11px] text-gray-400">
                  Your Exam PIN has been generated.
                </p>
              </div>
            </div>

            {/* DETAILS */}

            <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">
                    Examination
                  </p>

                  <p className="mt-0.5 truncate text-xs font-semibold text-gray-900 dark:text-white">
                    {purchaseResult.examName}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">
                    Quantity
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-white">
                    {purchaseResult.quantity}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">
                    Unit price
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-white">
                    {formatMoney(
                      purchaseResult.unitPrice ??
                        0
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">
                    Subtotal
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-white">
                    {formatMoney(
                      purchaseResult.baseAmount ??
                        0
                    )}
                  </p>
                </div>

                {/* RECEIPT SERVICE FEE */}

                <div>
                  <p className="text-[11px] text-gray-400">
                    Service fee
                    {purchaseResult.serviceFeePercent !==
                      undefined &&
                      ` (${purchaseResult.serviceFeePercent}%)`}
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-white">
                    {formatMoney(
                      purchaseResult.serviceFee ??
                        0
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">
                    Total paid
                  </p>

                  <p className="mt-0.5 text-xs font-bold text-gray-900 dark:text-white">
                    {formatMoney(
                      purchaseResult.totalAmount ??
                        0
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* PINS */}

            {purchaseResult.cards &&
              purchaseResult.cards.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-gray-900 dark:text-white">
                    Exam PIN Details
                  </h3>

                  <div className="space-y-2">
                    {purchaseResult.cards.map(
                      (card, index) => (
                        <div
                          key={`${card.pin}-${index}`}
                          className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="mb-2 text-[11px] font-medium text-gray-400">
                            Card {index + 1}
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="min-w-0">
                              <p className="text-[11px] text-gray-400">
                                PIN
                              </p>

                              <p className="mt-0.5 break-all font-mono text-xs font-bold text-gray-900 dark:text-white">
                                {card.pin}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[11px] text-gray-400">
                                Serial Number
                              </p>

                              <p className="mt-0.5 break-all font-mono text-xs font-semibold text-gray-900 dark:text-white">
                                {card.serial ||
                                  "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* REFERENCES */}

            {(purchaseResult.reference ||
              purchaseResult.providerReference ||
              purchaseResult.walletBalance !==
                undefined) && (
              <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                {purchaseResult.reference && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                    <span className="text-[11px] text-gray-400">
                      Reference
                    </span>

                    <span className="break-all font-mono text-[11px] text-gray-700 dark:text-gray-300 sm:text-right">
                      {purchaseResult.reference}
                    </span>
                  </div>
                )}

                {purchaseResult.providerReference && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
                    <span className="text-[11px] text-gray-400">
                      Provider Reference
                    </span>

                    <span className="break-all font-mono text-[11px] text-gray-700 dark:text-gray-300 sm:text-right">
                      {
                        purchaseResult.providerReference
                      }
                    </span>
                  </div>
                )}

                {purchaseResult.walletBalance !==
                  undefined && (
                  <div className="flex justify-between">
                    <span className="text-[11px] text-gray-400">
                      Wallet Balance
                    </span>

                    <span className="text-[11px] font-semibold text-gray-900 dark:text-white">
                      {formatMoney(
                        purchaseResult.walletBalance
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}