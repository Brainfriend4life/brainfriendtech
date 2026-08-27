"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import TransactionPinModal from "@/components/TransactionPinModal";

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
  serviceFee: number;
  totalAmount: number;
  pins: string[];
  reference: string;
  walletBalance: number;
  status: string;
  serviceFeePercent: number;
};

export default function ExamPinPage() {
  const [products, setProducts] = useState<ExamProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingFee, setLoadingFee] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const [error, setError] = useState("");

  const [serviceFeePercent, setServiceFeePercent] = useState(5);

  const [purchaseResult, setPurchaseResult] =
    useState<PurchaseResult | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    loadProducts();
    loadServiceFee();
  }, []);

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await fetch("/api/exams/products", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to load exam products."
        );
      }

      const activeProducts = (result.data || []).filter(
        (item: ExamProduct) => item.is_active
      );

      setProducts(activeProducts);

      if (activeProducts.length > 0) {
        setProductId(String(activeProducts[0].id));
      }
    } catch (error) {
      console.error("LOAD EXAM ERROR:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to load exam products.";

      setError(message);
      toast.error(message);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadServiceFee() {
    try {
      setLoadingFee(true);

      const response = await fetch(
        "/api/settings/service-fee",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load service fee."
        );
      }

      const percentage = Number(result.percentage);

      if (
        Number.isFinite(percentage) &&
        percentage >= 0 &&
        percentage <= 100
      ) {
        setServiceFeePercent(percentage);
      }
    } catch (error) {
      console.error(
        "LOAD SERVICE FEE ERROR:",
        error
      );
    } finally {
      setLoadingFee(false);
    }
  }

  const selectedProduct = products.find(
    (product) =>
      String(product.id) === productId
  );

  const numericQuantity = Number(quantity);

  const unitPrice = Number(
    selectedProduct?.reseller_price ||
      selectedProduct?.price ||
      0
  );

  const subtotal =
    unitPrice * numericQuantity;

  const serviceFee =
    subtotal * (serviceFeePercent / 100);

  const totalAmount =
    subtotal + serviceFee;

  function openPinModal(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    if (!productId) {
      toast.error("Select examination.");
      return;
    }

    if (![1, 2, 5].includes(numericQuantity)) {
      toast.error(
        "Quantity must be 1, 2 or 5."
      );
      return;
    }

    if (!selectedProduct) {
      toast.error(
        "Invalid exam selected."
      );
      return;
    }

    setShowPinModal(true);
  }

  function closePinModal() {
    if (purchasing) return;

    setShowPinModal(false);
  }

  async function confirmPurchase(pin: string) {
    setError("");

    if (!/^\d{4}$/.test(pin)) {
      toast.error(
        "Enter your 4 digit transaction PIN."
      );
      return;
    }

    if (!selectedProduct) {
      toast.error(
        "Invalid exam product."
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: Number(productId),
            quantity: numericQuantity,
            transactionPin: pin,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Exam PIN purchase failed."
        );
      }

      const pins = Array.isArray(result.pins)
        ? result.pins
        : [];

      setPurchaseResult({
        examName:
          result.examName ||
          selectedProduct.exam_name,

        quantity: Number(
          result.quantity ||
            numericQuantity
        ),

        unitPrice: Number(
          result.unitPrice ||
            unitPrice
        ),

        serviceFee: Number(
          result.serviceFee ||
            serviceFee
        ),

        totalAmount: Number(
          result.totalAmount ||
            totalAmount
        ),

        pins,

        reference:
          result.reference || "N/A",

        walletBalance: Number(
          result.walletBalance || 0
        ),

        status:
          result.status || "SUCCESS",

        serviceFeePercent: Number(
          result.serviceFeePercent ??
            serviceFeePercent
        ),
      });

      setShowPinModal(false);

      toast.success(
        "Exam PIN purchase successful."
      );
    } catch (error) {
      console.error(
        "EXAM PURCHASE ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Exam purchase failed.";

      setError(message);
      toast.error(message);
    } finally {
      setPurchasing(false);
    }
  }

  function closeReceipt() {
    setPurchaseResult(null);
    setQuantity("1");
  }

  if (purchaseResult) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600 dark:bg-green-950/40 dark:text-green-400">
            ✓
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Purchase Successful
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Your examination PIN is ready.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              Examination
            </span>

            <span className="text-right font-semibold text-foreground">
              {purchaseResult.examName}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Quantity
            </span>

            <span className="font-semibold text-foreground">
              {purchaseResult.quantity}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Price
            </span>

            <span className="font-semibold text-foreground">
              ₦
              {purchaseResult.unitPrice.toLocaleString(
                "en-NG"
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Service Fee (
              {purchaseResult.serviceFeePercent}
              %)
            </span>

            <span className="font-semibold text-foreground">
              ₦
              {purchaseResult.serviceFee.toLocaleString(
                "en-NG"
              )}
            </span>
          </div>

          <div className="flex justify-between border-t border-border pt-3">
            <span className="font-bold text-foreground">
              Total Deducted
            </span>

            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              ₦
              {purchaseResult.totalAmount.toLocaleString(
                "en-NG"
              )}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            Your Exam PIN
            {purchaseResult.quantity > 1
              ? "s"
              : ""}
          </h2>

          <div className="space-y-3">
            {purchaseResult.pins.length > 0 ? (
              purchaseResult.pins.map(
                (pin, index) => (
                  <div
                    key={`${pin}-${index}`}
                    className="rounded-xl bg-muted p-4"
                  >
                    <p className="text-xs text-muted-foreground">
                      PIN {index + 1}
                    </p>

                    <p className="break-all font-mono font-bold text-foreground">
                      {pin}
                    </p>
                  </div>
                )
              )
            ) : (
              <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
                Provider did not return PIN
                details.
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-foreground">
            Transaction Details
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Status
              </span>

              <span className="font-semibold text-green-600 dark:text-green-400">
                {purchaseResult.status}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Reference
              </span>

              <span className="break-all text-right font-medium text-foreground">
                {purchaseResult.reference}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Wallet Balance
              </span>

              <span className="font-semibold text-foreground">
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
          className="mt-6 w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white hover:bg-indigo-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Exam PIN
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Purchase WAEC, NECO and NABTEB PIN
          instantly.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <form
        onSubmit={openPinModal}
        className="max-w-2xl space-y-5 rounded-2xl bg-card p-5 shadow-sm"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Examination
          </label>

          <select
            value={productId}
            onChange={(e) =>
              setProductId(e.target.value)
            }
            disabled={
              loadingProducts ||
              purchasing
            }
            className="w-full rounded-xl border border-border bg-background p-3 text-foreground"
          >
            <option value="">
              {loadingProducts
                ? "Loading..."
                : "Select examination"}
            </option>

            {products.map((product) => (
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
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Quantity
          </label>

          <select
            value={quantity}
            onChange={(e) =>
              setQuantity(e.target.value)
            }
            disabled={purchasing}
            className="w-full rounded-xl border border-border bg-background p-3 text-foreground"
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
        </div>

        {selectedProduct && (
          <div className="rounded-xl bg-muted p-4">
            <div className="flex justify-between text-foreground">
              <span>
                Subtotal
              </span>

              <span>
                ₦
                {subtotal.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>

            <div className="mt-2 flex justify-between text-foreground">
              <span>
                Service Fee (
                {loadingFee
                  ? "..."
                  : serviceFeePercent}
                %)
              </span>

              <span>
                ₦
                {serviceFee.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>

            <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold text-foreground">
              <span>
                Total
              </span>

              <span className="text-indigo-600 dark:text-indigo-400">
                ₦
                {totalAmount.toLocaleString(
                  "en-NG"
                )}
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={
            loadingProducts ||
            loadingFee ||
            purchasing ||
            !productId
          }
          className="w-full rounded-xl bg-indigo-600 p-3.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {purchasing
            ? "Processing..."
            : "Buy Exam PIN"}
        </button>
      </form>

      {showPinModal && (
        <TransactionPinModal
          open={showPinModal}
          onClose={closePinModal}
          onSuccess={confirmPurchase}
        />
      )}
    </div>
  );
}