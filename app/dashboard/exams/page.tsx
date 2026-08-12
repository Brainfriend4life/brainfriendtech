"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type ExamProduct = {
  id: number;
  exam_name: string;
  price: number;
  reseller_price: number;
  api_price: number;
  is_active: boolean;
};

type PurchaseResult = {
  examName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  pins: string[];
  reference: string;
  walletBalance: number;
};

export default function ExamPinPage() {
  const [products, setProducts] = useState<
    ExamProduct[]
  >([]);

  const [productId, setProductId] =
    useState("");

  const [quantity, setQuantity] =
    useState("1");

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [purchasing, setPurchasing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [purchaseResult, setPurchaseResult] =
    useState<PurchaseResult | null>(null);

  // ==========================================
  // LOAD PRODUCTS
  // ==========================================

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await fetch(
        "/api/exams/products",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      console.log(
        "EXAM PRODUCTS:",
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Unable to load exam PIN products."
        );
      }

      const activeProducts =
        (result.data || []).filter(
          (item: ExamProduct) =>
            item.is_active
        );

      setProducts(activeProducts);

      if (activeProducts.length > 0) {
        setProductId(
          String(activeProducts[0].id)
        );
      }
    } catch (err) {
      console.error(
        "LOAD EXAM PRODUCTS ERROR:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unable to load exam PIN products.";

      setError(message);

      toast.error(message);
    } finally {
      setLoadingProducts(false);
    }
  }

  // ==========================================
  // SELECTED PRODUCT
  // ==========================================

  const selectedProduct =
    products.find(
      (product) =>
        String(product.id) === productId
    );

  const numericQuantity =
    Number(quantity);

  const unitPrice =
    Number(
      selectedProduct?.reseller_price ||
        selectedProduct?.price ||
        0
    );

  const totalAmount =
    unitPrice * numericQuantity;

  // ==========================================
  // PURCHASE
  // ==========================================

  async function handlePurchase(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    if (!productId) {
      toast.error(
        "Please select an exam."
      );
      return;
    }

    if (
      ![1, 2, 5].includes(
        numericQuantity
      )
    ) {
      toast.error(
        "Quantity must be 1, 2, or 5."
      );
      return;
    }

    if (!selectedProduct) {
      toast.error(
        "Please select a valid exam product."
      );
      return;
    }

    setPurchasing(true);

    try {
      const response = await fetch(
        "/api/exams/purchase",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            productId:
              Number(productId),

            quantity:
              numericQuantity,
          }),
        }
      );

      const result =
        await response.json();

      console.log(
        "EXAM PIN PURCHASE RESPONSE:",
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Exam PIN purchase failed."
        );
      }

      const pins =
        Array.isArray(result.pins)
          ? result.pins
          : [];

      setPurchaseResult({
        examName:
          result.examName ||
          selectedProduct.exam_name,

        quantity:
          Number(
            result.quantity ||
              numericQuantity
          ),

        unitPrice:
          Number(
            result.unitPrice ||
              unitPrice
          ),

        totalAmount:
          Number(
            result.totalAmount ||
              totalAmount
          ),

        pins,

        reference:
          result.reference ||
          "N/A",

        walletBalance:
          Number(
            result.walletBalance || 0
          ),
      });

      toast.success(
        "Exam PIN purchase successful."
      );
    } catch (err) {
      console.error(
        "EXAM PIN PURCHASE ERROR:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Exam PIN purchase failed.";

      setError(message);

      toast.error(message);
    } finally {
      setPurchasing(false);
    }
  }

  // ==========================================
  // CLOSE RECEIPT
  // ==========================================

  function closeReceipt() {
    setPurchaseResult(null);
    setQuantity("1");
  }

  // ==========================================
  // SUCCESS RECEIPT
  // ==========================================

  if (purchaseResult) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            ✓
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Purchase Successful
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Your exam PIN has been generated
            successfully.
          </p>
        </div>

        {/* PURCHASE SUMMARY */}

        <div className="space-y-4 rounded-xl border bg-gray-50 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-500">
              Examination
            </span>

            <span className="font-semibold">
              {purchaseResult.examName}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-500">
              Quantity
            </span>

            <span className="font-semibold">
              {purchaseResult.quantity}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-500">
              Price per PIN
            </span>

            <span className="font-semibold">
              ₦
              {purchaseResult.unitPrice.toLocaleString(
                "en-NG"
              )}
            </span>
          </div>

          <div className="border-t pt-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-bold text-gray-900">
                Total Deducted
              </span>

              <span className="font-bold text-indigo-600">
                ₦
                {purchaseResult.totalAmount.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>
          </div>
        </div>

        {/* PINS */}

        <div className="mt-5 rounded-xl border p-5">
          <h2 className="mb-4 text-lg font-bold">
            Your Exam PIN
            {purchaseResult.quantity > 1
              ? "s"
              : ""}
          </h2>

          <div className="space-y-3">
            {purchaseResult.pins.length >
            0 ? (
              purchaseResult.pins.map(
                (pin, index) => (
                  <div
                    key={`${pin}-${index}`}
                    className="rounded-lg border bg-gray-50 p-4"
                  >
                    <p className="mb-1 text-xs font-medium uppercase text-gray-500">
                      PIN {index + 1}
                    </p>

                    <p className="break-all font-mono text-sm font-semibold text-gray-900">
                      {pin}
                    </p>
                  </div>
                )
              )
            ) : (
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
                The provider did not return the
                PIN details. Check your transaction
                reference.
              </div>
            )}
          </div>
        </div>

        {/* TRANSACTION */}

        <div className="mt-5 rounded-xl border p-5">
          <h2 className="mb-3 font-semibold">
            Transaction Details
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-gray-500">
                Reference
              </span>

              <span className="break-all font-medium sm:max-w-[70%] sm:text-right">
                {purchaseResult.reference}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-gray-500">
                New Wallet Balance
              </span>

              <span className="font-semibold">
                ₦
                {purchaseResult.walletBalance.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>
          </div>
        </div>

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

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <div className="w-full">
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
        Exam PIN
      </h1>

      <p className="mb-6 text-sm text-gray-500">
        Purchase WAEC, NECO and NABTEB examination
        PINs instantly.
      </p>

      {/* ERROR */}

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handlePurchase}
        className="space-y-5 rounded-xl bg-white p-4 shadow sm:p-6"
      >
        {/* EXAM */}

        <div>
          <label className="mb-2 block font-medium">
            Examination
          </label>

          <select
            value={productId}
            onChange={(e) =>
              setProductId(
                e.target.value
              )
            }
            disabled={
              loadingProducts ||
              purchasing
            }
            className="w-full rounded-lg border p-3 outline-none"
          >
            <option value="">
              {loadingProducts
                ? "Loading examinations..."
                : "Select examination"}
            </option>

            {products.map(
              (product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.exam_name} - ₦
                  {Number(
                    product.reseller_price ||
                      product.price
                  ).toLocaleString(
                    "en-NG"
                  )}
                </option>
              )
            )}
          </select>
        </div>

        {/* QUANTITY */}

        <div>
          <label className="mb-2 block font-medium">
            Quantity
          </label>

          <select
            value={quantity}
            onChange={(e) =>
              setQuantity(
                e.target.value
              )
            }
            disabled={
              loadingProducts ||
              purchasing
            }
            className="w-full rounded-lg border p-3 outline-none"
          >
            <option value="1">
              1 PIN
            </option>

            <option value="2">
              2 PINs
            </option>

            <option value="5">
              5 PINs
            </option>
          </select>

          <p className="mt-2 text-xs text-gray-500">
            You can purchase 1, 2 or 5 PINs at a
            time.
          </p>
        </div>

        {/* PRICE */}

        {selectedProduct && (
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Price per PIN
              </span>

              <span className="font-medium">
                ₦
                {unitPrice.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>

            <div className="mt-2 flex justify-between border-t pt-2">
              <span className="font-semibold">
                Total
              </span>

              <span className="font-bold text-indigo-600">
                ₦
                {totalAmount.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>
          </div>
        )}

        {/* PURCHASE BUTTON */}

        <button
          type="submit"
          disabled={
            loadingProducts ||
            purchasing ||
            !productId ||
            !quantity
          }
          className="w-full rounded-lg bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {purchasing
            ? "Processing..."
            : "Buy Exam PIN"}
        </button>
      </form>
    </div>
  );
}