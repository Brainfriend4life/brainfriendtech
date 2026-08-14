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

type NinCardType = (typeof ALLOWED_CARD_TYPES)[number];

type NormalizedPrice = {
  price: number;
  basePrice: number;
  serviceFee: number;
  serviceFeePercentage: number;
  api_price: number | null;
};

/*
|--------------------------------------------------------------------------
| YOUR ACTUAL NIN PRICES
|--------------------------------------------------------------------------
|
| These prices are NOT taken from NetworkDataSub.
| This prevents NetworkDataSub's reseller price from
| replacing your own prices.
|
*/

const NIN_BASE_PRICES: Record<NinCardType, number> = {
  standard: 150,
  regular: 150,
  premium: 250,
  vnin_slip: 150,
};

const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";

const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;

let pricingCache: {
  data: Record<string, NormalizedPrice>;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 60_000;

/*
|--------------------------------------------------------------------------
| SERVICE FEE
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

    const percentage = Number(setting.value);

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
| PROVIDER API PRICE
|--------------------------------------------------------------------------
|
| We only use NetworkDataSub's api_price as information.
| We DO NOT use provider price as your customer price.
|
*/

function getProviderApiPrice(
  providerData: any,
  cardType: NinCardType
): number | null {
  const items = Array.isArray(providerData?.data)
    ? providerData.data
    : [];

  const item = items.find(
    (entry: any) =>
      String(entry?.card_type || "")
        .trim()
        .toLowerCase() === cardType
  );

  if (
    !item ||
    item.api_price === null ||
    item.api_price === undefined ||
    item.api_price === ""
  ) {
    return null;
  }

  const value = Number(item.api_price);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| BUILD OUR PRICING
|--------------------------------------------------------------------------
*/

function buildPricing(
  providerData: any,
  serviceFeePercentage: number
): Record<string, NormalizedPrice> {
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

    const apiPrice =
      getProviderApiPrice(
        providerData,
        cardType
      );

    result[cardType] = {
      price: customerPrice,

      basePrice,

      serviceFee,

      serviceFeePercentage,

      api_price: apiPrice,
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
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SERVICE FEE
    |--------------------------------------------------------------------------
    */

    const serviceFeePercentage =
      await getServiceFeePercentage();

    /*
    |--------------------------------------------------------------------------
    | CACHE
    |--------------------------------------------------------------------------
    */

    if (
      pricingCache &&
      pricingCache.expiresAt >
        Date.now()
    ) {
      return NextResponse.json({
        success: true,

        message:
          "NIN verification pricing retrieved successfully.",

        data:
          pricingCache.data,

        serviceFeePercentage,

        cached: true,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NETWORKDATASUB
    |--------------------------------------------------------------------------
    |
    | We call the provider only to obtain api_price.
    |
    */

    let providerData: any = null;

    try {
      const providerResponse =
        await networkDataSubRequest<any>(
          "/user"
        );

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

      if (
        providerResponse?.response?.ok &&
        providerResponse?.data?.success === true
      ) {
        providerData =
          providerResponse.data;
      }
    } catch (error) {
      console.error(
        "NETWORKDATASUB PRICING ERROR:",
        error
      );
    }

    /*
    |--------------------------------------------------------------------------
    | BUILD OUR OWN PRICES
    |--------------------------------------------------------------------------
    */

    const pricing =
      buildPricing(
        providerData,
        serviceFeePercentage
      );

    console.log(
      "FINAL NIN CUSTOMER PRICING:",
      JSON.stringify(
        pricing,
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
      data: pricing,

      expiresAt:
        Date.now() +
        CACHE_TTL_MS,
    };

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      message:
        "NIN verification pricing retrieved successfully.",

      data: pricing,

      serviceFeePercentage,

      cached: false,
    });
  } catch (error: any) {
    console.error(
      "NIN PRICING ROUTE ERROR:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | RETURN CACHE IF AVAILABLE
    |--------------------------------------------------------------------------
    */

    if (pricingCache) {
      const serviceFeePercentage =
        await getServiceFeePercentage();

      return NextResponse.json({
        success: true,

        message:
          "NIN verification pricing retrieved from cache.",

        data:
          pricingCache.data,

        serviceFeePercentage,

        cached: true,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | EMERGENCY FALLBACK
    |--------------------------------------------------------------------------
    */

    const serviceFeePercentage =
      await getServiceFeePercentage();

    const pricing =
      buildPricing(
        null,
        serviceFeePercentage
      );

    return NextResponse.json({
      success: true,

      message:
        "NIN verification pricing loaded successfully.",

      data: pricing,

      serviceFeePercentage,

      cached: false,
    });
  }
}