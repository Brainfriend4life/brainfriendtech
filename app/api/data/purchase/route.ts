
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
      phone,
      amount,
    } = await req.json();

    /*
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    if (
      !serviceID ||
      !variation_code ||
      !phone ||
      !amount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Network, data plan, phone number and amount are required.",
        },
        {
          status: 400,
        }
      );
    }

    const dataAmount = Number(amount);

    if (
      !Number.isFinite(dataAmount) ||
      dataAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid data amount.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * CALCULATE 5% SERVICE FEE
     * ==========================================
     */

    const serviceFee = dataAmount * 0.05;

    const totalAmount =
      dataAmount + serviceFee;

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

    console.log(
      "=========================================="
    );

    console.log(
      "DATA REQUEST ID:",
      requestId
    );

    /*
     * ==========================================
     * VTPASS PAYLOAD
     *
     * billersCode = customer's phone number
     *
     * VTpass receives only the actual
     * data amount. The 5% fee belongs
     * to our platform.
     * ==========================================
     */

    const payload = {
      request_id: requestId,
      serviceID,
      billersCode: String(phone).trim(),
      variation_code,
      amount: dataAmount,
      phone: String(phone).trim(),
    };

    console.log(
      "DATA PAYLOAD:",
      payload
    );

    /*
     * ==========================================
     * SEND PURCHASE REQUEST TO VTPASS
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
      "DATA VTPASS RESPONSE:",
      vtpass
    );

    /*
     * ==========================================
     * TRANSACTION STATUS
     * ==========================================
     */

    const transactionStatus =
      vtpass.content?.transactions
        ?.status ||
      vtpass.status ||
      "unknown";

    console.log(
      "DATA RESPONSE CODE:",
      vtpass.code
    );

    console.log(
      "DATA RESPONSE DESCRIPTION:",
      vtpass.response_description
    );

    console.log(
      "DATA TRANSACTION STATUS:",
      transactionStatus
    );

    /*
     * ==========================================
     * CHECK SUCCESS
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
     *
     * Do NOT deduct wallet.
     * ==========================================
     */

    if (!isSuccessful) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: "DATA",
            provider:
              serviceID.toUpperCase(),
            amount: totalAmount,
            reference: requestId,
            status:
              transactionStatus.toUpperCase(),
            description:
              vtpass.response_description ||
              "Data purchase failed",
          },
        });
      } catch (
        transactionError: any
      ) {
        console.error(
          "FAILED DATA TRANSACTION LOG:",
          transactionError.message
        );
      }

      console.log(
        "=========================================="
      );

      console.log(
        "DATA PURCHASE FAILED"
      );

      console.log(
        "DATA AMOUNT:",
        dataAmount
      );

      console.log(
        "SERVICE FEE:",
        serviceFee
      );

      console.log(
        "TOTAL CHARGE:",
        totalAmount
      );

      console.log(
        "=========================================="
      );

      return NextResponse.json(
        {
          success: false,
          message:
            vtpass.response_description ||
            "Data purchase failed.",
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
     * Save transaction and deduct:
     *
     * DATA AMOUNT + 5% SERVICE FEE
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
            type: "DATA",
            provider:
              serviceID.toUpperCase(),
            amount: totalAmount,
            reference: requestId,
            status: "SUCCESS",
            description: `₦${dataAmount.toLocaleString(
              "en-NG"
            )} data + 5% service fee (₦${serviceFee.toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )})`,
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
     * SUCCESS RESPONSE
     * ==========================================
     */

    console.log(
      "=========================================="
    );

    console.log(
      "DATA PURCHASE SUCCESSFUL"
    );

    console.log(
      "DATA AMOUNT:",
      dataAmount
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

    return NextResponse.json({
      success: true,
      message:
        "Data purchased successfully.",
      amount: dataAmount,
      serviceFee,
      totalAmount,
      vtpass,
    });
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "FULL VTPASS DATA ERROR:"
    );

    console.error(
      error.response?.data ||
        error
    );

    console.error(
      error.message
    );

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data
            ?.response_description ||
          error.response?.data?.message ||
          "Data purchase failed.",
        data:
          error.response?.data ||
          null,
      },
      {
        status: 500,
      }
    );
  }
}

