
import { NextResponse } from "next/server";
import axios from "axios";

import { vtpassConfig } from "@/lib/vtpass";

export async function GET() {
  try {
    const response = await axios.get(
      `${vtpassConfig.baseUrl}/services?identifier=education`,
      {
        headers: {
          "api-key": vtpassConfig.apiKey,
          "secret-key": vtpassConfig.secretKey,
          "Content-Type": "application/json",
        },
      }
    );

    const services = response.data?.content || [];

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error: any) {
    console.error(
      "EXAM SERVICES ERROR:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load exam services",
      },
      {
        status: 500,
      }
    );
  }
}

