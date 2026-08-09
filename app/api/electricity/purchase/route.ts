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
      meterType,
      meterNumber,
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
      !meterType ||
      !meterNumber ||
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

    const electricityAmount = Number(amount);

    if (
      !Number.isFinite(electricityAmount) ||
      electricityAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid electricity amount.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * NORMALIZE METER TYPE
     * ==========================================
     *
     * VTpass expects:
     *
     * prepaid
     * postpaid
     *
     * NOT:
     *
     * 01
     * 02
     */

    const normalizedMeterType =
      String(meterType)
        .toLowerCase()
        .trim();

    if (
      normalizedMeterType !== "prepaid" &&
      normalizedMeterType !== "postpaid"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid meter type. Use prepaid or postpaid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * NORMALIZE SERVICE ID
     * ==========================================
     */

    const normalizedServiceID =
      String(serviceID)
        .toLowerCase()
        .trim();

    /*
     * ==========================================
     * FIND USER
     * ==========================================
     */

    const user =
      await prisma.user.findUnique({
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
     */

    const serviceFee =
      electricityAmount * 0.05;

    const totalAmount =
      electricityAmount + serviceFee;

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
     * PHONE NUMBER
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
     *
     * variation_code must be:
     *
     * prepaid
     *
     * OR
     *
     * postpaid
     *
     * NOT 01 / 02.
     */

    const payload = {
      request_id: requestId,

      serviceID:
        normalizedServiceID,

      billersCode:
        String(meterNumber).trim(),

      variation_code:
        normalizedMeterType,

      amount:
        electricityAmount,

      phone:
        customerPhone,
    };

    /*
     * ==========================================
     * LOG REQUEST
     * ==========================================
     */

    console.log(
      "=========================================="
    );

    console.log(
      "ELECTRICITY REQUEST ID:",
      requestId
    );

    console.log(
      "ELECTRICITY SERVICE ID:",
      normalizedServiceID
    );

    console.log(
      "ELECTRICITY METER TYPE:",
      normalizedMeterType
    );

    console.log(
      "ELECTRICITY METER NUMBER:",
      meterNumber
    );

    console.log(
      "ELECTRICITY PAYLOAD:",
      payload
    );

    console.log(
      "ELECTRICITY AMOUNT:",
      electricityAmount
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

    /*
     * ==========================================
     * LOG VTPASS RESPONSE
     * ==========================================
     */

    console.log(
      "ELECTRICITY VTPASS RESPONSE:",
      vtpass
    );

    const transactionStatus =
      vtpass.content?.transactions
        ?.status ||
      "unknown";

    console.log(
      "ELECTRICITY RESPONSE CODE:",
      vtpass.code
    );

    console.log(
      "ELECTRICITY RESPONSE DESCRIPTION:",
      vtpass.response_description
    );

    console.log(
      "ELECTRICITY TRANSACTION STATUS:",
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
     */

    if (!isSuccessful) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,

            type: "ELECTRICITY",

            provider:
              normalizedServiceID.toUpperCase(),

            amount:
              totalAmount,

            reference:
              requestId,

            status:
              transactionStatus.toUpperCase(),

            description:
              vtpass.response_description ||
              "Electricity payment failed",
          },
        });
      } catch (
        transactionError: any
      ) {
        console.error(
          "FAILED ELECTRICITY TRANSACTION LOG:",
          transactionError.message
        );
      }

      return NextResponse.json(
        {
          success: false,

          message:
            vtpass.response_description ||
            "Electricity payment failed.",

          data: vtpass,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * GET ELECTRICITY TOKEN
     * ==========================================
     *
     * Prepaid electricity normally
     * returns a token after successful
     * purchase.
     */

    const token =
      vtpass.content
        ?.transactions
        ?.purchased_code ||
      vtpass.purchased_code ||
      vtpass.content
        ?.transactions
        ?.token ||
      "";

    /*
     * ==========================================
     * SAVE TRANSACTION + DEDUCT WALLET
     * ==========================================
     */

    await prisma.$transaction(
      async (tx) => {
        /*
         * Save transaction
         */

        await tx.transaction.create({
          data: {
            userId: user.id,

            type: "ELECTRICITY",

            provider:
              normalizedServiceID.toUpperCase(),

            amount:
              totalAmount,

            reference:
              requestId,

            status:
              "SUCCESS",

            description: `₦${electricityAmount.toLocaleString(
              "en-NG"
            )} electricity + 5% service fee (₦${serviceFee.toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`,
          },
        });

        /*
         * Deduct wallet
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
      "ELECTRICITY PURCHASE SUCCESSFUL"
    );

    console.log(
      "ELECTRICITY AMOUNT:",
      electricityAmount
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
      "ELECTRICITY TOKEN:",
      token
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
        "Electricity payment successful.",

      amount:
        electricityAmount,

      serviceFee,

      totalAmount,

      token,

      meterType:
        normalizedMeterType,

      meterNumber:
        String(meterNumber).trim(),

      vtpass,
    });

  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "FULL ELECTRICITY VTPASS ERROR:"
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
          "Electricity payment failed.",

        data:
          error?.response?.data ||
          null,
      },
      {
        status: 500,
      }
    );
  }
}