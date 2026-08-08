import { NextResponse } from "next/server";
import axios from "axios";
import { vtpassConfig } from "@/lib/vtpass";

export async function GET() {
  try {
    const response = await axios.get(
      `${vtpassConfig.baseUrl}/services`,
      {
        headers: {
          "api-key": vtpassConfig.apiKey,
          "secret-key": vtpassConfig.secretKey,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.log(error.response?.data || error.message);

    return NextResponse.json(
      { message: "Failed to fetch services" },
      { status: 500 }
    );
  }
}