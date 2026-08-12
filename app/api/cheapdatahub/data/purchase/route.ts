import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const { bundle_id, phone_number } = body;

    if (!bundle_id || !phone_number) {
      return NextResponse.json(
        {
          success: false,
          error: "bundle_id and phone_number are required.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://www.cheapdatahub.ng/api/v1/resellers/data/purchase/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          bundle_id: Number(bundle_id),
          phone_number: phone_number,
        }),
        cache: "no-store",
      }
    );

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      console.error("CHEAPDATAHUB NON-JSON RESPONSE:", text);

      return NextResponse.json(
        {
          success: false,
          error: "CheapDataHub returned a non-JSON response.",
          status: response.status,
        },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();

    console.log("CHEAPDATAHUB DATA PURCHASE:", data);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            "CheapDataHub data purchase failed.",
          data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        data?.message ||
        "Data purchase request sent successfully.",
      reference: data?.reference || null,
      data,
    });
  } catch (error) {
    console.error("CHEAPDATAHUB DATA PURCHASE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to connect to CheapDataHub.",
      },
      { status: 500 }
    );
  }
}