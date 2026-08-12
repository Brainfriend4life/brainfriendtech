import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CHEAPDATAHUB_API_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/airtime/purchase/";

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in to purchase airtime.",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // =====================================================
    // 2. REQUEST BODY
    // =====================================================

    const body = await request.json();

    const {
      providerId,
      phoneNumber,
      amount,
    } = body;

    // =====================================================
    // 3. VALIDATION
    // =====================================================

    if (
      providerId === undefined ||
      providerId === null ||
      !phoneNumber ||
      amount === undefined ||
      amount === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "providerId, phoneNumber and amount are required.",
        },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid airtime amount.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 4. NORMALIZE PHONE NUMBER
    // =====================================================

    const cleanedPhone = String(phoneNumber)
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

    // =====================================================
    // 5. FIND USER
    // =====================================================

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User account could not be found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 6. CHECK USER STATUS
    // =====================================================

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // =====================================================
    // 7. CHECK CHEAPDATAHUB API KEY
    // =====================================================

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

    // =====================================================
    // 8. CHECK USER WALLET
    // =====================================================

    const walletBalance = Number(
      user.walletBalance
    );

    if (
      !Number.isFinite(walletBalance) ||
      walletBalance < numericAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient wallet balance.",
          walletBalance,
          required: numericAmount,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 9. GENERATE REFERENCE
    // =====================================================

    const reference =
      `AIRTIME-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // =====================================================
    // 10. CREATE PENDING TRANSACTION
    // =====================================================

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,

          type: "AIRTIME",

          amount: numericAmount,

          description:
            `Airtime purchase for ${cleanedPhone}`,

          status: "PENDING",

          reference,

          provider: "CheapDataHub",

          // We don't know the actual provider
          // cost until the provider gives us one.
          cost: 0,

          profit: 0,
        },
      });

    transactionId = transaction.id;

    // =====================================================
    // 11. CALL CHEAPDATAHUB
    // =====================================================

    const providerResponse = await fetch(
      CHEAPDATAHUB_API_URL,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          provider_id: Number(providerId),

          phone_number: cleanedPhone,

          amount: Math.round(numericAmount),
        }),

        cache: "no-store",
      }
    );

    const responseText =
      await providerResponse.text();

    console.log(
      "======================================"
    );

    console.log(
      "CHEAPDATAHUB AIRTIME STATUS:",
      providerResponse.status
    );

    console.log(
      "CHEAPDATAHUB AIRTIME RESPONSE:",
      responseText
    );

    console.log(
      "======================================"
    );

    // =====================================================
    // 12. PARSE PROVIDER RESPONSE
    // =====================================================

    let providerResult: any;

    try {
      providerResult = responseText.trim()
        ? JSON.parse(responseText)
        : null;
    } catch {
      providerResult = null;
    }

    // =====================================================
    // 13. INVALID PROVIDER RESPONSE
    // =====================================================

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
            "CheapDataHub returned an invalid response.",
          providerStatus:
            providerResponse.status,
        },
        { status: 502 }
      );
    }

    // =====================================================
    // 14. DETERMINE PROVIDER SUCCESS
    // =====================================================

    const providerSuccess =
      providerResult.success === true ||
      providerResult.status === true ||
      providerResult.status === "true" ||
      providerResult.status === "success";

    // =====================================================
    // 15. PROVIDER FAILED
    // =====================================================

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
            providerResult.message ||
            providerResult.error ||
            "Airtime purchase failed.",

          providerResponse: providerResult,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 16. DETERMINE PROVIDER COST
    // =====================================================
    //
    // If CheapDataHub returns a cost/amount field,
    // use it.
    //
    // Otherwise the cost defaults to the amount paid
    // to CheapDataHub.
    //
    // Later, if you have different airtime reseller
    // pricing, this is where we can introduce the
    // actual provider cost and calculate profit.
    // =====================================================

    const providerCost =
      Number(
        providerResult.cost ??
        providerResult.amount_charged ??
        providerResult.amountCharged ??
        numericAmount
      );

    const actualCost =
      Number.isFinite(providerCost) &&
      providerCost >= 0
        ? providerCost
        : numericAmount;

    // =====================================================
    // 17. CALCULATE BUSINESS PROFIT
    // =====================================================

    const profit =
      numericAmount - actualCost;

    // =====================================================
    // 18. COMPLETE EVERYTHING ATOMICALLY
    // =====================================================
    //
    // User wallet:
    //
    //     - amount
    //
    // Business wallet:
    //
    //     + revenue
    //     - provider cost
    //
    // Business profit:
    //
    //     amount - provider cost
    //
    // BusinessRevenue:
    //
    //     stores the complete breakdown.
    // =====================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // -----------------------------------------------
          // Get fresh user balance
          // -----------------------------------------------

          const currentUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
            });

          if (!currentUser) {
            throw new Error(
              "User account could not be found."
            );
          }

          const currentBalance =
            Number(
              currentUser.walletBalance
            );

          if (
            !Number.isFinite(
              currentBalance
            ) ||
            currentBalance < numericAmount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // -----------------------------------------------
          // Get or create BusinessWallet
          // -----------------------------------------------

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
                  name: "Brainfriend Tech",

                  balance: 0,

                  totalRevenue: 0,

                  totalCost: 0,

                  totalProfit: 0,

                  withdrawnProfit: 0,

                  availableProfit: 0,
                },
              });
          }

          // -----------------------------------------------
          // New user wallet balance
          // -----------------------------------------------

          const newUserBalance =
            currentBalance -
            numericAmount;

          // -----------------------------------------------
          // New business wallet values
          // -----------------------------------------------

          const newBusinessBalance =
            Number(
              businessWallet.balance
            ) + profit;

          const newTotalRevenue =
            Number(
              businessWallet.totalRevenue
            ) + numericAmount;

          const newTotalCost =
            Number(
              businessWallet.totalCost
            ) + actualCost;

          const newTotalProfit =
            Number(
              businessWallet.totalProfit
            ) + profit;

          const newAvailableProfit =
            Number(
              businessWallet.availableProfit
            ) + profit;

          // -----------------------------------------------
          // Update USER wallet
          // -----------------------------------------------

          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              walletBalance:
                newUserBalance,
            },
          });

          // -----------------------------------------------
          // Update TRANSACTION
          // -----------------------------------------------

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status: "SUCCESS",

              cost: actualCost,

              profit,
            },
          });

          // -----------------------------------------------
          // Update BUSINESS WALLET
          // -----------------------------------------------

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

          // -----------------------------------------------
          // Create BUSINESS REVENUE record
          // -----------------------------------------------

          await tx.businessRevenue.create({
            data: {
              transactionId:
                transaction.id,

              type: "AIRTIME",

              provider:
                "CheapDataHub",

              amount:
                numericAmount,

              cost:
                actualCost,

              profit,

              reference,

              description:
                `Airtime purchase for ${cleanedPhone}`,

              businessWalletId:
                businessWallet.id,
            },
          });

          return {
            walletBalance:
              newUserBalance,

            businessBalance:
              newBusinessBalance,

            profit,
          };
        }
      );

    // =====================================================
    // 19. SUCCESS RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        providerResult.message ||
        "Airtime purchase successful.",

      reference,

      providerReference:
        providerResult.reference ||
        providerResult.transaction_id ||
        providerResult.transactionId ||
        null,

      phoneNumber:
        cleanedPhone,

      amount:
        numericAmount,

      providerCost:
        actualCost,

      profit:
        result.profit,

      walletBalance:
        result.walletBalance,
    });
  } catch (error: any) {
    // =====================================================
    // ERROR HANDLING
    // =====================================================

    console.error(
      "AIRTIME PURCHASE ERROR:",
      error
    );

    // -----------------------------------------------------
    // If a transaction was created but something failed
    // afterwards, mark it as failed.
    // -----------------------------------------------------

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
          "FAILED TO UPDATE AIRTIME TRANSACTION:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Airtime purchase failed.",
      },
      { status: 500 }
    );
  }
}