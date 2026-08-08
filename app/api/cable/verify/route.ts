
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { vtpassConfig } from "@/lib/vtpass";

export async function POST(req: NextRequest) {
  try {
    const {
      serviceID,
      smartCard,
    } = await req.json();

    /*
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    if (!serviceID || !smartCard) {
      return NextResponse.json(
        {
          success: false,
          message: "Service ID and Smart Card number are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * BUILD VTPASS VERIFY PAYLOAD
     * ==========================================
     */

    const payload = {
      serviceID: String(serviceID).trim(),
      billersCode: String(smartCard).trim(),
    };

    console.log(
      "=========================================="
    );

    console.log(
      "CABLE VERIFY PAYLOAD:",
      payload
    );

    console.log(
      "=========================================="
    );

    /*
     * ==========================================
     * SEND TO VTPASS
     * ==========================================
     */

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

    const vtpass = response.data;

    console.log(
      "CABLE VTPASS VERIFY RESPONSE:",
      vtpass
    );

    console.log(
      "CABLE VERIFY CODE:",
      vtpass?.code
    );

    console.log(
      "CABLE VERIFY DESCRIPTION:",
      vtpass?.response_description
    );

    /*
     * ==========================================
     * CHECK VTPASS RESPONSE
     * ==========================================
     */

    if (vtpass?.code !== "000") {
      return NextResponse.json(
        {
          success: false,
          message:
            vtpass?.response_description ||
            vtpass?.content?.errors ||
            "Smart Card verification failed.",
          data: vtpass,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    return NextResponse.json({
      success: true,
      message: "Smart Card verified successfully.",
      data: vtpass,
    });
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "CABLE VERIFY ERROR:",
      error?.response?.data ||
        error?.message ||
        error
    );

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.response?.data
            ?.response_description ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to verify Smart Card.",
        data:
          error?.response?.data || null,
      },
      {
        status: 500,
      }
    );
  }
}

