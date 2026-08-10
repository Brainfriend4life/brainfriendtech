
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vtpassConfig } from "@/lib/vtpass";
import { generateRequestId } from "@/lib/requestId";

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // AUTHENTICATION
    // ==========================================

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

    // ==========================================
    // GET REQUEST DATA
    // ==========================================

    const {
      serviceID,
      phone,
      amount,
    } = await req.json();

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!serviceID || !phone || !amount) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Network, phone number and amount are required.",
        },
        {
          status: 400,
        }
      );
    }

    const airtimeAmount = Number(amount);

    if (
      !Number.isFinite(airtimeAmount) ||
      airtimeAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid airtime amount.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // CALCULATE 5% SERVICE FEE
    // ==========================================
    //
    // Example:
    //
    // Airtime       = ₦1,000
    // Service fee   = ₦50
    // Customer pays = ₦1,050
    //
    // VTpass receives = ₦1,000
    // Platform profit = ₦50
    //

    const serviceFee =
      airtimeAmount * 0.05;

    const totalAmount =
      airtimeAmount + serviceFee;

    // ==========================================
    // FIND USER
    // ==========================================

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

    // ==========================================
    // CHECK WALLET BALANCE
    // ==========================================

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

    // ==========================================
    // GENERATE REQUEST ID
    // ==========================================

    const requestId =
      generateRequestId();

    console.log(
      "=========================================="
    );

    console.log(
      "AIRTIME REQUEST ID:",
      requestId
    );

    console.log(
      "AIRTIME SERVICE:",
      serviceID
    );

    console.log(
      "AIRTIME PHONE:",
      String(phone).trim()
    );

    console.log(
      "AIRTIME AMOUNT:",
      airtimeAmount
    );

    console.log(
      "AIRTIME SERVICE FEE:",
      serviceFee
    );

    console.log(
      "AIRTIME CUSTOMER CHARGE:",
      totalAmount
    );

    // ==========================================
    // VTPASS PAYLOAD
    // ==========================================

    const payload = {
      request_id: requestId,
      serviceID,
      amount: airtimeAmount,
      phone: String(phone).trim(),
    };

    console.log(
      "AIRTIME PAYLOAD:",
      payload
    );

    // ==========================================
    // SEND REQUEST TO VTPASS
    // ==========================================

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

    // ==========================================
    // FULL VTPASS RESPONSE LOG
    // ==========================================

    console.log(
      "AIRTIME VTPASS RESPONSE:",
      vtpass
    );

    console.log(
      "AIRTIME TRANSACTION DETAILS:",
      JSON.stringify(
        vtpass.content?.transactions,
        null,
        2
      )
    );

    console.log(
      "AIRTIME RESPONSE DESCRIPTION:",
      vtpass.response_description
    );

    console.log(
      "AIRTIME RESPONSE CODE:",
      vtpass.code
    );

    console.log(
      "AIRTIME TRANSACTION STATUS:",
      vtpass.content?.transactions
        ?.status
    );

    console.log(
      "AIRTIME TRANSACTION ID:",
      vtpass.content?.transactions
        ?.transactionId
    );

    console.log(
      "AIRTIME VTPASS AMOUNT:",
      vtpass.amount
    );

    console.log(
      "AIRTIME PURCHASED CODE:",
      vtpass.purchased_code
    );

    // ==========================================
    // CHECK TRANSACTION STATUS
    // ==========================================

    const transactionStatus =
      vtpass.content?.transactions
        ?.status ?? "unknown";

    const isSuccessful =
      vtpass.code === "000" &&
      transactionStatus
        .toLowerCase() ===
        "delivered";

    // ==========================================
    // PURCHASE FAILED
    // ==========================================

    if (!isSuccessful) {
      console.error(
        "=========================================="
      );

      console.error(
        "AIRTIME PURCHASE FAILED"
      );

      console.error(
        "VTpass Code:",
        vtpass.code
      );

      console.error(
        "VTpass Description:",
        vtpass.response_description
      );

      console.error(
        "Transaction Status:",
        transactionStatus
      );

      console.error(
        "Transaction Details:",
        JSON.stringify(
          vtpass.content?.transactions,
          null,
          2
        )
      );

      console.error(
        "=========================================="
      );

      // ------------------------------------------
      // SAVE FAILED TRANSACTION
      // ------------------------------------------
      //
      // Important:
      // Failed transactions do NOT count toward
      // revenue or profit.
      //

      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,

            type: "AIRTIME",

            provider:
              serviceID.toUpperCase(),

            amount: totalAmount,

            cost: 0,

            profit: 0,

            reference: requestId,

            status:
              transactionStatus.toUpperCase(),

            description:
              vtpass.response_description ||
              "Airtime purchase failed",
          },
        });
      } catch (
        transactionError: any
      ) {
        console.error(
          "FAILED TRANSACTION LOG:",
          transactionError.message
        );
      }

      // ------------------------------------------
      // WALLET IS NOT DEDUCTED
      // ------------------------------------------

      return NextResponse.json(
        {
          success: false,

          message:
            vtpass.response_description ||
            "Airtime purchase failed.",

          code: vtpass.code,

          status:
            transactionStatus,

          data: vtpass,
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // SUCCESS
    // ==========================================
    //
    // Customer pays:
    //
    // airtimeAmount + serviceFee
    //
    // Example:
    //
    // Customer charge = ₦1,050
    // Provider cost   = ₦1,000
    // Platform profit = ₦50
    //

    const revenue =
      totalAmount;

    const providerCost =
      airtimeAmount;

    const profit =
      revenue - providerCost;

    // ==========================================
    // SAVE TRANSACTION + DEDUCT WALLET
    // ==========================================

    await prisma.$transaction(
      async (tx) => {
        // ----------------------------------------
        // SAVE SUCCESSFUL TRANSACTION
        // ----------------------------------------

        await tx.transaction.create({
          data: {
            userId: user.id,

            type: "AIRTIME",

            provider:
              serviceID.toUpperCase(),

            // Money charged to customer
            amount: revenue,

            // Money paid to VTpass
            cost: providerCost,

            // Platform earnings
            profit,

            reference: requestId,

            status: "SUCCESS",

            description:
              `₦${airtimeAmount.toLocaleString(
                "en-NG"
              )} airtime + 5% service fee (₦${serviceFee.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )})`,
          },
        });

        // ----------------------------------------
        // DEDUCT CUSTOMER WALLET
        // ----------------------------------------

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

    // ==========================================
    // SUCCESS LOG
    // ==========================================

    console.log(
      "=========================================="
    );

    console.log(
      "AIRTIME PURCHASE SUCCESSFUL"
    );

    console.log(
      "AIRTIME AMOUNT:",
      airtimeAmount
    );

    console.log(
      "SERVICE FEE:",
      serviceFee
    );

    console.log(
      "CUSTOMER CHARGE:",
      revenue
    );

    console.log(
      "PROVIDER COST:",
      providerCost
    );

    console.log(
      "PLATFORM PROFIT:",
      profit
    );

    console.log(
      "TOTAL DEDUCTED:",
      totalAmount
    );

    console.log(
      "=========================================="
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      message:
        "Airtime purchased successfully.",

      amount:
        airtimeAmount,

      serviceFee,

      totalAmount,

      revenue,

      cost:
        providerCost,

      profit,

      vtpass,
    });
  } catch (error: any) {
    // ==========================================
    // ERROR HANDLING
    // ==========================================

    console.error(
      "=========================================="
    );

    console.error(
      "FULL VTPASS AIRTIME ERROR:"
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
          error.response?.data
            ?.message ||
          "Airtime purchase failed.",
      },
      {
        status: 500,
      }
    );
  }
}

