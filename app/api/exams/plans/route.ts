
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

import { vtpassConfig } from "@/lib/vtpass";

export async function GET(req: NextRequest) {
  try {
    const serviceID = req.nextUrl.searchParams.get("serviceID");

    if (!serviceID) {
      return NextResponse.json(
        {
          success: false,
          message: "serviceID is required",
        },
        {
          status: 400,
        }
      );
    }

    const response = await axios.get(
      `${vtpassConfig.baseUrl}/service-variations?serviceID=${serviceID}`,
      {
        headers: {
          "api-key": vtpassConfig.apiKey,
          "secret-key": vtpassConfig.secretKey,
          "Content-Type": "application/json",
        },
      }
    );

    const variations =
      response.data?.content?.variations || [];

    return NextResponse.json({
      success: true,
      serviceID,
      plans: variations,
    });
  } catch (error: any) {
    console.error(
      "EXAM PLANS ERROR:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load exam plans",
      },
      {
        status: 500,
      }
    );
  }
}

