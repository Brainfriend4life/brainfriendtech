import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { networkDataSubRequest } from "@/lib/networkdatasub";

type NetworkDataSubPricingItem = {
  id?: number;
  card_type?: string;
  price?: string | number | null;
  api_price?: string | number | null;
  user_type?: string;
  is_active?: number | boolean;
  description?: string | null;
};

type NormalizedPrice = {
  price: number;
  api_price: number | null;
};

const ALLOWED_CARD_TYPES = [
  "standard",
  "regular",
  "premium",
  "vnin_slip",
] as const;

let pricingCache: {
  data: Record<string, NormalizedPrice>;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 60_000;

function isActive(
  item: NetworkDataSubPricingItem
): boolean {
  return (
    item.is_active === undefined ||
    item.is_active === true ||
    item.is_active === 1
  );
}

function toPositiveNumber(
  value: string | number | null | undefined
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

function normalizePricing(
  providerData: any
): Record<string, NormalizedPrice> {
  const items: NetworkDataSubPricingItem[] =
    Array.isArray(providerData?.data)
      ? providerData.data
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
        cardType as
          (typeof ALLOWED_CARD_TYPES)[number]
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
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        { status: 401 }
      );
    }

    // ========================================================
    // CACHE
    // ========================================================

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

    // ========================================================
    // NETWORKDATASUB
    // ========================================================

    const providerResponse =
      await networkDataSubRequest<any>(
        "/user"
      );

    console.log(
      "NETWORKDATASUB NIN PRICING STATUS:",
      providerResponse.response.status
    );

    console.log(
      "NETWORKDATASUB NIN PRICING RESPONSE:",
      providerResponse.data
    );

    // ========================================================
    // PROVIDER HTTP ERROR
    // ========================================================

    if (
      !providerResponse.response.ok
    ) {
      if (pricingCache) {
        console.warn(
          "NIN PRICING: Provider failed. Using cache."
        );

        return NextResponse.json({
          success: true,
          message:
            "NIN verification pricing retrieved from cache.",
          data: pricingCache.data,
          cached: true,
        });
      }

      return NextResponse.json(
        {
          success: false,
          message:
            providerResponse.data?.message ||
            "NetworkDataSub pricing service returned an error.",
          providerStatus:
            providerResponse.response.status,
        },
        { status: 502 }
      );
    }

    // ========================================================
    // PROVIDER BUSINESS ERROR
    // ========================================================

    if (
      providerResponse.data?.success !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            providerResponse.data?.message ||
            "NetworkDataSub did not return valid pricing.",
        },
        { status: 502 }
      );
    }

    // ========================================================
    // NORMALIZE
    // ========================================================

    const normalizedPricing =
      normalizePricing(
        providerResponse.data
      );

    console.log(
      "NORMALIZED NIN PRICING:",
      normalizedPricing
    );

    // ========================================================
    // EMPTY RESPONSE
    // ========================================================

    if (
      Object.keys(normalizedPricing).length === 0
    ) {
      if (pricingCache) {
        console.warn(
          "NIN PRICING: Empty response. Using cache."
        );

        return NextResponse.json({
          success: true,
          message:
            "NIN verification pricing retrieved from cache.",
          data: pricingCache.data,
          cached: true,
        });
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "No active NIN verification pricing was returned.",
        },
        { status: 502 }
      );
    }

    // ========================================================
    // SAVE CACHE
    // ========================================================

    pricingCache = {
      data: normalizedPricing,
      expiresAt:
        Date.now() + CACHE_TTL_MS,
    };

    // ========================================================
    // SUCCESS
    // ========================================================

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

    if (pricingCache) {
      return NextResponse.json({
        success: true,
        message:
          "NIN verification pricing retrieved from cache.",
        data: pricingCache.data,
        cached: true,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to retrieve NIN pricing.",
      },
      { status: 500 }
    );
  }
}