
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { vtpassConfig } from "@/lib/vtpass";
import { generateRequestId } from "@/lib/requestId";

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
     * GET REQUEST DATA
     * ==========================================
     */

    const {
      serviceID,
      variation_code,
      smartCard,
      amount,
      phone,
    } = await req.json();

    /*
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    if (
      !serviceID ||
      !variation_code ||
      !smartCard ||
      !amount
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required.",
        },
        {
          status: 400,
        }
      );
    }

    const cableAmount = Number(amount);

    if (
      !Number.isFinite(cableAmount) ||
      cableAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid subscription amount.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * FIND USER
     * ==========================================
     */

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ==========================================
     * 5% PLATFORM SERVICE FEE
     * ==========================================
     *
     * Example:
     *
     * Cable subscription = ₦2,000
     * Service fee = ₦100
     * Total deduction = ₦2,100
     *
     * VTpass receives only ₦2,000.
     */

    const serviceFee =
      cableAmount * 0.05;

    const totalAmount =
      cableAmount + serviceFee;

    /*
     * ==========================================
     * CHECK WALLET BALANCE
     * ==========================================
     */

    if (
      user.walletBalance <
      totalAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient wallet balance. You need ₦${totalAmount.toLocaleString(
            "en-NG",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * GENERATE REQUEST ID
     * ==========================================
     */

    const requestId =
      generateRequestId();

    /*
     * ==========================================
     * CUSTOMER PHONE
     * ==========================================
     */

    const customerPhone =
      String(
        phone ||
          user.phone ||
          ""
      ).trim();

    if (!customerPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phone number is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * BUILD VTPASS PAYLOAD
     * ==========================================
     *
     * IMPORTANT:
     * VTpass receives only the actual
     * subscription amount.
     *
     * The 5% service fee belongs
     * to your platform.
     */

    const payload = {
      request_id: requestId,

      serviceID:
        String(serviceID).trim(),

      billersCode:
        String(smartCard).trim(),

      variation_code:
        String(variation_code).trim(),

      amount:
        cableAmount,

      phone:
        customerPhone,
    };

    console.log(
      "=========================================="
    );

    console.log(
      "CABLE REQUEST ID:",
      requestId
    );

    console.log(
      "CABLE PAYLOAD:",
      payload
    );

    console.log(
      "CABLE AMOUNT:",
      cableAmount
    );

    console.log(
      "SERVICE FEE:",
      serviceFee
    );

    console.log(
      "TOTAL DEDUCTED:",
      totalAmount
    );

    console.log(
      "=========================================="
    );

    /*
     * ==========================================
     * SEND PAYMENT TO VTPASS
     * ==========================================
     */

    const response =
      await axios.post(
        `${vtpassConfig.baseUrl}/pay`,
        payload,
        {
          headers: {
            "api-key":
              vtpassConfig.apiKey,

            "secret-key":
              vtpassConfig.secretKey,

            "Content-Type":
              "application/json",
          },
        }
      );

    const vtpass =
      response.data;

    console.log(
      "CABLE VTPASS RESPONSE:",
      vtpass
    );

    /*
     * ==========================================
     * TRANSACTION STATUS
     * ==========================================
     */

    const transactionStatus =
      vtpass.content
        ?.transactions
        ?.status ||
      "unknown";

    console.log(
      "CABLE RESPONSE CODE:",
      vtpass.code
    );

    console.log(
      "CABLE RESPONSE DESCRIPTION:",
      vtpass.response_description
    );

    console.log(
      "CABLE TRANSACTION STATUS:",
      transactionStatus
    );

    /*
     * ==========================================
     * SUCCESS CHECK
     * ==========================================
     */

    const isSuccessful =
      vtpass.code === "000" &&
      transactionStatus
        .toLowerCase() ===
        "delivered";

    /*
     * ==========================================
     * PURCHASE FAILED
     * ==========================================
     *
     * DO NOT deduct wallet.
     */

    if (!isSuccessful) {
      try {
        await prisma.transaction.create({
          data: {
            userId:
              user.id,

            type:
              "CABLE",

            provider:
              serviceID.toUpperCase(),

            amount:
              totalAmount,

            reference:
              requestId,

            status:
              transactionStatus.toUpperCase(),

            description:
              vtpass.response_description ||
              "Cable subscription failed",
          },
        });
      } catch (
        transactionError: any
      ) {
        console.error(
          "FAILED CABLE TRANSACTION LOG:",
          transactionError.message
        );
      }

      return NextResponse.json(
        {
          success: false,

          message:
            vtpass.response_description ||
            "Cable subscription failed.",

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
     *
     * Save transaction and deduct wallet
     * atomically.
     * ==========================================
     */

    await prisma.$transaction(
      async (tx) => {
        /*
         * Save successful transaction
         */

        await tx.transaction.create({
          data: {
            userId:
              user.id,

            type:
              "CABLE",

            provider:
              serviceID.toUpperCase(),

            amount:
              totalAmount,

            reference:
              requestId,

            status:
              "SUCCESS",

            description: `₦${cableAmount.toLocaleString(
              "en-NG"
            )} cable subscription + 5% service fee (₦${serviceFee.toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )})`,
          },
        });

        /*
         * Deduct subscription amount
         * + platform service fee
         */

        await tx.user.update({
          where: {
            id: user.id,
          },

          data: {
            walletBalance: {
              decrement:
                totalAmount,
            },
          },
        });
      }
    );

    /*
     * ==========================================
     * SUCCESS LOG
     * ==========================================
     */

    console.log(
      "=========================================="
    );

    console.log(
      "CABLE PURCHASE SUCCESSFUL"
    );

    console.log(
      "CABLE AMOUNT:",
      cableAmount
    );

    console.log(
      "SERVICE FEE:",
      serviceFee
    );

    console.log(
      "TOTAL DEDUCTED:",
      totalAmount
    );

    console.log(
      "CABLE SMART CARD:",
      smartCard
    );

    console.log(
      "=========================================="
    );

    /*
     * ==========================================
     * SUCCESS RESPONSE
     * ==========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Cable subscription successful.",

      amount:
        cableAmount,

      serviceFee,

      totalAmount,

      vtpass,
    });
  } catch (error: any) {
    /*
     * ==========================================
     * ERROR HANDLING
     * ==========================================
     */

    console.error(
      "=========================================="
    );

    console.error(
      "FULL CABLE VTPASS ERROR:"
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
            ?.response_description ||
          error?.response?.data
            ?.message ||
          error?.message ||
          "Cable subscription failed.",
      },
      {
        status: 500,
      }
    );
  }
}

