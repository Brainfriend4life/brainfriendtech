import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { networkDataSubRequest } from "@/lib/networkdatasub";

/**
 * NetworkDataSub returns pricing as an array:
 *
 * {
 *   success: true,
 *   message: "...",
 *   data: [
 *     {
 *       card_type: "standard",
 *       price: "160.00",
 *       api_price: "120.00",
 *       is_active: 1
 *     }
 *   ]
 * }
 */

type NetworkDataSubPricingItem = {
  id?: number;
  card_type?: string;
  price?: string | number | null;
  api_price?: string | number | null;
  user_type?: string;
  is_active?: number | boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

type NormalizedPrice = {
  price: number;
  api_price: number | null;
};

type PricingResponse = {
  success: boolean;
  message?: string;
  data: Record<string, NormalizedPrice>;
};

// ==========================================
// EMERGENCY FALLBACK PRICING
// ==========================================
// Used only when NetworkDataSub fails AND we have
// no cache yet. Update these if provider prices change.
const FALLBACK_PRICING: Record<string, NormalizedPrice> = {
  standard: { price: 160, api_price: 120 },
  regular: { price: 160, api_price: 120 },
  premium: { price: 250, api_price: 200 },
  vnin_slip: { price: 200, api_price: 150 },
};

/**
 * Short in-memory cache.
 *
 * This protects the application from a temporary NetworkDataSub
 * pricing 500 immediately breaking the frontend.
 *
 * NOTE:
 * This is intentionally short-lived. The provider remains the
 * source of truth.
 */
let pricingCache:
  | {
      data: Record<string, NormalizedPrice>;
      expiresAt: number;
    }
  | null = null;

const CACHE_TTL_MS = 60_000; // 1 minute

const ALLOWED_CARD_TYPES = [
  "standard",
  "regular",
  "premium",
  "vnin_slip",
] as const;

function isActive(item: NetworkDataSubPricingItem) {
  return (
    item.is_active === undefined ||
    item.is_active === true ||
    item.is_active === 1
  );
}

function toPositiveNumber(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

function normalizePricing(
  responseData: any
): Record<string, NormalizedPrice> {
  const items: NetworkDataSubPricingItem[] =
    Array.isArray(responseData?.data)
      ? responseData.data
      : [];

  const result: Record<
    string,
    NormalizedPrice
  > = {};

  for (const item of items) {
    const cardType = String(
      item?.card_type || ""
    )
      .trim()
      .toLowerCase();

    if (
      !ALLOWED_CARD_TYPES.includes(
        cardType as (typeof ALLOWED_CARD_TYPES)[number]
      )
    ) {
      continue;
    }

    if (!isActive(item)) {
      continue;
    }

    const price = toPositiveNumber(
      item.price
    );

    if (price === null) {
      continue;
    }

    const apiPrice = toPositiveNumber(
      item.api_price
    );

    result[cardType] = {
      price,
      api_price: apiPrice,
    };
  }

  return result;
}

export async function GET() {
  try {
    // ==========================================
    // AUTHENTICATION
    // ==========================================

    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // USE SHORT CACHE IF AVAILABLE
    // ==========================================

    if (
      pricingCache &&
      pricingCache.expiresAt > Date.now()
    ) {
      console.log(
        "NIN PRICING: Returning cached pricing."
      );

      return NextResponse.json({
        success: true,
        message:
          "NIN verification pricing retrieved successfully.",
        data: pricingCache.data,
        cached: true,
      });
    }

    // ==========================================
    // CALL NETWORKDATASUB
    // ==========================================

    const providerResponse =
      await networkDataSubRequest<any>(
        "/verification/nin/pricing"
      );

    console.log(
      "NETWORKDATASUB NIN PRICING STATUS:",
      providerResponse.response.status
    );

    console.log(
      "NETWORKDATASUB NIN PRICING RESPONSE:",
      providerResponse.data
    );

    // ==========================================
    // PROVIDER FAILURE
    // ==========================================

    if (
      !providerResponse.response.ok ||
      !providerResponse.data
    ) {
      /**
       * If NetworkDataSub temporarily fails but we
       * have a previous successful response, return
       * that cached response.
       */
      if (pricingCache) {
        console.warn(
          "NIN PRICING: Provider failed. Returning previous cached pricing."
        );

        return NextResponse.json({
          success: true,
          message:
            "NIN verification pricing retrieved from cache.",
          data: pricingCache.data,
          cached: true,
        });
      }

      /**
       * No cache exists yet (e.g. cold start right after
       * deploy) AND the provider is down. Use the hardcoded
       * emergency fallback instead of failing the request.
       */
      console.warn(
        "NIN PRICING: Provider failed and no cache exists. Using emergency fallback pricing."
      );

      return NextResponse.json({
        success: true,
        message:
          "NIN verification pricing retrieved (fallback).",
        data: FALLBACK_PRICING,
        fallback: true,
      });
    }

    // ==========================================
    // NORMALIZE PROVIDER RESPONSE
    // ==========================================

    if (
      providerResponse.data?.success !== true
    ) {
      if (pricingCache) {
        console.warn(
          "NIN PRICING: Provider returned success=false. Returning cached pricing."
        );

        return NextResponse.json({
          success: true,
          message:
            "NIN verification pricing retrieved from cache.",
          data: pricingCache.data,
          cached: true,
        });
      }

      console.warn(
        "NIN PRICING: Provider returned success=false and no cache exists. Using emergency fallback pricing."
      );

      return NextResponse.json({
        success: true,
        message:
          "NIN verification pricing retrieved (fallback).",
        data: FALLBACK_PRICING,
        fallback: true,
      });
    }

    const normalizedPricing =
      normalizePricing(
        providerResponse.data
      );

    console.log(
      "NORMALIZED NIN PRICING:",
      normalizedPricing
    );

    // ==========================================
    // ENSURE PRICING WAS RETURNED
    // ==========================================

    if (
      Object.keys(normalizedPricing).length === 0
    ) {
      if (pricingCache) {
        console.warn(
          "NIN PRICING: Empty provider response. Returning cached pricing."
        );

        return NextResponse.json({
          success: true,
          message:
            "NIN verification pricing retrieved from cache.",
          data: pricingCache.data,
          cached: true,
        });
      }

      console.warn(
        "NIN PRICING: Empty provider response and no cache exists. Using emergency fallback pricing."
      );

      return NextResponse.json({
        success: true,
        message:
          "NIN verification pricing retrieved (fallback).",
        data: FALLBACK_PRICING,
        fallback: true,
      });
    }

    // ==========================================
    // SAVE CACHE
    // ==========================================

    pricingCache = {
      data: normalizedPricing,
      expiresAt:
        Date.now() + CACHE_TTL_MS,
    };

    // ==========================================
    // SUCCESS
    // ==========================================

    return NextResponse.json({
      success: true,
      message:
        "NIN verification pricing retrieved successfully.",
      data: normalizedPricing,
      cached: false,
    });
  } catch (error: any) {
    console.error(
      "NIN PRICING ROUTE ERROR:",
      error
    );

    // ==========================================
    // FALLBACK TO CACHE, THEN HARDCODED PRICING
    // ==========================================

    if (pricingCache) {
      console.warn(
        "NIN PRICING: Unexpected error. Returning cached pricing."
      );

      return NextResponse.json({
        success: true,
        message:
          "NIN verification pricing retrieved from cache.",
        data: pricingCache.data,
        cached: true,
      });
    }

    console.warn(
      "NIN PRICING: Unexpected error and no cache exists. Using emergency fallback pricing."
    );

    return NextResponse.json({
      success: true,
      message:
        "NIN verification pricing retrieved (fallback).",
      data: FALLBACK_PRICING,
      fallback: true,
    });
  }
}