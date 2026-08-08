
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";

import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    /*
     * ==========================================
     * AUTHENTICATION
     * ==========================================
     */

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ==========================================
     * GET AMOUNT
     * ==========================================
     */

    const { amount } = await req.json();

    const walletAmount = Number(amount);

    if (
      !Number.isFinite(walletAmount) ||
      walletAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid funding amount.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * ROUND AMOUNT
     * ==========================================
     */

    const finalAmount = Math.round(walletAmount);

    /*
     * ==========================================
     * CALLBACK URL
     * ==========================================
     *
     * For production:
     *
     * NEXT_PUBLIC_APP_URL=https://yourdomain.com
     *
     * For local development:
     *
     * NEXT_PUBLIC_APP_URL=http://localhost:3000
     */

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    /*
     * ==========================================
     * PAYSTACK INITIALIZATION
     * ==========================================
     */

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: session.user.email,

        amount: finalAmount * 100,

        currency: "NGN",

        callback_url:
          `${appUrl}/dashboard/wallet/success`,

        metadata: {
          userEmail: session.user.email,

          purpose: "wallet_funding",

          amount: finalAmount,
        },
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

          "Content-Type":
            "application/json",
        },
      }
    );

    /*
     * ==========================================
     * RESPONSE
     * ==========================================
     */

    return NextResponse.json(
      {
        success: true,
        ...response.data,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "PAYSTACK INITIALIZATION ERROR:"
    );

    console.error(
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
            ?.message ||
          "Failed to initialize payment.",
      },
      {
        status: 500,
      }
    );
  }
}

