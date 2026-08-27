import { NextRequest, NextResponse } from "next/server";
import { getServiceFeePercent } from "@/lib/service-fee";

const CABLE_PLANS = [
  {
    id: 3,
    provider: "DSTV",
    name: "DStv Padi",
    price: 4400,
  },
  {
    id: 4,
    provider: "GOTV",
    name: "GOtv Smallie-monthly",
    price: 1900,
  },
  {
    id: 5,
    provider: "STARTIMES",
    name: "Nova (antenna) - 1 week",
    price: 700,
  },
  {
    id: 6,
    provider: "DSTV",
    name: "DStv Yanga",
    price: 6000,
  },
  {
    id: 7,
    provider: "DSTV",
    name: "DStv Confam",
    price: 11000,
  },
  {
    id: 8,
    provider: "DSTV",
    name: "DStv Compact",
    price: 19000,
  },
  {
    id: 9,
    provider: "DSTV",
    name: "DStv Compact Plus",
    price: 30000,
  },
  {
    id: 10,
    provider: "DSTV",
    name: "DStv Premium",
    price: 44500,
  },
  {
    id: 11,
    provider: "GOTV",
    name: "GOtv Jinja",
    price: 3900,
  },
  {
    id: 12,
    provider: "GOTV",
    name: "GOtv Jolli",
    price: 5800,
  },
  {
    id: 13,
    provider: "GOTV",
    name: "GOtv Max",
    price: 8500,
  },
  {
    id: 14,
    provider: "GOTV",
    name: "GOtv Supa",
    price: 11400,
  },
  {
    id: 15,
    provider: "GOTV",
    name: "GOtv Supa Plus",
    price: 16800,
  },
  {
    id: 16,
    provider: "STARTIMES",
    name: "Nova (Dish) - 1 Week",
    price: 700,
  },
  {
    id: 17,
    provider: "STARTIMES",
    name: "Nova (Antenna) - 1 Month",
    price: 2100,
  },
  {
    id: 18,
    provider: "STARTIMES",
    name: "Basic (Antenna) - 1 Week",
    price: 1400,
  },
  {
    id: 19,
    provider: "STARTIMES",
    name: "Basic (Dish) - 1 Week",
    price: 1700,
  },
  {
    id: 20,
    provider: "STARTIMES",
    name: "Basic (Antenna) - 1 Month",
    price: 4000,
  },
  {
    id: 21,
    provider: "STARTIMES",
    name: "Basic (Dish) - 1 Month",
    price: 5100,
  },
  {
    id: 22,
    provider: "STARTIMES",
    name: "Classic (Dish) - 1 Week",
    price: 2500,
  },
  {
    id: 23,
    provider: "STARTIMES",
    name: "Classic (Dish) - 1 Month",
    price: 7400,
  },
  {
    id: 24,
    provider: "STARTIMES",
    name: "Super (Dish) - 1 Week",
    price: 3300,
  },
  {
    id: 25,
    provider: "STARTIMES",
    name: "Super (Antenna) - 1 Week",
    price: 3200,
  },
  {
    id: 26,
    provider: "STARTIMES",
    name: "Super (Antenna) - 1 Month",
    price: 9500,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const provider =
      searchParams.get("provider") ||
      searchParams.get("serviceID");

    let plans = CABLE_PLANS;

    if (provider) {
      const normalizedProvider =
        provider.toUpperCase();

      plans = CABLE_PLANS.filter(
        (plan) =>
          plan.provider === normalizedProvider
      );
    }

    // Get the exact fee configured in admin.
    const serviceFeePercentage =
      await getServiceFeePercent();

    return NextResponse.json({
      success: true,
      data: plans,
      serviceFeePercentage,
    });
  } catch (error) {
    console.error(
      "CABLE PLANS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load cable plans.",
      },
      { status: 500 }
    );
  }
}