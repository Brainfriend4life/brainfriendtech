import { NextResponse } from "next/server";
import axios from "axios";
import { vtpassConfig } from "@/lib/vtpass";

export async function GET() {
  try {
    const response = await axios.get(
      `${vtpassConfig.baseUrl}/services?identifier=airtime`,
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
        error: error.response?.data,
      },
      {
        status: 500,
      }
    );
  }
}