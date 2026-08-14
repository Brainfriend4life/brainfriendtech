import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const CHEAPDATAHUB_CABLE_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/cable/purchase/";

// ========================================================
// SERVICE FEE
// Change this value whenever you want.
// 5 = 5%, 10 = 10%, 15 = 15%
// ========================================================

const SERVICE_FEE_PERCENTAGE = 5;

// ========================================================
// CABLE PLANS
// ========================================================

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

// ========================================================
// HELPERS
// ========================================================

function generateReference(): string {
  return `CABLE-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

function isProviderSuccessful(
  result: any
): boolean {
  return (
    result?.status === true ||
    result?.status === "true" ||
    result?.status === "success" ||
    result?.success === true
  );
}

function calculateServiceFee(
  amount: number
): {
  serviceFee: number;
  totalAmount: number;
  providerCost: number;
  profit: number;
} {
  const providerCost = amount;

  const serviceFee =
    Math.round(
      providerCost *
        (SERVICE_FEE_PERCENTAGE / 100) *
        100
    ) / 100;

  const totalAmount =
    Math.round(
      (providerCost + serviceFee) * 100
    ) / 100;

  const profit =
    Math.round(
      (totalAmount - providerCost) * 100
    ) / 100;

  return {
    serviceFee,
    totalAmount,
    providerCost,
    profit,
  };
}

// ========================================================
// POST
// ========================================================

export async function POST(
  request: NextRequest
) {
  let transactionId: string | null = null;

  try {
    // ======================================================
    // AUTHENTICATION
    // ======================================================

    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    const userId =
      session.user.id;

    // ======================================================
    // REQUEST BODY
    // ======================================================

    const body =
      await request.json();

    const finalPlanId =
      body.plan_id ??
      body.planId;

    const finalCardNumber =
      body.cardnumber ??
      body.smartCard ??
      body.smart_card;

    const phone =
      body.phone;

    // ======================================================
    // REQUIRED FIELDS
    // ======================================================

    if (
      finalPlanId ===
        undefined ||
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
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // PLAN ID
    // ======================================================

    const numericPlanId =
      Number(finalPlanId);

    if (
      !Number.isInteger(
        numericPlanId
      ) ||
      numericPlanId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid cable plan ID.",
        },
        {
          status: 400,
        }
      );
    }

    const plan =
      cablePlans[
        numericPlanId
      ];

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cable plan not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ======================================================
    // CLEAN CARD NUMBER
    // ======================================================

    const cleanedCard =
      String(
        finalCardNumber
      ).replace(
        /\s+/g,
        ""
      );

    if (
      !/^\d{6,20}$/.test(
        cleanedCard
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid IUC/Smart Card number.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // CLEAN PHONE
    // ======================================================

    const cleanedPhone =
      String(phone)
        .trim()
        .replace(
          /\s+/g,
          ""
        )
        .replace(
          /^\+234/,
          "0"
        );

    if (
      !/^0\d{10}$/.test(
        cleanedPhone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid Nigerian phone number.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // FIND USER
    // ======================================================

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ======================================================
    // ACCOUNT STATUS
    // ======================================================

    if (
      user.status !==
      "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is not active.",
        },
        {
          status: 403,
        }
      );
    }

    // ======================================================
    // API KEY
    // ======================================================

    const apiKey =
      process.env
        .CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "CheapDataHub API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // ======================================================
    // PRICING
    // ======================================================

    const subscriptionAmount =
      Number(plan.price);

    if (
      !Number.isFinite(
        subscriptionAmount
      ) ||
      subscriptionAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid cable plan price.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      serviceFee,
      totalAmount,
      providerCost,
      profit,
    } =
      calculateServiceFee(
        subscriptionAmount
      );

    // ======================================================
    // WALLET CHECK
    // ======================================================

    const walletBalance =
      Number(
        user.walletBalance
      );

    if (
      !Number.isFinite(
        walletBalance
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid wallet balance.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      walletBalance <
      totalAmount
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Insufficient wallet balance.",

          balance:
            walletBalance,

          required:
            totalAmount,

          amount:
            subscriptionAmount,

          serviceFee,

          serviceFeePercentage:
            SERVICE_FEE_PERCENTAGE,

          totalAmount,
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // REFERENCE
    // ======================================================

    const reference =
      generateReference();

    // ======================================================
    // CREATE PENDING TRANSACTION
    // ======================================================

    const transaction =
      await prisma.transaction.create({
        data: {
          userId:
            user.id,

          type:
            "CABLE",

          amount:
            totalAmount,

          description:
            `${plan.provider} ${plan.name} for ${cleanedCard}`,

          status:
            "PENDING",

          reference,

          provider:
            "CheapDataHub",

          cost:
            providerCost,

          profit,

          isTest:
            false,
        },
      });

    transactionId =
      transaction.id;

    // ======================================================
    // PROVIDER REQUEST
    // ======================================================

    const requestBody = {
      plan_id:
        numericPlanId,

      cardnumber:
        cleanedCard,

      phone:
        cleanedPhone,
    };

    console.log(
      "=========================================="
    );

    console.log(
      "CHEAPDATAHUB CABLE PURCHASE"
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
      "PLAN:",
      plan
    );

    console.log(
      "PROVIDER COST:",
      providerCost
    );

    console.log(
      "SERVICE FEE PERCENTAGE:",
      SERVICE_FEE_PERCENTAGE
    );

    console.log(
      "SERVICE FEE:",
      serviceFee
    );

    console.log(
      "CUSTOMER TOTAL:",
      totalAmount
    );

    console.log(
      "API KEY EXISTS:",
      Boolean(apiKey)
    );

    console.log(
      "=========================================="
    );

    // ======================================================
    // CALL CHEAPDATAHUB
    // ======================================================

    const providerResponse =
      await fetch(
        CHEAPDATAHUB_CABLE_URL,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify(
              requestBody
            ),

          cache:
            "no-store",
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

    // ======================================================
    // PARSE PROVIDER RESPONSE
    // ======================================================

    let providerResult:
      any = null;

    if (
      responseText.trim()
    ) {
      try {
        providerResult =
          JSON.parse(
            responseText
          );
      } catch {
        providerResult =
          null;
      }
    }

    if (!providerResult) {
      await prisma.transaction.update({
        where: {
          id:
            transaction.id,
        },

        data: {
          status:
            "FAILED",
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
            responseText.substring(
              0,
              500
            ),
        },
        {
          status: 502,
        }
      );
    }

    // ======================================================
    // PROVIDER SUCCESS
    // ======================================================

    const providerSuccess =
      isProviderSuccessful(
        providerResult
      );

    if (
      !providerResponse.ok ||
      !providerSuccess
    ) {
      await prisma.transaction.update({
        where: {
          id:
            transaction.id,
        },

        data: {
          status:
            "FAILED",
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
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // PROVIDER REFERENCE
    // ======================================================

    const providerData =
      providerResult?.data ||
      {};

    const providerReference =
      providerResult?.reference ||
      providerResult?.transaction_id ||
      providerResult?.transactionId ||
      providerData?.reference ||
      providerData?.transaction_id ||
      providerData?.transactionId ||
      null;

    // ======================================================
    // ATOMIC ACCOUNTING
    // ======================================================

    const finalResult =
      await prisma.$transaction(
        async (tx) => {
          // ----------------------------------------------
          // FRESH USER BALANCE
          // ----------------------------------------------

          const freshUser =
            await tx.user.findUnique({
              where: {
                id:
                  user.id,
              },

              select: {
                id: true,
                walletBalance:
                  true,
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
            )
          ) {
            throw new Error(
              "Invalid wallet balance."
            );
          }

          if (
            freshBalance <
            totalAmount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // ----------------------------------------------
          // BUSINESS WALLET
          // ----------------------------------------------

          let businessWallet =
            await tx.businessWallet.findUnique({
              where: {
                name:
                  "Brainfriend Tech",
              },
            });

          if (
            !businessWallet
          ) {
            businessWallet =
              await tx.businessWallet.create({
                data: {
                  name:
                    "Brainfriend Tech",

                  balance:
                    0,

                  totalRevenue:
                    0,

                  totalCost:
                    0,

                  totalProfit:
                    0,

                  withdrawnProfit:
                    0,

                  availableProfit:
                    0,
                },
              });
          }

          // ----------------------------------------------
          // NEW BALANCES
          // ----------------------------------------------

          const newUserBalance =
            freshBalance -
            totalAmount;

          const newBusinessBalance =
            Number(
              businessWallet.balance
            ) + totalAmount;

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

          // ----------------------------------------------
          // UPDATE USER
          // ----------------------------------------------

          await tx.user.update({
            where: {
              id:
                user.id,
            },

            data: {
              walletBalance:
                newUserBalance,
            },
          });

          // ----------------------------------------------
          // UPDATE TRANSACTION
          // ----------------------------------------------

          await tx.transaction.update({
            where: {
              id:
                transaction.id,
            },

            data: {
              status:
                "SUCCESS",

              amount:
                totalAmount,

              cost:
                providerCost,

              profit,

              isTest:
                false,
            },
          });

          // ----------------------------------------------
          // UPDATE BUSINESS WALLET
          // ----------------------------------------------

          await tx.businessWallet.update({
            where: {
              id:
                businessWallet.id,
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

          // ----------------------------------------------
          // BUSINESS REVENUE
          // ----------------------------------------------

          await tx.businessRevenue.create({
            data: {
              transactionId:
                transaction.id,

              type:
                "CABLE",

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

    // ======================================================
    // SUCCESS RESPONSE
    // ======================================================

    return NextResponse.json({
      success: true,

      message:
        providerResult?.message ||
        "Cable subscription successful.",

      reference,

      providerReference,

      amount:
        subscriptionAmount,

      serviceFee,

      serviceFeePercentage:
        SERVICE_FEE_PERCENTAGE,

      totalAmount,

      providerCost,

      profit:
        finalResult.profit,

      walletBalance:
        finalResult.walletBalance,

      businessRevenue:
        totalAmount,

      businessCost:
        providerCost,

      businessProfit:
        finalResult.profit,

      plan: {
        id:
          numericPlanId,

        provider:
          plan.provider,

        name:
          plan.name,

        price:
          plan.price,
      },

      cardnumber:
        cleanedCard,

      phone:
        cleanedPhone,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    // ======================================================
    // ERROR HANDLING
    // ======================================================

    console.error(
      "CABLE PURCHASE ERROR:",
      error
    );

    if (
      transactionId
    ) {
      try {
        await prisma.transaction.update({
          where: {
            id:
              transactionId,
          },

          data: {
            status:
              "FAILED",
          },
        });
      } catch (
        updateError
      ) {
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
      {
        status: 500,
      }
    );
  }
}