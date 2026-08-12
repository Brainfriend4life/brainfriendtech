import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const CHEAPDATAHUB_ELECTRICITY_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/electricity/purchase/";

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    // ==========================================
    // 1. AUTHENTICATION
    // ==========================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // ==========================================
    // 2. REQUEST BODY
    // ==========================================

    const body = await request.json();

    const {
      discoId,
      meterNumber,
      amount,
      meterType,
      phone,
    } = body;

    // ==========================================
    // 3. VALIDATION
    // ==========================================

    if (
      discoId === undefined ||
      discoId === null ||
      !meterNumber ||
      amount === undefined ||
      amount === null ||
      !meterType ||
      !phone
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "discoId, meterNumber, amount, meterType and phone are required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. AMOUNT
    // ==========================================

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid electricity amount.",
        },
        { status: 400 }
      );
    }

    if (numericAmount < 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum electricity amount is ₦100.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 5. METER NUMBER
    // ==========================================

    const cleanedMeter = String(meterNumber)
      .replace(/\s+/g, "");

    if (!/^\d{6,20}$/.test(cleanedMeter)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid meter number.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 6. PHONE NUMBER
    // ==========================================

    const cleanedPhone = String(phone)
      .replace(/\s+/g, "")
      .replace(/^\+234/, "0");

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid Nigerian phone number.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 7. METER TYPE
    // ==========================================

    const normalizedMeterType =
      String(meterType).toLowerCase();

    if (
      normalizedMeterType !== "prepaid" &&
      normalizedMeterType !== "postpaid"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meter type must be prepaid or postpaid.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 8. FIND USER
    // ==========================================

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // 9. ACCOUNT STATUS
    // ==========================================

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // ==========================================
    // 10. API KEY
    // ==========================================

    const apiKey =
      process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      console.error(
        "CHEAPDATAHUB_API_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 11. WALLET CHECK
    // ==========================================

    const walletBalance =
      Number(user.walletBalance);

    if (
      !Number.isFinite(walletBalance) ||
      walletBalance < numericAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient wallet balance.",
          balance: walletBalance,
          required: numericAmount,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 12. BUSINESS ACCOUNTING
    // ==========================================
    //
    // Electricity currently has no separate
    // service fee.
    //
    // Customer payment = provider cost
    // Profit = ₦0
    //
    // ==========================================

    const revenue = numericAmount;
    const providerCost = numericAmount;
    const profit = 0;

    // ==========================================
    // 13. GENERATE REFERENCE
    // ==========================================

    const reference =
      `ELECTRICITY-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // ==========================================
    // 14. CREATE PENDING TRANSACTION
    // ==========================================

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,

          type: "ELECTRICITY",

          amount: revenue,

          description:
            `Electricity payment for meter ${cleanedMeter}`,

          status: "PENDING",

          reference,

          provider: "CheapDataHub",

          cost: providerCost,

          profit,
        },
      });

    transactionId = transaction.id;

    // ==========================================
    // 15. CHEAPDATAHUB REQUEST
    // ==========================================

    const providerBody = {
      disco_id: Number(discoId),

      meter_number: cleanedMeter,

      amount: numericAmount,

      meter_type: normalizedMeterType,

      phone: cleanedPhone,
    };

    console.log(
      "=========================================="
    );

    console.log(
      "CHEAPDATAHUB ELECTRICITY PURCHASE"
    );

    console.log(
      "URL:",
      CHEAPDATAHUB_ELECTRICITY_URL
    );

    console.log(
      "BODY:",
      providerBody
    );

    console.log(
      "API KEY EXISTS:",
      !!apiKey
    );

    console.log(
      "=========================================="
    );

    const providerResponse =
      await fetch(
        CHEAPDATAHUB_ELECTRICITY_URL,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify(
            providerBody
          ),

          cache: "no-store",
        }
      );

    // ==========================================
    // 16. READ PROVIDER RESPONSE
    // ==========================================

    const responseText =
      await providerResponse.text();

    console.log(
      "CHEAPDATAHUB ELECTRICITY STATUS:",
      providerResponse.status
    );

    console.log(
      "CHEAPDATAHUB ELECTRICITY RESPONSE:",
      responseText
    );

    // ==========================================
    // 17. PARSE PROVIDER RESPONSE
    // ==========================================

    let providerResult: any = null;

    try {
      providerResult =
        responseText.trim()
          ? JSON.parse(responseText)
          : null;
    } catch {
      providerResult = null;
    }

    // ==========================================
    // 18. INVALID PROVIDER RESPONSE
    // ==========================================

    if (!providerResult) {
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json(
        {
          success: false,

          error:
            providerResponse.status >= 500
              ? "CheapDataHub electricity service returned a server error. Please try again."
              : "CheapDataHub returned an invalid response.",

          providerStatus:
            providerResponse.status,

          providerResponse:
            responseText.substring(
              0,
              500
            ),
        },
        { status: 502 }
      );
    }

    // ==========================================
    // 19. PROVIDER SUCCESS CHECK
    // ==========================================

    const providerSuccess =
      providerResult?.status === true ||
      providerResult?.status === "true" ||
      providerResult?.success === true ||
      providerResult?.status === "success";

    // ==========================================
    // 20. PROVIDER FAILED
    // ==========================================

    if (
      !providerResponse.ok ||
      !providerSuccess
    ) {
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json(
        {
          success: false,

          error:
            providerResult?.message ||
            providerResult?.error ||
            providerResult?.response_description ||
            "Electricity purchase failed.",

          providerStatus:
            providerResponse.status,

          providerResponse:
            providerResult,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 21. EXTRACT PROVIDER DATA
    // ==========================================

    const providerData =
      providerResult?.data || {};

    const providerReference =
      providerResult?.reference ||
      providerResult?.transaction_id ||
      providerResult?.transactionId ||
      providerData?.reference ||
      providerData?.transaction_id ||
      providerData?.transactionId ||
      null;

    const token =
      providerResult?.token ||
      providerResult?.meter_token ||
      providerData?.token ||
      providerData?.meter_token ||
      null;

    const units =
      providerResult?.units ||
      providerData?.units ||
      null;

    // ==========================================
    // 22. COMPLETE EVERYTHING ATOMICALLY
    // ==========================================
    //
    // After CheapDataHub succeeds:
    //
    // USER
    //   - amount
    //
    // BUSINESS
    //   + revenue
    //   + cost
    //   + profit
    //
    // Since electricity currently has no markup:
    //
    // revenue = cost
    // profit = 0
    //
    // ==========================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // ======================================
          // GET FRESH USER BALANCE
          // ======================================

          const freshUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
            });

          if (!freshUser) {
            throw new Error(
              "User account could not be found."
            );
          }

          const freshBalance =
            Number(
              freshUser.walletBalance
            );

          if (
            !Number.isFinite(
              freshBalance
            ) ||
            freshBalance < revenue
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // ======================================
          // GET OR CREATE BUSINESS WALLET
          // ======================================

          let businessWallet =
            await tx.businessWallet.findUnique({
              where: {
                name: "Brainfriend Tech",
              },
            });

          if (!businessWallet) {
            businessWallet =
              await tx.businessWallet.create({
                data: {
                  name:
                    "Brainfriend Tech",

                  balance: 0,

                  totalRevenue: 0,

                  totalCost: 0,

                  totalProfit: 0,

                  withdrawnProfit: 0,

                  availableProfit: 0,
                },
              });
          }

          // ======================================
          // NEW USER BALANCE
          // ======================================

          const newUserBalance =
            freshBalance - revenue;

          // ======================================
          // BUSINESS WALLET VALUES
          // ======================================

          const newBusinessBalance =
            Number(
              businessWallet.balance
            ) + revenue;

          const newTotalRevenue =
            Number(
              businessWallet.totalRevenue
            ) + revenue;

          const newTotalCost =
            Number(
              businessWallet.totalCost
            ) + providerCost;

          const newTotalProfit =
            Number(
              businessWallet.totalProfit
            ) + profit;

          const newAvailableProfit =
            Number(
              businessWallet.availableProfit
            ) + profit;

          // ======================================
          // UPDATE USER WALLET
          // ======================================

          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              walletBalance:
                newUserBalance,
            },
          });

          // ======================================
          // UPDATE TRANSACTION
          // ======================================

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status: "SUCCESS",

              cost: providerCost,

              profit,
            },
          });

          // ======================================
          // UPDATE BUSINESS WALLET
          // ======================================

          await tx.businessWallet.update({
            where: {
              id: businessWallet.id,
            },

            data: {
              balance:
                newBusinessBalance,

              totalRevenue:
                newTotalRevenue,

              totalCost:
                newTotalCost,

              totalProfit:
                newTotalProfit,

              availableProfit:
                newAvailableProfit,
            },
          });

          // ======================================
          // CREATE BUSINESS REVENUE
          // ======================================

          await tx.businessRevenue.create({
            data: {
              transactionId:
                transaction.id,

              type:
                "ELECTRICITY",

              provider:
                "CheapDataHub",

              amount:
                revenue,

              cost:
                providerCost,

              profit,

              reference,

              description:
                `Electricity payment for meter ${cleanedMeter}`,

              businessWalletId:
                businessWallet.id,
            },
          });

          // ======================================
          // RETURN RESULT
          // ======================================

          return {
            walletBalance:
              newUserBalance,

            businessBalance:
              newBusinessBalance,

            totalRevenue:
              newTotalRevenue,

            totalCost:
              newTotalCost,

            totalProfit:
              newTotalProfit,

            availableProfit:
              newAvailableProfit,

            profit,
          };
        }
      );

    // ==========================================
    // 23. SUCCESS RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      message:
        providerResult?.message ||
        "Electricity payment successful.",

      reference,

      providerReference,

      discoId:
        Number(discoId),

      meterNumber:
        cleanedMeter,

      meterType:
        normalizedMeterType,

      phone:
        cleanedPhone,

      amount:
        revenue,

      providerCost,

      profit,

      token,

      units,

      walletBalance:
        result.walletBalance,

      businessRevenue:
        revenue,

      businessCost:
        providerCost,

      businessProfit:
        profit,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    // ==========================================
    // ERROR HANDLING
    // ==========================================

    console.error(
      "ELECTRICITY PURCHASE ERROR:",
      error
    );

    // ==========================================
    // MARK PENDING TRANSACTION FAILED
    // ==========================================

    if (transactionId) {
      try {
        await prisma.transaction.update({
          where: {
            id: transactionId,
          },

          data: {
            status: "FAILED",
          },
        });
      } catch (updateError) {
        console.error(
          "FAILED TO UPDATE ELECTRICITY TRANSACTION:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Electricity purchase failed.",
      },
      { status: 500 }
    );
  }
}