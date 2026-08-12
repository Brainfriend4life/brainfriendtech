import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://www.cheapdatahub.ng/api/v1/resellers/wallet/balance/",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      console.error(
        "CHEAPDATAHUB NON-JSON RESPONSE:",
        text
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub returned an unexpected response.",
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    console.log(
      "CHEAPDATAHUB BALANCE RESPONSE:",
      data
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error ||
            "Failed to fetch CheapDataHub wallet balance.",
        },
        { status: response.status }
      );
    }

    const balance = Number(
      data?.data?.balance ??
      data?.balance ??
      0
    );

    return NextResponse.json({
      success: true,
      balance,
      provider: "CHEAPDATAHUB",
    });
  } catch (error) {
    console.error(
      "CHEAPDATAHUB BALANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to connect to CheapDataHub.",
      },
      { status: 500 }
    );
  }
}