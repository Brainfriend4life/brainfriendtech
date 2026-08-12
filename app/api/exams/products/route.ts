import { NextResponse } from "next/server";

const CHEAPDATAHUB_EXAM_PRODUCTS_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/exam-pin/products/";

export async function GET() {
  try {
    const apiKey = process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      console.error(
        "CHEAPDATAHUB_API_KEY is missing"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    console.log(
      "========== EXAM PIN PRODUCTS =========="
    );

    console.log(
      "URL:",
      CHEAPDATAHUB_EXAM_PRODUCTS_URL
    );

    console.log(
      "API KEY EXISTS:",
      !!apiKey
    );

    const response = await fetch(
      CHEAPDATAHUB_EXAM_PRODUCTS_URL,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },

        cache: "no-store",
      }
    );

    const responseText =
      await response.text();

    console.log(
      "EXAM PRODUCTS STATUS:",
      response.status
    );

    console.log(
      "EXAM PRODUCTS RESPONSE:",
      responseText
    );

    // ==========================================
    // PROVIDER RETURNED EMPTY RESPONSE
    // ==========================================

    if (!responseText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub returned an empty response.",
          providerStatus: response.status,
        },
        { status: 502 }
      );
    }

    // ==========================================
    // PARSE PROVIDER RESPONSE
    // ==========================================

    let providerResult: any;

    try {
      providerResult =
        JSON.parse(responseText);
    } catch (error) {
      console.error(
        "EXAM PRODUCTS JSON PARSE ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub returned an invalid response.",
          providerStatus: response.status,
          providerResponse:
            responseText.substring(0, 500),
        },
        { status: 502 }
      );
    }

    // ==========================================
    // PROVIDER ERROR
    // ==========================================

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            providerResult?.message ||
            providerResult?.error ||
            "Unable to load exam PIN products.",
          providerStatus: response.status,
          providerResponse: providerResult,
        },
        { status: response.status }
      );
    }

    // ==========================================
    // CHECK PROVIDER SUCCESS
    // ==========================================

    const providerSuccess =
      providerResult?.success === true ||
      providerResult?.status === true ||
      providerResult?.status === "true";

    if (!providerSuccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            providerResult?.message ||
            providerResult?.error ||
            "CheapDataHub could not return exam PIN products.",
          providerResponse: providerResult,
        },
        { status: 502 }
      );
    }

    // ==========================================
    // GET PRODUCTS
    // ==========================================

    const products =
      Array.isArray(providerResult?.data)
        ? providerResult.data
        : Array.isArray(
              providerResult?.data?.products
            )
          ? providerResult.data.products
          : [];

    // ==========================================
    // NORMALIZE PRODUCTS
    // ==========================================

    const normalizedProducts =
      products.map((product: any) => ({
        id: Number(product.id),

        exam_name:
          product.exam_name ||
          product.examName ||
          product.name ||
          "Exam PIN",

        price: Number(
          product.price ||
            product.reseller_price ||
            0
        ),

        reseller_price: Number(
          product.reseller_price ||
            product.price ||
            0
        ),

        api_price: Number(
          product.api_price ||
            product.price ||
            0
        ),

        is_active:
          product.is_active !== false,
      }));

    console.log(
      "NORMALIZED EXAM PRODUCTS:",
      normalizedProducts
    );

    // ==========================================
    // SUCCESS
    // ==========================================

    return NextResponse.json({
      success: true,

      data: normalizedProducts,
    });
  } catch (error: any) {
    console.error(
      "EXAM PRODUCTS ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to load exam PIN products.",
      },
      { status: 500 }
    );
  }
}