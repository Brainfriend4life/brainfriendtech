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
      "https://www.cheapdatahub.ng/api/v1/resellers/data/plans/",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      console.error(
        "CHEAPDATAHUB NON-JSON RESPONSE:",
        response.status,
        text.substring(0, 500)
      );

      return NextResponse.json(
        {
          success: false,
          error: "CheapDataHub returned a non-JSON response.",
          status: response.status,
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    console.log("CHEAPDATAHUB DATA PLANS:", data);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            "Failed to fetch CheapDataHub data plans.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data?.data ?? data,
    });
  } catch (error) {
    console.error(
      "CHEAPDATAHUB DATA PLANS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to connect to CheapDataHub.",
      },
      { status: 500 }
    );
  }
}