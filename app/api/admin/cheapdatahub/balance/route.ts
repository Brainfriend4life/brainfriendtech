import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

const CHEAPDATAHUB_BALANCE_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/wallet/balance/";

export async function GET() {
  try {
    // ============================================
    // AUTH
    // ============================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    // ============================================
    // API KEY
    // ============================================

    const apiKey = process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      console.error(
        "CHEAPDATAHUB_API_KEY is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ============================================
    // REQUEST CHEAPDATAHUB BALANCE
    // ============================================

    const response = await fetch(
      CHEAPDATAHUB_BALANCE_URL,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    console.log(
      "CHEAPDATAHUB BALANCE STATUS:",
      response.status
    );

    console.log(
      "CHEAPDATAHUB BALANCE RESPONSE:",
      text
    );

    // ============================================
    // PARSE RESPONSE
    // ============================================

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "CheapDataHub returned an invalid response.",
        },
        { status: 502 }
      );
    }

    // ============================================
    // PROVIDER ERROR
    // ============================================

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ||
            "Unable to fetch CheapDataHub balance.",
          providerResponse: data,
        },
        { status: response.status }
      );
    }

    // ============================================
    // BALANCE
    // ============================================

    const balance = Number(data?.data?.balance);

    if (!Number.isFinite(balance)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid balance returned by CheapDataHub.",
          providerResponse: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      balance,
      message:
        data?.message ||
        "Wallet balance fetched successfully.",
    });
  } catch (error) {
    console.error(
      "CHEAPDATAHUB BALANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch CheapDataHub balance.",
      },
      { status: 500 }
    );
  }
}