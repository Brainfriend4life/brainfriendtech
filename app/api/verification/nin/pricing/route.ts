
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { networkDataSubRequest } from "@/lib/networkdatasub";

const ALLOWED_CARD_TYPES = [
  "standard",
  "regular",
  "premium",
  "vnin_slip",
] as const;

type AllowedCardType =
  (typeof ALLOWED_CARD_TYPES)[number];

type PricingItem = {
  id?: number | string;
  card_type?: string;
  type?: string;
  name?: string;
  price?: string | number | null;
  api_price?: string | number | null;
  user_type?: string;
  is_active?: number | boolean | string;
  active?: number | boolean | string;
  status?: number | boolean | string;
};

type NormalizedPrice = {
  price: number;
  basePrice: number;
  serviceFee: number;
  serviceFeePercentage: number;
  api_price: number | null;
};

const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";
const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;

/*
|--------------------------------------------------------------------------
| YOUR BASE NIN SELLING PRICES
|--------------------------------------------------------------------------
|
| These are the prices BEFORE your global service fee.
|
| The service fee is automatically added from:
|
| SERVICE_FEE_PERCENT
|
| Example:
| Premium = ₦250
| Service fee = 5%
| Customer pays = ₦262.50
|
*/

const NIN_BASE_PRICES: Record<
  AllowedCardType,
  number
> = {
  standard: 200,
  regular: 150,
  premium: 250,
  vnin_slip: 150,
};

let pricingCache: {
  data: Record<string, NormalizedPrice>;
  expiresAt: number;
  serviceFeePercentage: number;
} | null = null;

const CACHE_TTL_MS = 60_000;

/*
|--------------------------------------------------------------------------
| JSON RESPONSE
|--------------------------------------------------------------------------
*/

function jsonResponse(
  data: Record<string, any>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/*
|--------------------------------------------------------------------------
| NORMALIZE CARD TYPE
|--------------------------------------------------------------------------
*/

function normalizeCardType(
  value: unknown
): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/*
|--------------------------------------------------------------------------
| CHECK PROVIDER ITEM ACTIVE
|--------------------------------------------------------------------------
*/

function isActive(
  item: PricingItem
): boolean {
  if (
    item.is_active === undefined &&
    item.active === undefined &&
    item.status === undefined
  ) {
    return true;
  }

  const values = [
    item.is_active,
    item.active,
    item.status,
  ];

  return values.some((value) => {
    if (value === true || value === 1) {
      return true;
    }

    const normalized = String(value || "")
      .trim()
      .toLowerCase();

    return [
      "true",
      "1",
      "active",
      "enabled",
      "success",
    ].includes(normalized);
  });
}

/*
|--------------------------------------------------------------------------
| NUMBER CONVERTER
|--------------------------------------------------------------------------
*/

function toPositiveNumber(
  value:
    | string
    | number
    | null
    | undefined
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₦/g, "")
    .trim();

  const numberValue = Number(cleaned);

  if (
    !Number.isFinite(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

/*
|--------------------------------------------------------------------------
| GET SERVICE FEE FROM DATABASE
|--------------------------------------------------------------------------
*/

async function getServiceFeePercentage(): Promise<number> {
  try {
    const setting =
      await prisma.systemSetting.findUnique({
        where: {
          key: SERVICE_FEE_SETTING_KEY,
        },
      });

    if (!setting) {
      return DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    const percentage = Number(
      setting.value
    );

    if (
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      return DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    return percentage;
  } catch (error) {
    console.error(
      "NIN SERVICE FEE SETTING ERROR:",
      error
    );

    return DEFAULT_SERVICE_FEE_PERCENTAGE;
  }
}

/*
|--------------------------------------------------------------------------
| EXTRACT PROVIDER PRICING
|--------------------------------------------------------------------------
*/

function extractItems(
  providerData: any
): PricingItem[] {
  if (
    Array.isArray(providerData?.data)
  ) {
    return providerData.data;
  }

  if (
    Array.isArray(
      providerData?.data?.data
    )
  ) {
    return providerData.data.data;
  }

  if (
    Array.isArray(
      providerData?.data?.pricing
    )
  ) {
    return providerData.data.pricing;
  }

  if (
    Array.isArray(
      providerData?.pricing
    )
  ) {
    return providerData.pricing;
  }

  if (
    Array.isArray(
      providerData?.prices
    )
  ) {
    return providerData.prices;
  }

  if (
    Array.isArray(
      providerData?.data?.prices
    )
  ) {
    return providerData.data.prices;
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| GET NETWORKDATASUB API PRICES
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| api_price is ONLY the provider/API cost.
|
| It does NOT control what your customer pays.
|
*/

function extractApiPrices(
  providerData: any
): Record<string, number | null> {
  const items =
    extractItems(providerData);

  const result: Record<
    string,
    number | null
  > = {};

  for (const item of items) {
    if (!item) {
      continue;
    }

    const cardType =
      normalizeCardType(
        item.card_type ||
          item.type ||
          item.name
      );

    if (
      !ALLOWED_CARD_TYPES.includes(
        cardType as AllowedCardType
      )
    ) {
      continue;
    }

    if (!isActive(item)) {
      continue;
    }

    const apiPrice =
      toPositiveNumber(
        item.api_price
      );

    result[cardType] =
      apiPrice;
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| BUILD FINAL PRICING
|--------------------------------------------------------------------------
|
| Base price:
| NIN_BASE_PRICES
|
| Service fee:
| SERVICE_FEE_PERCENT
|
| Customer price:
| base price + service fee
|
| API price:
| NetworkDataSub api_price
|
*/

function buildFinalPricing(
  providerApiPrices: Record<
    string,
    number | null
  >,
  serviceFeePercentage: number
): Record<
  string,
  NormalizedPrice
> {
  const result: Record<
    string,
    NormalizedPrice
  > = {};

  for (const cardType of ALLOWED_CARD_TYPES) {
    const basePrice =
      NIN_BASE_PRICES[cardType];

    const serviceFee = Number(
      (
        basePrice *
        (serviceFeePercentage / 100)
      ).toFixed(2)
    );

    const customerPrice = Number(
      (
        basePrice +
        serviceFee
      ).toFixed(2)
    );

    result[cardType] = {
      price: customerPrice,

      basePrice,

      serviceFee,

      serviceFeePercentage,

      api_price:
        providerApiPrices[
          cardType
        ] ?? null,
    };
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATION
    |--------------------------------------------------------------------------
    */

    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return jsonResponse(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        401
      );
    }

    /*
    |--------------------------------------------------------------------------
    | GET CURRENT SERVICE FEE
    |--------------------------------------------------------------------------
    */

    const serviceFeePercentage =
      await getServiceFeePercentage();

    /*
    |--------------------------------------------------------------------------
    | CACHE
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Cache is only used if the service fee has not changed.
    |
    */

    if (
      pricingCache &&
      pricingCache.expiresAt >
        Date.now() &&
      pricingCache.serviceFeePercentage ===
        serviceFeePercentage
    ) {
      return jsonResponse({
        success: true,

        message:
          "NIN verification pricing retrieved successfully.",

        data:
          pricingCache.data,

        serviceFeePercentage,

        cached: true,

        fallback: false,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | GET NETWORKDATASUB API PRICES
    |--------------------------------------------------------------------------
    */

    let providerResponse:
      any = null;

    try {
      providerResponse =
        await networkDataSubRequest<any>(
          "/user"
        );
    } catch (error) {
      console.error(
        "NETWORKDATASUB NIN PRICING ERROR:",
        error
      );
    }

    /*
    |--------------------------------------------------------------------------
    | EXTRACT API PRICE ONLY
    |--------------------------------------------------------------------------
    */

    let providerApiPrices: Record<
      string,
      number | null
    > = {};

    if (providerResponse) {
      console.log(
        "NETWORKDATASUB NIN PRICING STATUS:",
        providerResponse?.response?.status
      );

      console.log(
        "NETWORKDATASUB NIN PRICING RESPONSE:",
        JSON.stringify(
          providerResponse?.data || {},
          null,
          2
        )
      );

      providerApiPrices =
        extractApiPrices(
          providerResponse?.data
        );

      console.log(
        "NETWORKDATASUB API PRICES:",
        JSON.stringify(
          providerApiPrices,
          null,
          2
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | BUILD FINAL CUSTOMER PRICES
    |--------------------------------------------------------------------------
    */

    const finalPricing =
      buildFinalPricing(
        providerApiPrices,
        serviceFeePercentage
      );

    console.log(
      "FINAL NIN PRICING:",
      JSON.stringify(
        finalPricing,
        null,
        2
      )
    );

    /*
    |--------------------------------------------------------------------------
    | SAVE CACHE
    |--------------------------------------------------------------------------
    */

    pricingCache = {
      data: finalPricing,

      expiresAt:
        Date.now() +
        CACHE_TTL_MS,

      serviceFeePercentage,
    };

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return jsonResponse({
      success: true,

      message:
        "NIN verification pricing retrieved successfully.",

      data: finalPricing,

      serviceFeePercentage,

      cached: false,

      fallback:
        !providerResponse,
    });
  } catch (error: any) {
    console.error(
      "NIN PRICING ROUTE ERROR:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | CURRENT SERVICE FEE
    |--------------------------------------------------------------------------
    */

    const serviceFeePercentage =
      await getServiceFeePercentage();

    /*
    |--------------------------------------------------------------------------
    | CACHE FALLBACK
    |--------------------------------------------------------------------------
    */

    if (
      pricingCache &&
      pricingCache.serviceFeePercentage ===
        serviceFeePercentage
    ) {
      return jsonResponse({
        success: true,

        message:
          "NIN verification pricing retrieved from cache.",

        data:
          pricingCache.data,

        serviceFeePercentage,

        cached: true,

        fallback: false,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FINAL FALLBACK
    |--------------------------------------------------------------------------
    */

    const fallbackPricing =
      buildFinalPricing(
        {},
        serviceFeePercentage
      );

    pricingCache = {
      data: fallbackPricing,

      expiresAt:
        Date.now() +
        CACHE_TTL_MS,

      serviceFeePercentage,
    };

    return jsonResponse({
      success: true,

      message:
        "NIN verification pricing loaded using configured prices.",

      data:
        fallbackPricing,

      serviceFeePercentage,

      cached: false,

      fallback: true,
    });
  }
}

