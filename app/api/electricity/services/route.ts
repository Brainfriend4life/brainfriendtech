import { NextResponse } from "next/server";
import axios from "axios";

import { vtpassConfig } from "@/lib/vtpass";

export async function GET() {
  try {
    const response = await axios.get(
      `${vtpassConfig.baseUrl}/services?identifier=electricity-bill`,
      {
        headers: {
          "api-key": vtpassConfig.apiKey,
          "secret-key": vtpassConfig.secretKey,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      "ELECTRICITY PROVIDERS RESPONSE:",
      response.data
    );

    return NextResponse.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error(
      "ELECTRICITY PROVIDERS ERROR:",
      error.response?.data ||
        error.message
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data
            ?.response_description ||
          error.response?.data?.message ||
          "Failed to load electricity providers",
      },
      {
        status: 500,
      }
    );
  }
}