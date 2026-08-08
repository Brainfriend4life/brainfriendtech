import { NextResponse } from "next/server";
import axios from "axios";
import { vtpassConfig } from "@/lib/vtpass";

export async function GET() {
  try {
    const response = await axios.get(
      `${vtpassConfig.baseUrl}/service-categories`,
      {
        headers: {
          "api-key": vtpassConfig.apiKey,
          "public-key": vtpassConfig.publicKey,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(error.response?.data || error);

    return NextResponse.json(
      {
        success: false,
        error: error.response?.data || "Failed to connect to VTpass",
      },
      {
        status: 500,
      }
    );
  }
}