import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.IACAFE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "IACAFE_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://iacafe.com.ng/devapi/v1/whoami",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            "IACafe API request failed.",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("IACAFE WHOAMI ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to connect to IACafe.",
      },
      { status: 500 }
    );
  }
}