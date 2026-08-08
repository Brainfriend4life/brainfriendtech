import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { vtpassConfig } from "@/lib/vtpass";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const serviceID = searchParams.get("serviceID");

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
          "public-key": vtpassConfig.publicKey,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.log(error.response?.data || error.message);

    return NextResponse.json(
      {
        success: false,
        error: error.response?.data || error.message,
      },
      {
        status: 500,
      }
    );
  }
}