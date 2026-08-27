import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { verifyTransactionPin } from "@/lib/security/verifyTransactionPin";


export async function POST(request: NextRequest) {
  try {
    // ==============================
    // AUTH CHECK
    // ==============================

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }


    // ==============================
    // REQUEST BODY
    // ==============================

    const body = await request.json();

    const {
      pin,
    } = body;


    if (!pin) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction PIN is required.",
        },
        {
          status: 400,
        }
      );
    }


    // ==============================
    // VERIFY PIN
    // ==============================

    const result = await verifyTransactionPin(
      session.user.id,
      String(pin)
    );


    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.message ||
            "Invalid transaction PIN.",
        },
        {
          status: 400,
        }
      );
    }


    // ==============================
    // SUCCESS
    // ==============================

    return NextResponse.json(
      {
        success: true,
        message:
          "Transaction PIN verified successfully.",
      },
      {
        status: 200,
      }
    );


  } catch (error) {

    console.error(
      "VERIFY TRANSACTION PIN ERROR:",
      error
    );


    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to verify transaction PIN.",
      },
      {
        status: 500,
      }
    );
  }
}