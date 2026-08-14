"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Search,
  RefreshCw,
  Phone,
  UserRound,
} from "lucide-react";

import toast from "react-hot-toast";

type CardType =
  | "standard"
  | "regular"
  | "premium"
  | "vnin_slip";

type VerificationMethod = "nin" | "phone";

type PricingItem = {
  price: number;
  api_price: number | null;
};

type Pricing = {
  standard?: PricingItem;
  regular?: PricingItem;
  premium?: PricingItem;
  vnin_slip?: PricingItem;
};

type VerificationResult = {
  verification_id: string | number;
  transaction_id?: string | null;
  reference: string;
  provider_reference?: string | null;
  amount: number;
  provider_cost?: number;
  profit?: number;
  card_type: string;
  status: string;

  details: {
    nin?: string;
    firstName?: string;
    middleName?: string | null;
    surname?: string;
    lastName?: string;
    gender?: string;
    birthDate?: string;
    dateOfBirth?: string;
    telephoneNo?: string;
    mobile?: string;
    phone?: string;
    photo?: string;
    [key: string]: unknown;
  };

  pdf_base64?: string | null;
  has_pdf?: boolean;
  wallet_balance: number;
  business_revenue?: number;
  business_cost?: number;
  business_profit?: number;
};

const CARD_TYPE_LABELS: Record<CardType, string> = {
  standard: "Standard",
  regular: "Regular",
  premium: "Premium",
  vnin_slip: "VNIN Slip",
};

export default function NinVerificationPage() {
  const [method, setMethod] =
    useState<VerificationMethod>("nin");

  const [nin, setNin] = useState("");
  const [phone, setPhone] = useState("");

  const [cardType, setCardType] =
    useState<CardType>("standard");

  const [pricing, setPricing] =
    useState<Pricing>({});

  const [loadingPricing, setLoadingPricing] =
    useState(true);

  const [pricingError, setPricingError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState<VerificationResult | null>(null);

  const pricingLoadedRef =
    useRef(false);

  const submissionKeyRef =
    useRef<string | null>(null);

  // ============================================================
  // LOAD PRICING
  // ============================================================

  useEffect(() => {
    if (pricingLoadedRef.current) {
      return;
    }

    pricingLoadedRef.current = true;

    loadPricing();
  }, []);

  async function loadPricing(
    showToast = true
  ) {
    try {
      setLoadingPricing(true);
      setPricingError("");

      const response = await fetch(
        "/api/verification/nin/pricing",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const responseText =
        await response.text();

      let data: any = null;

      try {
        data = responseText.trim()
          ? JSON.parse(responseText)
          : null;
      } catch (parseError) {
        console.error(
          "NIN PRICING INVALID JSON:",
          {
            status: response.status,
            responseText,
            parseError,
          }
        );

        throw new Error(
          "NIN pricing service returned an invalid response."
        );
      }

      console.log(
        "NIN PRICING RESPONSE:",
        data
      );

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to load NIN pricing."
        );
      }

      const source = data?.data;

      if (
        !source ||
        typeof source !== "object" ||
        Array.isArray(source)
      ) {
        throw new Error(
          "Invalid NIN pricing response."
        );
      }

      const normalized: Pricing = {};

      const cardTypes: CardType[] = [
        "standard",
        "regular",
        "premium",
        "vnin_slip",
      ];

      for (const type of cardTypes) {
        const item = source[type];

        if (
          !item ||
          typeof item !== "object"
        ) {
          continue;
        }

        const price = Number(item.price);

        const apiPrice =
          item.api_price === null ||
          item.api_price === undefined ||
          item.api_price === ""
            ? null
            : Number(item.api_price);

        if (
          !Number.isFinite(price) ||
          price <= 0
        ) {
          continue;
        }

        normalized[type] = {
          price,
          api_price:
            apiPrice !== null &&
            Number.isFinite(apiPrice) &&
            apiPrice > 0
              ? apiPrice
              : null,
        };
      }

      console.log(
        "NORMALIZED FRONTEND NIN PRICING:",
        normalized
      );

      if (
        Object.keys(normalized).length === 0
      ) {
        throw new Error(
          "No active NIN verification pricing was returned."
        );
      }

      setPricing(normalized);

      if (!normalized[cardType]) {
        const firstAvailable =
          cardTypes.find(
            (type) => normalized[type]
          );

        if (firstAvailable) {
          setCardType(firstAvailable);
        }
      }

      if (data?.cached) {
        console.log(
          "NIN pricing was served from cache."
        );
      }

      if (data?.fallback) {
        console.warn(
          "NIN pricing served from emergency fallback values."
        );
      }
    } catch (error: any) {
      console.error(
        "NIN PRICING ERROR:",
        error
      );

      const message =
        error?.message ||
        "Unable to load NIN pricing.";

      setPricingError(message);

      if (showToast) {
        toast.error(message);
      }
    } finally {
      setLoadingPricing(false);
    }
  }

  // ============================================================
  // IDEMPOTENCY KEY
  // ============================================================

  function createIdempotencyKey() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      return `verification-${crypto.randomUUID()}`;
    }

    return `verification-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 18)}`;
  }

  // ============================================================
  // VERIFY NIN
  // ============================================================

  async function verifyNin(
    cleanedNin: string,
    idempotencyKey: string
  ) {
    const response =
      await fetch(
        "/api/verification/nin",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            nin: cleanedNin,
            cardType,
            idempotencyKey,
          }),
        }
      );

    const responseText =
      await response.text();

    let data: any = null;

    try {
      data = responseText.trim()
        ? JSON.parse(responseText)
        : null;
    } catch (parseError) {
      console.error(
        "NIN VERIFICATION INVALID JSON:",
        {
          status: response.status,
          responseText,
          parseError,
        }
      );

      throw new Error(
        "The server returned an invalid response."
      );
    }

    console.log(
      "NIN VERIFICATION RESPONSE:",
      data
    );

    if (
      !response.ok ||
      data?.success !== true
    ) {
      throw new Error(
        data?.error ||
          data?.message ||
          "NIN verification failed."
      );
    }

    if (!data?.data) {
      throw new Error(
        "NIN verification succeeded but no result was returned."
      );
    }

    return data.data;
  }

  // ============================================================
  // VERIFY NIN BY PHONE
  // ============================================================

  async function verifyByPhone(
    cleanedPhone: string,
    idempotencyKey: string
  ) {
    /*
     * Your local backend route should handle:
     *
     * POST /api/verification/nin/phone-search
     *
     * and then call NetworkDataSub:
     *
     * POST https://networkdatasub.com/api/verification/nin/phone-search
     *
     * This keeps your API token hidden from the browser.
     */

    const response =
      await fetch(
        "/api/verification/nin/phone-search",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            phone: cleanedPhone,
            cardType,
            idempotencyKey,
          }),
        }
      );

    const responseText =
      await response.text();

    let data: any = null;

    try {
      data = responseText.trim()
        ? JSON.parse(responseText)
        : null;
    } catch (parseError) {
      console.error(
        "PHONE VERIFICATION INVALID JSON:",
        {
          status: response.status,
          responseText,
          parseError,
        }
      );

      throw new Error(
        "The server returned an invalid response."
      );
    }

    console.log(
      "PHONE VERIFICATION RESPONSE:",
      data
    );

    if (
      !response.ok ||
      data?.success !== true
    ) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Phone number verification failed."
      );
    }

    if (!data?.data) {
      throw new Error(
        "Phone verification succeeded but no result was returned."
      );
    }

    return data.data;
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const selectedPricing =
      pricing[cardType];

    if (
      !selectedPricing ||
      !Number.isFinite(
        selectedPricing.price
      ) ||
      selectedPricing.price <= 0
    ) {
      toast.error(
        "The selected verification price is unavailable."
      );

      return;
    }

    let cleanedValue = "";

    if (method === "nin") {
      cleanedValue = nin.replace(
        /\s+/g,
        ""
      );

      if (
        !/^\d{11}$/.test(
          cleanedValue
        )
      ) {
        toast.error(
          "Please enter a valid 11-digit NIN."
        );

        return;
      }
    } else {
      cleanedValue = phone.replace(
        /\s+/g,
        ""
      );

      if (
        !/^0\d{10}$/.test(
          cleanedValue
        )
      ) {
        toast.error(
          "Please enter a valid 11-digit Nigerian phone number."
        );

        return;
      }
    }

    const idempotencyKey =
      createIdempotencyKey();

    submissionKeyRef.current =
      idempotencyKey;

    try {
      setLoading(true);
      setResult(null);

      console.log(
        "VERIFICATION SUBMISSION:",
        {
          method,
          value: cleanedValue,
          cardType,
          idempotencyKey,
        }
      );

      let verificationResult;

      if (method === "nin") {
        verificationResult =
          await verifyNin(
            cleanedValue,
            idempotencyKey
          );
      } else {
        verificationResult =
          await verifyByPhone(
            cleanedValue,
            idempotencyKey
          );
      }

      setResult(
        verificationResult
      );

      toast.success(
        method === "nin"
          ? "NIN verification completed successfully."
          : "Phone number verification completed successfully."
      );
    } catch (error: any) {
      console.error(
        "VERIFICATION ERROR:",
        error
      );

      toast.error(
        error?.message ||
          "Verification failed."
      );
    } finally {
      setLoading(false);

      submissionKeyRef.current =
        null;
    }
  }

  // ============================================================
  // DOWNLOAD PDF
  // ============================================================

  function downloadPdf() {
    if (!result?.pdf_base64) {
      toast.error(
        "PDF certificate is not available."
      );

      return;
    }

    try {
      const base64 =
        result.pdf_base64
          .replace(
            /^data:application\/pdf;base64,/,
            ""
          )
          .trim();

      const byteCharacters =
        atob(base64);

      const byteNumbers =
        new Array(
          byteCharacters.length
        );

      for (
        let i = 0;
        i <
        byteCharacters.length;
        i++
      ) {
        byteNumbers[i] =
          byteCharacters.charCodeAt(
            i
          );
      }

      const byteArray =
        new Uint8Array(
          byteNumbers
        );

      const blob =
        new Blob(
          [byteArray],
          {
            type:
              "application/pdf",
          }
        );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `NIN-${result.reference}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(
        "PDF DOWNLOAD ERROR:",
        error
      );

      toast.error(
        "Unable to download PDF certificate."
      );
    }
  }

  // ============================================================
  // SELECTED PRICE
  // ============================================================

  const selectedPricing =
    pricing[cardType];

  const selectedPrice =
    selectedPricing?.price;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">

        {/* HEADER */}

        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600">
            <ShieldCheck className="h-4 w-4" />

            Identity Verification
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            NIN Verification
          </h1>

          <p className="mt-3 max-w-2xl text-gray-500">
            Verify a Nigerian National
            Identification Number directly
            or search for a NIN using a
            registered phone number.
          </p>
        </div>

        {/* ======================================================
            VERIFICATION METHOD
        ====================================================== */}

        <div className="mb-6 rounded-3xl border border-gray-100 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={() => {
                setMethod("nin");
                setResult(null);
              }}
              disabled={loading}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
                method === "nin"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <UserRound className="h-5 w-5" />

              Verify by NIN
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod("phone");
                setResult(null);
              }}
              disabled={loading}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
                method === "phone"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Phone className="h-5 w-5" />

              Verify by Phone
            </button>

          </div>
        </div>

        {/* ======================================================
            MAIN GRID
        ====================================================== */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ====================================================
              FORM
          ==================================================== */}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              {/* INPUT */}

              {method === "nin" ? (
                <div>
                  <label
                    htmlFor="nin"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    NIN
                  </label>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      id="nin"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={11}
                      placeholder="Enter 11-digit NIN"
                      value={nin}
                      onChange={(event) =>
                        setNin(
                          event.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-gray-50"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    {nin.length}/11 digits
                  </p>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={11}
                      placeholder="08012345678"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-gray-50"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    {phone.length}/11 digits
                  </p>
                </div>
              )}

              {/* CARD TYPE */}

              <div>
                <label
                  htmlFor="cardType"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Verification Type
                </label>

                <select
                  id="cardType"
                  value={cardType}
                  onChange={(event) =>
                    setCardType(
                      event.target
                        .value as CardType
                    )
                  }
                  disabled={
                    loading ||
                    loadingPricing
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                >
                  <option value="standard">
                    Standard
                  </option>

                  <option value="regular">
                    Regular
                  </option>

                  <option value="premium">
                    Premium
                  </option>

                  <option value="vnin_slip">
                    VNIN Slip
                  </option>
                </select>
              </div>

              {/* PRICE */}

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">

                  <span className="text-sm text-gray-500">
                    Verification fee
                  </span>

                  <span className="text-lg font-bold text-gray-900">

                    {loadingPricing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />

                        Loading...
                      </span>
                    ) : selectedPrice ? (
                      `₦${selectedPrice.toLocaleString(
                        "en-NG",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}`
                    ) : (
                      "Unavailable"
                    )}

                  </span>
                </div>

                {selectedPricing && (
                  <p className="mt-2 text-xs text-gray-400">
                    {
                      CARD_TYPE_LABELS[
                        cardType
                      ]
                    }{" "}
                    verification
                  </p>
                )}
              </div>

              {/* PRICING ERROR */}

              {pricingError && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">

                  <p className="text-sm text-red-600">
                    {pricingError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      loadPricing(true)
                    }
                    disabled={
                      loadingPricing
                    }
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        loadingPricing
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    Retry pricing
                  </button>

                </div>
              )}

              {/* BUTTON */}

              <button
                type="submit"
                disabled={
                  loading ||
                  loadingPricing ||
                  !selectedPrice
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />

                    {method === "nin"
                      ? "Verifying NIN..."
                      : "Searching Phone..."}
                  </>
                ) : (
                  <>
                    {method === "nin" ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : (
                      <Phone className="h-5 w-5" />
                    )}

                    {method === "nin"
                      ? "Verify NIN"
                      : "Verify by Phone"}
                  </>
                )}
              </button>

            </form>
          </div>

          {/* ====================================================
              RESULT
          ==================================================== */}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">

            {!result ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">

                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  {method === "nin" ? (
                    <FileText className="h-8 w-8" />
                  ) : (
                    <Phone className="h-8 w-8" />
                  )}
                </div>

                <h2 className="text-lg font-bold text-gray-900">
                  Verification Result
                </h2>

                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                  {method === "nin"
                    ? "Your verified identity information will appear here after successful NIN verification."
                    : "The NIN information associated with the phone number will appear here after successful search."}
                </p>

              </div>
            ) : (
              <div>

                {/* SUCCESS HEADER */}

                <div className="mb-6 flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="font-bold text-gray-900">
                      Verification Successful
                    </h2>

                    <p className="text-xs text-gray-500">
                      {result.reference}
                    </p>
                  </div>

                </div>

                {/* AMOUNT */}

                <div className="mb-6 rounded-2xl bg-green-50 p-4">

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-green-700">
                      Amount charged
                    </span>

                    <span className="font-bold text-green-800">
                      ₦
                      {Number(
                        result.amount
                      ).toLocaleString(
                        "en-NG",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>

                  </div>

                  <div className="mt-1 flex items-center justify-between">

                    <span className="text-xs text-green-600">
                      Verification type
                    </span>

                    <span className="text-xs font-semibold text-green-700">
                      {
                        CARD_TYPE_LABELS[
                          result.card_type as CardType
                        ] ||
                        result.card_type
                      }
                    </span>

                  </div>

                </div>

                {/* DETAILS */}

                <div className="space-y-4">

                  <ResultRow
                    label="First Name"
                    value={
                      result.details
                        ?.firstName
                    }
                  />

                  <ResultRow
                    label="Middle Name"
                    value={
                      result.details
                        ?.middleName
                    }
                  />

                  <ResultRow
                    label="Surname"
                    value={
                      result.details
                        ?.surname ||
                      result.details
                        ?.lastName
                    }
                  />

                  <ResultRow
                    label="Gender"
                    value={
                      result.details
                        ?.gender
                    }
                  />

                  <ResultRow
                    label="Date of Birth"
                    value={
                      result.details
                        ?.birthDate ||
                      result.details
                        ?.dateOfBirth
                    }
                  />

                  <ResultRow
                    label="Phone"
                    value={
                      result.details
                        ?.telephoneNo ||
                      result.details
                        ?.mobile ||
                      result.details
                        ?.phone
                    }
                  />

                  <ResultRow
                    label="NIN"
                    value={
                      result.details
                        ?.nin
                    }
                  />

                </div>

                {/* WALLET */}

                <div className="mt-6 rounded-2xl bg-slate-50 p-4">

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-gray-500">
                      Wallet balance
                    </span>

                    <span className="font-bold text-gray-900">
                      ₦
                      {Number(
                        result.wallet_balance
                      ).toLocaleString(
                        "en-NG",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>

                  </div>

                </div>

                {/* PDF */}

                {result.has_pdf &&
                  result.pdf_base64 && (
                    <button
                      type="button"
                      onClick={downloadPdf}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3.5 text-sm font-bold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      <FileText className="h-5 w-5" />

                      Download NIN Certificate
                    </button>
                  )}

              </div>
            )}

          </div>
        </div>

        {/* ======================================================
            INFORMATION
        ====================================================== */}

        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <div className="flex gap-3">

            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

            <div>
              <h3 className="text-sm font-bold text-indigo-900">
                Verification Information
              </h3>

              <p className="mt-1 text-sm leading-6 text-indigo-700">
                You can verify directly with an
                11-digit NIN or search for the
                NIN associated with an 11-digit
                Nigerian phone number.
              </p>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}

// ============================================================
// RESULT ROW
// ============================================================

function ResultRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">

      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-sm font-semibold text-gray-900">
        {value || "—"}
      </span>

    </div>
  );
}