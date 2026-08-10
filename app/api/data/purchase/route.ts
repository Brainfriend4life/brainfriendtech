
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
     * CALCULATE SERVICE FEE
     * ==========================================
     *
     * Example:
     *
     * Data amount     = ₦1,000
     * Service fee 5%  = ₦50
     * Customer pays   = ₦1,050
     *
     * VTpass receives the actual data amount.
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

    console.log(
      "DATA SERVICE:",
      serviceID
    );

    console.log(
      "DATA PHONE:",
      String(phone).trim()
    );

    console.log(
      "DATA AMOUNT:",
      dataAmount
    );

    console.log(
      "DATA SERVICE FEE:",
      serviceFee
    );

    console.log(
      "DATA CUSTOMER CHARGE:",
      totalAmount
    );

    /*
     * ==========================================
     * VTPASS PAYLOAD
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
     * SEND REQUEST TO VTPASS
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
     * GET VTPASS TRANSACTION DETAILS
     * ==========================================
     */

    const transaction =
      vtpass.content?.transactions;

    const transactionStatus =
      transaction?.status ||
      vtpass.status ||
      "unknown";

    /*
     * ==========================================
     * PROVIDER COST
     * ==========================================
     *
     * VTpass returns:
     *
     * amount       = customer/service amount
     * total_amount = actual amount charged by VTpass
     *
     * Example:
     *
     * amount       = 1000
     * total_amount = 965
     * commission   = 35
     *
     * Therefore provider cost = 965.
     */

    const providerCost =
      Number(
        transaction?.total_amount
      );

    const validProviderCost =
      Number.isFinite(providerCost) &&
      providerCost >= 0
        ? providerCost
        : dataAmount;

    /*
     * ==========================================
     * CALCULATE PLATFORM PROFIT
     * ==========================================
     *
     * Revenue = customer charge
     *
     * Profit =
     * customer charge - provider cost
     *
     * Example:
     *
     * Revenue       = ₦1,050
     * Provider cost = ₦965
     * Profit        = ₦85
     */

    const platformProfit =
      totalAmount -
      validProviderCost;

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

    console.log(
      "DATA PROVIDER COST:",
      validProviderCost
    );

    console.log(
      "DATA PLATFORM PROFIT:",
      platformProfit
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

            /*
             * The amount charged to the
             * customer.
             */
            amount: totalAmount,

            /*
             * No cost/profit because
             * purchase failed.
             */
            cost: 0,
            profit: 0,

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
          code: vtpass.code,
          status: transactionStatus,
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
     *
     * Save:
     *
     * amount = customer charge
     * cost   = VTpass provider cost
     * profit = platform profit
     */

    await prisma.$transaction(
      async (tx) => {
        /*
         * SAVE TRANSACTION
         */

        await tx.transaction.create({
          data: {
            userId: user.id,

            type: "DATA",

            provider:
              serviceID.toUpperCase(),

            /*
             * CUSTOMER REVENUE
             *
             * Example:
             * ₦1,050
             */
            amount: totalAmount,

            /*
             * ACTUAL PROVIDER COST
             *
             * Example:
             * ₦965
             */
            cost: validProviderCost,

            /*
             * PLATFORM PROFIT
             *
             * Example:
             * ₦85
             */
            profit: platformProfit,

            reference: requestId,

            status: "SUCCESS",

            description: `₦${dataAmount.toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
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
         * DEDUCT CUSTOMER WALLET
         *
         * Customer pays:
         *
         * data amount + service fee
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
      "CUSTOMER CHARGE:",
      totalAmount
    );

    console.log(
      "PROVIDER COST:",
      validProviderCost
    );

    console.log(
      "PLATFORM PROFIT:",
      platformProfit
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
     * SUCCESS RESPONSE
     * ==========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Data purchased successfully.",

      amount: dataAmount,

      serviceFee,

      totalAmount,

      providerCost:
        validProviderCost,

      profit:
        platformProfit,

      reference: requestId,

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
      "ERROR RESPONSE:",
      error.response?.data
    );

    console.error(
      "ERROR MESSAGE:",
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

