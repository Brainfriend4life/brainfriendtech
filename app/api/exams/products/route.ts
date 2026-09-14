import { NextResponse } from "next/server";

const NAIJARESULTPINS_API_URL =
  "https://www.naijaresultpins.com/api/v1";

// FIX: give the provider call an explicit, shorter timeout instead of
// relying on the platform default (~10s connect timeout, but the
// request can still hang far longer once Next's own overhead is added
// — we saw 38s+ end-to-end in production logs before the customer sees
// anything). 8s is enough for a normal API call; if it's this slow,
// the customer is better served by a fast, clear failure than a long
// spinner.
const PROVIDER_TIMEOUT_MS = 8000;

export async function GET() {
  try {
    const apiKey = process.env.NAIJARESULTPINS_API_KEY;

    if (!apiKey) {
      console.error("NAIJARESULTPINS_API_KEY is missing.");

      return NextResponse.json(
        {
          success: false,
          message: "Exam PIN provider is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(NAIJARESULTPINS_API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    const responseText = await response.text();

    console.log("====================================");
    console.log("NAIJARESULTPINS PRODUCTS RESPONSE");
    console.log("HTTP STATUS:", response.status);
    console.log("CONTENT TYPE:", response.headers.get("content-type"));
    console.log("RAW RESPONSE:", responseText);
    console.log("====================================");

    let result: any;

    try {
      result = JSON.parse(responseText);
    } catch {
      // FIX: don't forward the raw provider body to the client — it's
      // already fully logged above for debugging. This branch fires
      // for the WAF/bot-challenge HTML page as well as any other
      // non-JSON response, so keep the message generic and safe.
      console.error(
        "NaijaResultPins products response was not valid JSON " +
          "(likely a WAF/bot challenge page or an outage). See the " +
          "raw response logged above."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "The Exam PIN provider returned an unexpected response. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      // FIX: log the full provider error server-side, but don't pass
      // an arbitrary provider-controlled string straight to the
      // client as-is beyond what's needed to explain the failure.
      console.error("NaijaResultPins products error:", {
        status: response.status,
        result,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            response.status === 401
              ? "Exam PIN provider authorization failed. Please check the API configuration."
              : response.status === 403
              ? "Exam PIN provider denied the request. Please contact NaijaResultPins support to enable server-to-server API access."
              : "Unable to retrieve Exam PIN products right now. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    if (!Array.isArray(result)) {
      console.error(
        "Unexpected NaijaResultPins products response shape:",
        result
      );

      return NextResponse.json(
        {
          success: false,
          message: "Invalid response received from Exam PIN provider.",
        },
        { status: 502 }
      );
    }

    const products = result
      .map((product: any) => {
        const id = Number(product?.card_type_id);
        const price = Number(product?.unit_amount);

        if (
          !Number.isInteger(id) ||
          id <= 0 ||
          !Number.isFinite(price) ||
          price <= 0
        ) {
          return null;
        }

        const examName = String(
          product?.card_name || "Exam PIN"
        ).trim();

        const availability = String(
          product?.availability || ""
        ).trim();

        const availabilityLower =
          availability.toLowerCase();

        const isActive =
          availabilityLower === "in stock" ||
          availabilityLower === "available" ||
          availabilityLower === "true";

        return {
          id,
          exam_name: examName,
          price,
          reseller_price: price,
          api_price: price,
          availability,
          is_active: isActive,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    // FIX: this is the important one. `error?.message` for a fetch
    // connection failure is Node's generic "fetch failed" wrapper —
    // the actually useful detail (ConnectTimeoutError, target IPs,
    // AbortError on timeout) lives in `error.cause` / `error.name`,
    // which we log here but never forward to the client. Previously
    // "fetch failed" was shown directly to the customer, which is both
    // unhelpful and leaks internal implementation detail.
    console.error("NAIJARESULTPINS CONNECTION ERROR:", error);

    const isTimeout =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError" ||
      error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT";

    return NextResponse.json(
      {
        success: false,
        message: isTimeout
          ? "The Exam PIN provider is taking too long to respond. Please try again shortly."
          : "Unable to reach the Exam PIN provider right now. Please try again shortly.",
      },
      { status: 502 }
    );
  }
}