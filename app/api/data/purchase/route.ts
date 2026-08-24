
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

import {
  getServiceFeePercent,
  calculateServiceFee,
} from "@/lib/service-fee";

const CHEAPDATAHUB_DATA_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/data/purchase/";

// ============================================================
// REFERRAL COMMISSION
// ============================================================

const DEFAULT_REFERRAL_COMMISSION_PERCENTAGE = 1;

const REFERRAL_COMMISSION_SETTING_KEY =
  "REFERRAL_COMMISSION_DATA";

// ============================================================
// DATA PLANS
// ============================================================

const dataPlans: Record<
  number,
  {
    provider: string;
    size: string;
    duration: string;
    price: number;
    resellerPrice: number;
    apiPrice: number;
  }
> = {
  // =========================
  // AIRTEL
  // =========================

  70: {
    provider: "airtel",
    size: "1GB (Social Bundle)",
    duration: "3 Days",
    price: 350,
    resellerPrice: 330,
    apiPrice: 295,
  },

  13: {
    provider: "airtel",
    size: "500MB",
    duration: "7 Days",
    price: 500,
    resellerPrice: 495,
    apiPrice: 490,
  },

  69: {
    provider: "airtel",
    size: "1.5GB",
    duration: "1 Day",
    price: 530,
    resellerPrice: 520,
    apiPrice: 500,
  },

  66: {
    provider: "airtel",
    size: "1.5GB",
    duration: "2 Days",
    price: 650,
    resellerPrice: 630,
    apiPrice: 599,
  },

  15: {
    provider: "airtel",
    size: "1GB",
    duration: "7 Days",
    price: 1000,
    resellerPrice: 800,
    apiPrice: 800,
  },

  17: {
    provider: "airtel",
    size: "2GB",
    duration: "30 Days",
    price: 1550,
    resellerPrice: 1550,
    apiPrice: 1490,
  },

  52: {
    provider: "airtel",
    size: "5GB",
    duration: "7 Days",
    price: 1599,
    resellerPrice: 1575,
    apiPrice: 1570,
  },

  18: {
    provider: "airtel",
    size: "3GB",
    duration: "30 Days",
    price: 2100,
    resellerPrice: 1999,
    apiPrice: 1960,
  },

  22: {
    provider: "airtel",
    size: "6GB",
    duration: "7 Days",
    price: 2599,
    resellerPrice: 2495,
    apiPrice: 2455,
  },

  19: {
    provider: "airtel",
    size: "4GB",
    duration: "30 Days",
    price: 2650,
    resellerPrice: 2599,
    apiPrice: 2570,
  },

  20: {
    provider: "airtel",
    size: "8GB",
    duration: "30 Days",
    price: 3200,
    resellerPrice: 3100,
    apiPrice: 2999,
  },

  21: {
    provider: "airtel",
    size: "10GB",
    duration: "30 Days",
    price: 4200,
    resellerPrice: 4099,
    apiPrice: 4070,
  },

  // =========================
  // GLO
  // =========================

  42: {
    provider: "glo",
    size: "200MB",
    duration: "1 Day",
    price: 100,
    resellerPrice: 95,
    apiPrice: 92,
  },

  35: {
    provider: "glo",
    size: "500MB",
    duration: "30 Days",
    price: 250,
    resellerPrice: 230,
    apiPrice: 225,
  },

  68: {
    provider: "glo",
    size: "1GB",
    duration: "3 Days",
    price: 350,
    resellerPrice: 300,
    apiPrice: 300,
  },

  36: {
    provider: "glo",
    size: "1GB",
    duration: "30 Days",
    price: 450,
    resellerPrice: 430,
    apiPrice: 425,
  },

  41: {
    provider: "glo",
    size: "1GB",
    duration: "14 Days",
    price: 500,
    resellerPrice: 490,
    apiPrice: 485,
  },

  40: {
    provider: "glo",
    size: "2GB",
    duration: "30 Days",
    price: 900,
    resellerPrice: 850,
    apiPrice: 850,
  },

  37: {
    provider: "glo",
    size: "3GB",
    duration: "30 Days",
    price: 1500,
    resellerPrice: 1300,
    apiPrice: 1300,
  },

  54: {
    provider: "glo",
    size: "5GB",
    duration: "7 Days",
    price: 1800,
    resellerPrice: 1750,
    apiPrice: 1699,
  },

  38: {
    provider: "glo",
    size: "5GB",
    duration: "30 Days",
    price: 2400,
    resellerPrice: 2300,
    apiPrice: 2250,
  },

  39: {
    provider: "glo",
    size: "10GB",
    duration: "30 Days",
    price: 4500,
    resellerPrice: 4399,
    apiPrice: 4390,
  },

  59: {
    provider: "glo",
    size: "20.5GB",
    duration: "30 Days",
    price: 6000,
    resellerPrice: 5500,
    apiPrice: 5300,
  },

  58: {
    provider: "glo",
    size: "107GB",
    duration: "30 Days",
    price: 20000,
    resellerPrice: 19500,
    apiPrice: 19300,
  },

  // =========================
  // MTN
  // =========================

  43: {
    provider: "mtn",
    size: "110MB",
    duration: "1 Day",
    price: 100,
    resellerPrice: 99,
    apiPrice: 99,
  },

  74: {
    provider: "mtn",
    size: "230MB",
    duration: "1 Day",
    price: 250,
    resellerPrice: 230,
    apiPrice: 200,
  },

  76: {
    provider: "mtn",
    size: "500MB",
    duration: "2 Days",
    price: 270,
    resellerPrice: 270,
    apiPrice: 250,
  },

  78: {
    provider: "mtn",
    size: "1GB",
    duration: "1 Day",
    price: 300,
    resellerPrice: 300,
    apiPrice: 270,
  },

  81: {
    provider: "mtn",
    size: "1GB",
    duration: "30 Days",
    price: 350,
    resellerPrice: 350,
    apiPrice: 280,
  },

  44: {
    provider: "mtn",
    size: "500MB",
    duration: "30 Days",
    price: 400,
    resellerPrice: 390,
    apiPrice: 350,
  },

  77: {
    provider: "mtn",
    size: "1GB",
    duration: "2 Days",
    price: 450,
    resellerPrice: 440,
    apiPrice: 399,
  },

  45: {
    provider: "mtn",
    size: "1GB",
    duration: "7 Days",
    price: 499,
    resellerPrice: 450,
    apiPrice: 450,
  },

  46: {
    provider: "mtn",
    size: "1GB",
    duration: "30 Days",
    price: 600,
    resellerPrice: 570,
    apiPrice: 570,
  },

  79: {
    provider: "mtn",
    size: "2.5GB",
    duration: "1 Day",
    price: 650,
    resellerPrice: 650,
    apiPrice: 600,
  },

  47: {
    provider: "mtn",
    size: "2GB",
    duration: "7 Days",
    price: 950,
    resellerPrice: 930,
    apiPrice: 930,
  },

  27: {
    provider: "mtn",
    size: "2.5GB",
    duration: "2 Days",
    price: 1000,
    resellerPrice: 950,
    apiPrice: 900,
  },

  71: {
    provider: "mtn",
    size: "2GB",
    duration: "7 Days",
    price: 1000,
    resellerPrice: 950,
    apiPrice: 900,
  },

  60: {
    provider: "mtn",
    size: "4.5GB",
    duration: "1 Day",
    price: 1100,
    resellerPrice: 1100,
    apiPrice: 1050,
  },

  48: {
    provider: "mtn",
    size: "2GB",
    duration: "30 Days",
    price: 1250,
    resellerPrice: 1199,
    apiPrice: 1150,
  },

  61: {
    provider: "mtn",
    size: "4GB",
    duration: "2 Days",
    price: 1300,
    resellerPrice: 1200,
    apiPrice: 1175,
  },

  82: {
    provider: "mtn",
    size: "5GB",
    duration: "30 Days",
    price: 1500,
    resellerPrice: 1400,
    apiPrice: 1299,
  },

  80: {
    provider: "mtn",
    size: "5GB",
    duration: "14 Days",
    price: 1500,
    resellerPrice: 1400,
    apiPrice: 1299,
  },

  49: {
    provider: "mtn",
    size: "3GB",
    duration: "30 Days",
    price: 1500,
    resellerPrice: 1399,
    apiPrice: 1370,
  },

  50: {
    provider: "mtn",
    size: "5GB",
    duration: "30 Days",
    price: 2300,
    resellerPrice: 2099,
    apiPrice: 2050,
  },

  53: {
    provider: "mtn",
    size: "6GB",
    duration: "7 Days",
    price: 2600,
    resellerPrice: 2500,
    apiPrice: 2495,
  },

  55: {
    provider: "mtn",
    size: "11GB",
    duration: "7 Days",
    price: 3600,
    resellerPrice: 3600,
    apiPrice: 3550,
  },

  33: {
    provider: "mtn",
    size: "7GB",
    duration: "30 Days",
    price: 3800,
    resellerPrice: 3700,
    apiPrice: 3600,
  },

  67: {
    provider: "mtn",
    size: "10GB",
    duration: "30 Days",
    price: 5000,
    resellerPrice: 4900,
    apiPrice: 4800,
  },

  57: {
    provider: "mtn",
    size: "36GB",
    duration: "30 Days",
    price: 11000,
    resellerPrice: 10900,
    apiPrice: 10900,
  },

  51: {
    provider: "mtn",
    size: "75GB",
    duration: "30 Days",
    price: 18500,
    resellerPrice: 17999,
    apiPrice: 17990,
  },
};

// ============================================================
// LOAD REFERRAL COMMISSION
// ============================================================

async function getReferralCommissionPercentage(): Promise<number> {
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
      "DATA REFERRAL COMMISSION SETTING ERROR:",
      error
    );
  }

  return DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;
}

// ============================================================
// POST
// ============================================================

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    // ==========================================================
    // 1. AUTHENTICATION
    // ==========================================================

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

    // ==========================================================
    // 2. REQUEST BODY
    // ==========================================================

    const body = await request.json();

    const rawBundleId =
      body.bundle_id ??
      body.bundleId ??
      body.plan_id ??
      body.planId ??
      body.dataPlanId;

    const phoneNumber =
      body.phone_number ??
      body.phoneNumber ??
      body.phone;

    const bundleId = Number(rawBundleId);

    if (
      !Number.isInteger(bundleId) ||
      !dataPlans[bundleId]
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid data plan.",
          receivedBundleId: rawBundleId,
        },
        { status: 400 }
      );
    }

    const plan = dataPlans[bundleId];

    // ==========================================================
    // 3. PHONE NUMBER
    // ==========================================================

    const cleanedPhone = String(phoneNumber || "")
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

    // ==========================================================
    // 4. USER + REFERRER
    // ==========================================================

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.user.id,
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

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // ==========================================================
    // 5. API KEY
    // ==========================================================

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

    // ==========================================================
    // 6. BASE PRICING
    // ==========================================================

    const basePrice =
      Number(plan.resellerPrice);

    const providerCost =
      Number(plan.apiPrice);

    if (
      !Number.isFinite(basePrice) ||
      basePrice <= 0 ||
      !Number.isFinite(providerCost) ||
      providerCost < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid pricing configuration.",
        },
        { status: 500 }
      );
    }

    // ==========================================================
    // 7. LOAD ADMIN SERVICE FEE
    // ==========================================================
    //
    // This now comes from:
    //
    // SERVICE_FEE_PERCENT
    //
    // It is NOT hardcoded to 5% here.
    //
    // The helper handles the fallback value if no setting
    // exists yet.

    const serviceFeePercentage =
      await getServiceFeePercent();

    // ==========================================================
    // 8. CALCULATE SERVICE FEE
    // ==========================================================

    const pricing =
      calculateServiceFee(
        basePrice,
        serviceFeePercentage
      );

    const serviceFee =
      pricing.serviceFee;

    const amount =
      pricing.totalAmount;

    // ==========================================================
    // 9. LOAD REFERRAL COMMISSION
    // ==========================================================

    const referralPercentage =
      await getReferralCommissionPercentage();

    // ==========================================================
    // 10. GROSS PROFIT
    // ==========================================================

    const grossProfit =
      Number(
        (
          amount -
          providerCost
        ).toFixed(2)
      );

    // ==========================================================
    // 11. REFERRAL COMMISSION
    // ==========================================================

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

    // ==========================================================
    // 12. FINAL BUSINESS PROFIT
    // ==========================================================

    const profit =
      Number(
        (
          grossProfit -
          referralCommission
        ).toFixed(2)
      );

    console.log(
      "DATA FINANCIAL BREAKDOWN:",
      {
        basePrice,
        serviceFeePercentage,
        serviceFee,
        customerPayment: amount,
        providerCost,
        grossProfit,
        referralPercentage,
        referralCommission,
        businessProfit: profit,
        referrer:
          user.referredBy?.id ?? null,
      }
    );

    // ==========================================================
    // 13. WALLET CHECK
    // ==========================================================

    const walletBalance =
      Number(user.walletBalance);

    if (
      !Number.isFinite(walletBalance) ||
      walletBalance < amount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insufficient wallet balance.",
          balance: walletBalance,
          required: amount,
          basePrice,
          serviceFeePercentage,
          serviceFee,
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // 14. TRANSACTION REFERENCE
    // ==========================================================

    const reference =
      `DATA-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // ==========================================================
    // 15. CREATE PENDING TRANSACTION
    // ==========================================================

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,

          type: "DATA",

          amount,

          reference,

          status: "PENDING",

          provider: "CheapDataHub",

          cost: providerCost,

          profit,

          description:
            `${plan.provider.toUpperCase()} ${plan.size} ${plan.duration} for ${cleanedPhone}`,
        },
      });

    transactionId =
      transaction.id;

    // ==========================================================
    // 16. PROVIDER REQUEST
    // ==========================================================

    const providerBody = {
      bundle_id: bundleId,
      phone_number: cleanedPhone,
    };

    console.log(
      "======================================"
    );

    console.log(
      "CHEAPDATAHUB DATA REQUEST:",
      {
        bundle_id: bundleId,
        phone_number: cleanedPhone,
        basePrice,
        serviceFeePercentage,
        serviceFee,
        amount,
        providerCost,
        grossProfit,
        referralPercentage,
        referralCommission,
        businessProfit: profit,
      }
    );

    console.log(
      "======================================"
    );

    const providerResponse =
      await fetch(
        CHEAPDATAHUB_DATA_URL,
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
              providerBody
            ),

          cache: "no-store",
        }
      );

    // ==========================================================
    // 17. PROVIDER RESPONSE
    // ==========================================================

    const responseText =
      await providerResponse.text();

    console.log(
      "CHEAPDATAHUB DATA STATUS:",
      providerResponse.status
    );

    console.log(
      "CHEAPDATAHUB DATA RESPONSE:",
      responseText
    );

    console.log(
      "======================================"
    );

    let providerResult: any;

    try {
      providerResult =
        responseText.trim()
          ? JSON.parse(responseText)
          : null;
    } catch {
      providerResult = null;
    }

    // ==========================================================
    // 18. INVALID PROVIDER RESPONSE
    // ==========================================================

    if (!providerResult) {
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          status: "FAILED",
          cost: 0,
          profit: 0,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "CheapDataHub returned an invalid response.",
          providerStatus:
            providerResponse.status,
        },
        { status: 502 }
      );
    }

    // ==========================================================
    // 19. PROVIDER SUCCESS
    // ==========================================================

    const providerSuccess =
      providerResult.success === true ||
      providerResult.status === true ||
      providerResult.status === "true" ||
      providerResult.status === "success" ||
      providerResult.status === "successful";

    if (
      !providerResponse.ok ||
      !providerSuccess
    ) {
      console.error(
        "CHEAPDATAHUB DATA FAILED:",
        {
          httpStatus:
            providerResponse.status,

          response:
            providerResult,

          request:
            providerBody,
        }
      );

      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          status: "FAILED",
          cost: 0,
          profit: 0,
        },
      });

      return NextResponse.json(
        {
          success: false,

          message:
            providerResult.message ||
            providerResult.error ||
            "Data purchase failed.",

          providerStatus:
            providerResponse.status,

          providerResponse:
            providerResult,
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // 20. COMPLETE FINANCIAL TRANSACTION
    // ==========================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // ----------------------------------------------------
          // GET CURRENT USER BALANCE
          // ----------------------------------------------------

          const currentUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
            });

          if (!currentUser) {
            throw new Error(
              "User not found."
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
            currentBalance < amount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // ----------------------------------------------------
          // BUSINESS WALLET
          // ----------------------------------------------------

          let businessWallet =
            await tx.businessWallet.findUnique(
              {
                where: {
                  name:
                    "Brainfriend Global Tech",
                },
              }
            );

          if (!businessWallet) {
            businessWallet =
              await tx.businessWallet.create({
                data: {
                  name:
                    "Brainfriend Global Tech",

                  balance: 0,

                  totalRevenue: 0,

                  totalCost: 0,

                  totalProfit: 0,

                  withdrawnProfit: 0,

                  availableProfit: 0,
                },
              });
          }

          // ----------------------------------------------------
          // NEW USER BALANCE
          // ----------------------------------------------------

          const newUserBalance =
            Number(
              (
                currentBalance -
                amount
              ).toFixed(2)
            );

          // ----------------------------------------------------
          // BUSINESS BALANCE
          // ----------------------------------------------------
          //
          // Only actual business profit is added to the
          // withdrawable business balance.
          //
          // Customer payment:
          //     basePrice + serviceFee
          //
          // Provider cost:
          //     providerCost
          //
          // Referral:
          //     referralCommission
          //
          // Final business profit:
          //     grossProfit - referralCommission
          //

          const newBusinessBalance =
            Number(
              (
                Number(
                  businessWallet.balance
                ) +
                profit
              ).toFixed(2)
            );

          const newTotalRevenue =
            Number(
              (
                Number(
                  businessWallet.totalRevenue
                ) +
                amount
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
                profit
              ).toFixed(2)
            );

          const newAvailableProfit =
            Number(
              (
                Number(
                  businessWallet.availableProfit
                ) +
                profit
              ).toFixed(2)
            );

          // ----------------------------------------------------
          // UPDATE USER WALLET
          // ----------------------------------------------------

          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              walletBalance:
                newUserBalance,
            },
          });

          // ----------------------------------------------------
          // UPDATE BUSINESS WALLET
          // ----------------------------------------------------

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

          // ----------------------------------------------------
          // BUSINESS REVENUE
          // ----------------------------------------------------

          await tx.businessRevenue.create({
            data: {
              transactionId:
                transaction.id,

              type: "DATA",

              provider:
                "CheapDataHub",

              amount,

              cost:
                providerCost,

              profit,

              reference,

              description:
                `${plan.provider.toUpperCase()} ${plan.size} ${plan.duration} for ${cleanedPhone} + ${serviceFeePercentage}% service fee`,

              businessWalletId:
                businessWallet.id,
            },
          });

          // ----------------------------------------------------
          // PAY REFERRER
          // ----------------------------------------------------

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
                  "DATA",

                status:
                  "SUCCESS",

                description:
                  `Referral earning from ${user.fullName}'s ${plan.provider.toUpperCase()} ${plan.size} data purchase of ₦${basePrice}`,

                reference:
                  `REF-${reference}`,
              },
            });
          }

          // ----------------------------------------------------
          // COMPLETE TRANSACTION
          // ----------------------------------------------------

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status:
                "SUCCESS",

              cost:
                providerCost,

              profit,
            },
          });

          // ----------------------------------------------------
          // UPDATED BALANCES
          // ----------------------------------------------------

          const updatedUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
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

            grossProfit,

            referralCommission,

            profit,
          };
        }
      );

    // ==========================================================
    // 21. SUCCESS RESPONSE
    // ==========================================================

    return NextResponse.json({
      success: true,

      message:
        providerResult.message ||
        "Data purchase successful.",

      reference,

      providerReference:
        providerResult.reference ||
        providerResult.transaction_id ||
        providerResult.transactionId ||
        null,

      bundle_id:
        bundleId,

      phone_number:
        cleanedPhone,

      provider:
        plan.provider,

      size:
        plan.size,

      duration:
        plan.duration,

      // --------------------------------------------------------
      // PRICING
      // --------------------------------------------------------

      basePrice,

      serviceFeePercentage,

      serviceFee,

      amount,

      // --------------------------------------------------------
      // PROVIDER COST
      // --------------------------------------------------------

      cost:
        providerCost,

      // --------------------------------------------------------
      // PROFIT
      // --------------------------------------------------------

      grossProfit:
        result.grossProfit,

      referralPercentage,

      referralCommission:
        result.referralCommission,

      profit:
        result.profit,

      // --------------------------------------------------------
      // BALANCES
      // --------------------------------------------------------

      walletBalance:
        result.walletBalance,

      referralBalance:
        result.referralBalance,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    // ==========================================================
    // 22. ERROR HANDLING
    // ==========================================================

    console.error(
      "DATA PURCHASE ERROR:",
      error
    );

    if (transactionId) {
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
      } catch (updateError) {
        console.error(
          "FAILED TO UPDATE DATA TRANSACTION:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Data purchase failed.",
      },
      {
        status: 500,
      }
    );
  }
}

