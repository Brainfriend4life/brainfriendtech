import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const CHEAPDATAHUB_CABLE_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/cable/purchase/";

const cablePlans: Record<
  number,
  {
    provider: string;
    name: string;
    price: number;
  }
> = {
  3: {
    provider: "DSTV",
    name: "DStv Padi",
    price: 4400,
  },
  4: {
    provider: "GOTV",
    name: "GOtv Smallie-monthly",
    price: 1900,
  },
  5: {
    provider: "STARTIMES",
    name: "Nova (antenna) -1 week",
    price: 700,
  },
  6: {
    provider: "DSTV",
    name: "DStv Yanga",
    price: 6000,
  },
  7: {
    provider: "DSTV",
    name: "DStv Confam",
    price: 11000,
  },
  8: {
    provider: "DSTV",
    name: "DStv Compact",
    price: 19000,
  },
  9: {
    provider: "DSTV",
    name: "DStv Compact Plus",
    price: 30000,
  },
  10: {
    provider: "DSTV",
    name: "DStv Premium",
    price: 44500,
  },
  11: {
    provider: "GOTV",
    name: "GOtv Jinja",
    price: 3900,
  },
  12: {
    provider: "GOTV",
    name: "Gotv Jolli",
    price: 5800,
  },
  13: {
    provider: "GOTV",
    name: "GOtv Max",
    price: 8500,
  },
  14: {
    provider: "GOTV",
    name: "GOtv Supa",
    price: 11400,
  },
  15: {
    provider: "GOTV",
    name: "GOtv Supa Plus",
    price: 16800,
  },
  16: {
    provider: "STARTIMES",
    name: "Nova (Dish) - 1 Week",
    price: 700,
  },
  17: {
    provider: "STARTIMES",
    name: "Nova (Antenna) - 1 Month",
    price: 2100,
  },
  18: {
    provider: "STARTIMES",
    name: "Basic (Antenna) -1 Week",
    price: 1400,
  },
  19: {
    provider: "STARTIMES",
    name: "Basic (Dish) - 1 week",
    price: 1700,
  },
  20: {
    provider: "STARTIMES",
    name: "Basic (Antenna)- 1 month",
    price: 4000,
  },
  21: {
    provider: "STARTIMES",
    name: "Basic (dish) - 1Month",
    price: 5100,
  },
  22: {
    provider: "STARTIMES",
    name: "Classic (Dish) - 1 Week",
    price: 2500,
  },
  23: {
    provider: "STARTIMES",
    name: "Classic (Dish) -1 Month",
    price: 7400,
  },
  24: {
    provider: "STARTIMES",
    name: "Super (Dish) - 1 Week",
    price: 3300,
  },
  25: {
    provider: "STARTIMES",
    name: "Super (Antenna) - 1 week",
    price: 3200,
  },
  26: {
    provider: "STARTIMES",
    name: "Super (Antenna) -1 Month",
    price: 9500,
  },
};

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
          message: "You must be logged in.",
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
      plan_id,
      planId,
      cardnumber,
      smartCard,
      phone,
    } = body;

    const finalPlanId = plan_id ?? planId;
    const finalCardNumber = cardnumber ?? smartCard;

    if (
      finalPlanId === undefined ||
      finalPlanId === null ||
      !finalCardNumber ||
      !phone
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "plan_id, cardnumber and phone are required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 3. VALIDATE PLAN ID
    // ==========================================

    const numericPlanId = Number(finalPlanId);

    if (
      !Number.isInteger(numericPlanId) ||
      numericPlanId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid cable plan ID.",
        },
        { status: 400 }
      );
    }

    const plan = cablePlans[numericPlanId];

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message: "Cable plan not found.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // 4. VALIDATE IUC / SMART CARD
    // ==========================================

    const cleanedCard = String(finalCardNumber)
      .replace(/\s+/g, "");

    if (!/^\d{6,20}$/.test(cleanedCard)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid IUC/Smart Card number.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 5. VALIDATE PHONE
    // ==========================================

    const cleanedPhone = String(phone)
      .replace(/\s+/g, "")
      .replace(/^\+234/, "0");

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid Nigerian phone number.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 6. FIND USER
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
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // ==========================================
    // 7. API KEY
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
          message:
            "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 8. CUSTOMER PRICE
    // ==========================================

    const subscriptionAmount = Number(
      plan.price
    );

    // ==========================================
    // 9. SERVICE FEE
    // ==========================================

    const serviceFee =
      subscriptionAmount * 0.05;

    // ==========================================
    // 10. TOTAL CUSTOMER PAYMENT
    // ==========================================

    const totalAmount =
      subscriptionAmount + serviceFee;

    // ==========================================
    // 11. PROVIDER COST
    // ==========================================
    //
    // IMPORTANT:
    // At the moment we do not have a separate
    // CheapDataHub cable reseller cost in the
    // plan list.
    //
    // Therefore:
    //
    // provider cost = subscription amount
    // business profit = service fee
    //
    // Later, if CheapDataHub gives us a lower
    // actual cost, we can replace this value.
    // ==========================================

    const providerCost =
      subscriptionAmount;

    const profit =
      totalAmount - providerCost;

    // ==========================================
    // 12. CHECK USER WALLET
    // ==========================================

    const walletBalance =
      Number(user.walletBalance);

    if (
      !Number.isFinite(walletBalance) ||
      walletBalance < totalAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insufficient wallet balance.",
          balance: walletBalance,
          required: totalAmount,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 13. GENERATE REFERENCE
    // ==========================================

    const reference =
      `CABLE-${Date.now()}-${Math.random()
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

          type: "CABLE",

          amount: totalAmount,

          description:
            `${plan.provider} ${plan.name} for ${cleanedCard}`,

          status: "PENDING",

          reference,

          provider: "CheapDataHub",

          cost: providerCost,

          profit,
        },
      });

    transactionId = transaction.id;

    // ==========================================
    // 15. CALL CHEAPDATAHUB
    // ==========================================

    const requestBody = {
      plan_id: numericPlanId,
      cardnumber: cleanedCard,
      phone: cleanedPhone,
    };

    console.log(
      "========== CHEAPDATAHUB CABLE REQUEST =========="
    );

    console.log(
      "URL:",
      CHEAPDATAHUB_CABLE_URL
    );

    console.log(
      "REQUEST:",
      requestBody
    );

    console.log(
      "API KEY EXISTS:",
      !!apiKey
    );

    console.log(
      "================================================="
    );

    const providerResponse =
      await fetch(
        CHEAPDATAHUB_CABLE_URL,
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
            requestBody
          ),

          cache: "no-store",
        }
      );

    const responseText =
      await providerResponse.text();

    console.log(
      "CHEAPDATAHUB CABLE STATUS:",
      providerResponse.status
    );

    console.log(
      "CHEAPDATAHUB CABLE RESPONSE:",
      responseText
    );

    // ==========================================
    // 16. PARSE PROVIDER RESPONSE
    // ==========================================

    let providerResult: any = null;

    if (responseText.trim()) {
      try {
        providerResult =
          JSON.parse(responseText);
      } catch {
        providerResult = null;
      }
    }

    // ==========================================
    // 17. INVALID PROVIDER RESPONSE
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

          message:
            "CheapDataHub returned an invalid response.",

          providerStatus:
            providerResponse.status,

          providerResponse:
            responseText.substring(0, 500),
        },
        { status: 502 }
      );
    }

    // ==========================================
    // 18. CHECK PROVIDER SUCCESS
    // ==========================================

    const providerSuccess =
      providerResult?.status === true ||
      providerResult?.status === "true" ||
      providerResult?.status === "success" ||
      providerResult?.success === true;

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

          message:
            providerResult?.message ||
            providerResult?.error ||
            providerResult?.response_description ||
            "Cable subscription failed.",

          providerStatus:
            providerResponse.status,

          providerResponse:
            providerResult,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 19. FINAL DATABASE TRANSACTION
    // ==========================================
    //
    // Everything below happens atomically:
    //
    // USER WALLET
    //       ↓
    // transaction
    //       ↓
    // BusinessRevenue
    //       ↓
    // BusinessWallet
    //
    // If anything fails, everything rolls back.
    // ==========================================

    const finalResult =
      await prisma.$transaction(
        async (tx) => {
          // --------------------------------------
          // GET FRESH USER BALANCE
          // --------------------------------------

          const freshUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
              select: {
                id: true,
                walletBalance: true,
              },
            });

          if (!freshUser) {
            throw new Error(
              "User not found."
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
            freshBalance < totalAmount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // --------------------------------------
          // FIND OR CREATE BUSINESS WALLET
          // --------------------------------------

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

          // --------------------------------------
          // NEW USER BALANCE
          // --------------------------------------

          const newUserBalance =
            freshBalance -
            totalAmount;

          // --------------------------------------
          // BUSINESS WALLET VALUES
          // --------------------------------------

          const newBusinessBalance =
            Number(
              businessWallet.balance
            ) + profit;

          const newTotalRevenue =
            Number(
              businessWallet.totalRevenue
            ) + totalAmount;

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

          // --------------------------------------
          // UPDATE USER WALLET
          // --------------------------------------

          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              walletBalance:
                newUserBalance,
            },
          });

          // --------------------------------------
          // UPDATE ORIGINAL TRANSACTION
          // --------------------------------------

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status: "SUCCESS",

              amount: totalAmount,

              cost: providerCost,

              profit,
            },
          });

          // --------------------------------------
          // UPDATE BUSINESS WALLET
          // --------------------------------------

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

          // --------------------------------------
          // CREATE BUSINESS REVENUE RECORD
          // --------------------------------------

          await tx.businessRevenue.create({
            data: {
              transactionId:
                transaction.id,

              type: "CABLE",

              provider:
                "CheapDataHub",

              amount:
                totalAmount,

              cost:
                providerCost,

              profit,

              reference,

              description:
                `${plan.provider} ${plan.name} for ${cleanedCard}`,

              businessWalletId:
                businessWallet.id,
            },
          });

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
    // 20. SUCCESS RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      message:
        providerResult?.message ||
        "Cable subscription successful.",

      reference,

      providerReference:
        providerResult?.reference ||
        providerResult?.transaction_id ||
        providerResult?.transactionId ||
        null,

      amount:
        subscriptionAmount,

      serviceFee,

      totalAmount,

      providerCost,

      profit:
        finalResult.profit,

      walletBalance:
        finalResult.walletBalance,

      plan: {
        id: numericPlanId,

        provider:
          plan.provider,

        name:
          plan.name,
      },

      cardnumber:
        cleanedCard,

      phone:
        cleanedPhone,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    console.error(
      "CABLE PURCHASE ERROR:",
      error
    );

    // ==========================================
    // MARK TRANSACTION FAILED
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
          "FAILED TO UPDATE CABLE TRANSACTION:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Cable purchase failed.",
      },
      { status: 500 }
    );
  }
}