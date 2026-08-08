import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

import { vtpassConfig } from "@/lib/vtpass";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("=================================");
    console.log("ELECTRICITY VERIFY REQUEST:");
    console.log(body);
    console.log("=================================");

    const {
      serviceID,
      billersCode,
      type,
    } = body;

    if (!serviceID) {
      return NextResponse.json(
        {
          success: false,
          message: "Electricity provider is required.",
        },
        { status: 400 }
      );
    }

    if (!billersCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Meter number is required.",
        },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          message: "Meter type is required.",
        },
        { status: 400 }
      );
    }

    const payload = {
      billersCode: String(billersCode).trim(),
      serviceID: String(serviceID).trim(),
      type: String(type).toLowerCase().trim(),
    };

    console.log(
      "VTPASS VERIFY PAYLOAD:",
      payload
    );

    const response = await axios.post(
      `${vtpassConfig.baseUrl}/merchant-verify`,
      payload,
      {
        headers: {
          "api-key": vtpassConfig.apiKey,
          "secret-key": vtpassConfig.secretKey,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    console.log(
      "VTPASS VERIFY RESPONSE:",
      data
    );

    console.log(
      "VTPASS VERIFY CODE:",
      data?.code
    );

    console.log(
      "VTPASS VERIFY CONTENT:",
      data?.content
    );

    if (data?.code !== "000") {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.response_description ||
            data?.content?.errors ||
            "Meter verification failed.",
          data,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Meter verified successfully.",
      data,
    });
  } catch (error: any) {
    console.error(
      "================================="
    );

    console.error(
      "ELECTRICITY VERIFY ERROR:"
    );

    console.error(
      error?.response?.data ||
        error?.message ||
        error
    );

    console.error(
      "================================="
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.response?.data
            ?.response_description ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to verify meter.",
        data:
          error?.response?.data || null,
      },
      {
        status: 500,
      }
    );
  }
}