import { verifyTransactionPin } from "@/lib/security/verifyTransactionPin";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  getServiceFeePercent,
  calculateServiceFee,
} from "@/lib/service-fee";

const CHEAPDATAHUB_CABLE_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/cable/purchase/";

const REFERRAL_COMMISSION_SETTING_KEY =
  "REFERRAL_COMMISSION_CABLE";

const DEFAULT_REFERRAL_COMMISSION_PERCENTAGE = 1;

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

function isProviderSuccessful(result: any): boolean {
  return (
    result?.status === true ||
    result?.status === "true" ||
    result?.status === "success" ||
    result?.status === "successful" ||
    result?.success === true
  );
}

async function getReferralCommissionPercent(): Promise<number> {
  try {
    const setting =
      await prisma.systemSetting.findUnique({
        where: {
          key: REFERRAL_COMMISSION_SETTING_KEY,
        },
      });

    if (setting) {
      const value = Number(setting.value);

      if (
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
      ) {
        return value;
      }
    }
  } catch (error) {
    console.error(
      "CABLE REFERRAL COMMISSION SETTING ERROR:",
      error
    );
  }

  return DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;
}

// ========================================================
// POST
// ========================================================

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    // ======================================================
    // 1. AUTHENTICATION
    // ======================================================

    const session =
      await getServerSession(authOptions);

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

    // ======================================================
    // 2. REQUEST BODY
    // ======================================================

    const body = await request.json();

    const finalPlanId =
      body.plan_id ??
      body.planId;

    const finalCardNumber =
      body.cardnumber ??
      body.smartCard ??
      body.smart_card;

    const phone = body.phone;

    const transactionPin =
      body.transactionPin;

    // ======================================================
    // 3. REQUIRED FIELDS
    // ======================================================

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

    // ======================================================
    // 4. PLAN ID
    // ======================================================

    const numericPlanId =
      Number(finalPlanId);

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

    const plan =
      cablePlans[numericPlanId];

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message: "Cable plan not found.",
        },
        { status: 404 }
      );
    }

    // ======================================================
    // 5. CLEAN CARD NUMBER
    // ======================================================

    const cleanedCard =
      String(finalCardNumber).replace(
        /\s+/g,
        ""
      );

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

    // ======================================================
    // 6. CLEAN PHONE
    // ======================================================

    const cleanedPhone =
      String(phone)
        .trim()
        .replace(/\s+/g, "")
        .replace(/^\+234/, "0")
        .replace(/^234/, "0");

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

    // ======================================================
    // 7. FIND USER + REFERRER
    // ======================================================

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          referredBy: {
            select: {
              id: true,
              fullName: true,
              referralCode: true,
              referralBalance: true,
            },
          },
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

    // ======================================================
    // 8. CHECK TRANSACTION PIN
    // ======================================================

    if (!transactionPin) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction PIN is required.",
        },
        { status: 400 }
      );
    }

    const pinResult =
      await verifyTransactionPin(
        user.id,
        transactionPin
      );

    if (!pinResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: pinResult.message,
        },
        { status: 403 }
      );
    }

    // ======================================================
    // 9. ACCOUNT STATUS
    // ======================================================

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // ======================================================
    // 10. API KEY
    // ======================================================

    const apiKey =
      process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ======================================================
    // 11. GET SERVICE FEE
    // ======================================================

    const serviceFeePercentage =
      await getServiceFeePercent();

    // ======================================================
    // 12. GET REFERRAL COMMISSION
    // ======================================================

    const referralPercentage =
      await getReferralCommissionPercent();

    console.log(
      "CABLE SERVICE FEE:",
      `${serviceFeePercentage}%`
    );

    console.log(
      "CABLE REFERRAL COMMISSION:",
      `${referralPercentage}%`
    );

    // ======================================================
    // 13. PRICING
    // ======================================================

    const providerCost =
      Number(plan.price);

    if (
      !Number.isFinite(providerCost) ||
      providerCost <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid cable plan price.",
        },
        { status: 400 }
      );
    }

    const pricing =
      calculateServiceFee(
        providerCost,
        serviceFeePercentage
      );

    const basePrice =
      pricing.providerCost;

    const serviceFee =
      pricing.serviceFee;

    const totalAmount =
      pricing.totalAmount;

    const grossProfit =
      pricing.profit;

    // ======================================================
    // 14. REFERRAL COMMISSION
    // ======================================================

    let referralCommission = 0;

    if (
      user.referredBy &&
      grossProfit > 0 &&
      referralPercentage > 0
    ) {
      const calculatedCommission =
        Number(
          (
            basePrice *
            (referralPercentage / 100)
          ).toFixed(2)
        );

      referralCommission =
        Math.min(
          calculatedCommission,
          grossProfit
        );
    }

    // ======================================================
    // 15. ACTUAL BUSINESS PROFIT
    // ======================================================

    const actualProfit =
      Number(
        (
          grossProfit -
          referralCommission
        ).toFixed(2)
      );

    // ======================================================
    // 16. WALLET CHECK
    // ======================================================

    const walletBalance =
      Number(user.walletBalance);

    if (
      !Number.isFinite(walletBalance)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid wallet balance.",
        },
        { status: 400 }
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
            basePrice,
          serviceFee,
          serviceFeePercentage,
          totalAmount,
        },
        { status: 400 }
      );
    }

    // ======================================================
    // 17. REFERENCE
    // ======================================================

    const reference =
      generateReference();

    // ======================================================
    // 18. CREATE PENDING TRANSACTION
    // ======================================================

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
          provider:
            "CheapDataHub",
          cost:
            providerCost,
          profit:
            actualProfit,
          isTest: false,
        },
      });

    transactionId =
      transaction.id;

    // ======================================================
    // 19. PROVIDER REQUEST
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
      "REQUEST:",
      requestBody
    );

    console.log(
      "PLAN:",
      plan
    );

    console.log(
      "BASE PRICE:",
      basePrice
    );

    console.log(
      "PROVIDER COST:",
      providerCost
    );

    console.log(
      "SERVICE FEE PERCENTAGE:",
      serviceFeePercentage
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
      "GROSS PROFIT:",
      grossProfit
    );

    console.log(
      "REFERRAL PERCENTAGE:",
      referralPercentage
    );

    console.log(
      "REFERRAL COMMISSION:",
      referralCommission
    );

    console.log(
      "BUSINESS PROFIT:",
      actualProfit
    );

    console.log(
      "=========================================="
    );

    // ======================================================
    // 20. CALL CHEAPDATAHUB
    // ======================================================

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
    // 21. PARSE PROVIDER RESPONSE
    // ======================================================

    let providerResult: any =
      null;

    if (responseText.trim()) {
      try {
        providerResult =
          JSON.parse(
            responseText
          );
      } catch {
        providerResult = null;
      }
    }

    // ======================================================
    // 22. INVALID PROVIDER RESPONSE
    // ======================================================

    if (!providerResult) {
      await prisma.transaction.update({
        where: {
          id:
            transaction.id,
        },
        data: {
          status:
            "FAILED",
          cost:
            0,
          profit:
            0,
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
        { status: 502 }
      );
    }

    // ======================================================
    // 23. PROVIDER SUCCESS
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
          cost:
            0,
          profit:
            0,
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

    // ======================================================
    // 24. PROVIDER REFERENCE
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
    // 25. ATOMIC ACCOUNTING
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
                fullName: true,
                walletBalance:
                  true,
                referralBalance:
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
                  "Brainfriend Global Tech",
              },
            });

          if (!businessWallet) {
            businessWallet =
              await tx.businessWallet.create({
                data: {
                  name:
                    "Brainfriend Global Tech",
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
            Number(
              (
                freshBalance -
                totalAmount
              ).toFixed(2)
            );

          const newBusinessBalance =
            Number(
              (
                Number(
                  businessWallet.balance
                ) +
                actualProfit
              ).toFixed(2)
            );

          const newTotalRevenue =
            Number(
              (
                Number(
                  businessWallet.totalRevenue
                ) +
                totalAmount
              ).toFixed(2)
            );

          const newTotalCost =
            Number(
              (
                Number(
                  businessWallet.totalCost
                ) +
                providerCost
              ).toFixed(2)
            );

          const newTotalProfit =
            Number(
              (
                Number(
                  businessWallet.totalProfit
                ) +
                actualProfit
              ).toFixed(2)
            );

          const newAvailableProfit =
            Number(
              (
                Number(
                  businessWallet.availableProfit
                ) +
                actualProfit
              ).toFixed(2)
            );

          // ----------------------------------------------
          // UPDATE USER WALLET
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
              profit:
                actualProfit,
              description:
                `${plan.provider} ${plan.name} for ${cleanedCard} + ${serviceFeePercentage}% service fee`,
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
              profit:
                actualProfit,
              reference,
              description:
                `${plan.provider} ${plan.name} for ${cleanedCard} + ${serviceFeePercentage}% service fee`,
              businessWalletId:
                businessWallet.id,
            },
          });

          // ----------------------------------------------
          // PAY REFERRER
          // ----------------------------------------------

          if (
            user.referredBy &&
            referralCommission > 0
          ) {
            await tx.user.update({
              where: {
                id:
                  user.referredBy.id,
              },
              data: {
                referralBalance: {
                  increment:
                    referralCommission,
                },
              },
            });

            await tx.referralEarning.create({
              data: {
                referrerId:
                  user.referredBy.id,
                referredUserId:
                  user.id,
                transactionId:
                  transaction.id,
                amount:
                  referralCommission,
                percentage:
                  referralPercentage,
                transactionAmount:
                  basePrice,
                type:
                  "CABLE",
                status:
                  "SUCCESS",
                description:
                  `Referral earning from ${user.fullName}'s cable subscription of ₦${basePrice}`,
                reference:
                  `REF-${reference}`,
              },
            });
          }

          // ----------------------------------------------
          // GET UPDATED USER BALANCE
          // ----------------------------------------------

          const updatedUser =
            await tx.user.findUnique({
              where: {
                id:
                  user.id,
              },
              select: {
                walletBalance:
                  true,
                referralBalance:
                  true,
              },
            });

          return {
            walletBalance:
              Number(
                updatedUser?.walletBalance ??
                  0
              ),

            referralBalance:
              Number(
                updatedUser?.referralBalance ??
                  0
              ),

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

            grossProfit,

            referralCommission,

            profit:
              actualProfit,
          };
        }
      );

    // ======================================================
    // 26. SUCCESS RESPONSE
    // ======================================================

    return NextResponse.json({
      success: true,

      message:
        providerResult?.message ||
        "Cable subscription successful.",

      reference,

      providerReference,

      amount:
        basePrice,

      serviceFee,

      serviceFeePercentage,

      totalAmount,

      providerCost,

      grossProfit:
        finalResult.grossProfit,

      referralPercentage,

      referralCommission:
        finalResult.referralCommission,

      profit:
        finalResult.profit,

      walletBalance:
        finalResult.walletBalance,

      referralBalance:
        finalResult.referralBalance,

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
    // 27. ERROR HANDLING
    // ======================================================

    console.error(
      "CABLE PURCHASE ERROR:",
      error
    );

    if (transactionId) {
      try {
        const existingTransaction =
          await prisma.transaction.findUnique({
            where: {
              id:
                transactionId,
            },
            select: {
              status:
                true,
            },
          });

        if (
          existingTransaction &&
          existingTransaction.status ===
            "PENDING"
        ) {
          await prisma.transaction.update({
            where: {
              id:
                transactionId,
            },
            data: {
              status:
                "FAILED",
              cost:
                0,
              profit:
                0,
            },
          });
        }
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
      {
        status: 500,
      }
    );
  }
}