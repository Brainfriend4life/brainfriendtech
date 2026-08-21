
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CHEAPDATAHUB_DATA_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/data/purchase/";

/*
 * DEFAULT PLATFORM FEE
 *
 * This is only used when no SERVICE_FEE_PERCENT
 * exists in the database.
 *
 * Example:
 * 5 = 5%
 * 7.5 = 7.5%
 * 10 = 10%
 */
const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;

const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";

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

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================

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

    // ============================================================
    // REQUEST BODY
    // ============================================================

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

    // ============================================================
    // PHONE NUMBER
    // ============================================================

    const cleanedPhone = String(phoneNumber || "")
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

    // ============================================================
    // USER
    // ============================================================

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
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

    // ============================================================
    // API KEY
    // ============================================================

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

    // ============================================================
    // BASE PRICING
    // ============================================================

    const basePrice = Number(
      plan.resellerPrice
    );

    const providerCost = Number(
      plan.apiPrice
    );

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

    // ============================================================
    // LOAD GLOBAL SERVICE FEE
    // ============================================================
    //
    // IMPORTANT:
    //
    // Your admin service-fee page saves:
    //
    // SERVICE_FEE_PERCENT
    //
    // Therefore this route MUST read the same key.
    //
    // This makes the percentage in:
    //
    // /dashboard/admin/service-fees
    //
    // automatically affect data purchases.
    //
    // Example:
    //
    // base price = ₦1,000
    // fee = 5%
    // fee amount = ₦50
    // customer pays = ₦1,050
    //
    // If you change the admin setting to 10%:
    //
    // base price = ₦1,000
    // fee = ₦100
    // customer pays = ₦1,100
    // ============================================================

    let serviceFeePercentage =
      DEFAULT_SERVICE_FEE_PERCENTAGE;

    try {
      const setting =
        await prisma.systemSetting.findUnique({
          where: {
            key: SERVICE_FEE_SETTING_KEY,
          },
        });

      if (setting) {
        const parsedFee = Number(
          setting.value
        );

        if (
          Number.isFinite(parsedFee) &&
          parsedFee >= 0 &&
          parsedFee <= 100
        ) {
          serviceFeePercentage =
            parsedFee;
        }
      }
    } catch (settingError) {
      console.error(
        "DATA SERVICE FEE SETTING ERROR:",
        settingError
      );

      /*
       * If the setting cannot be loaded,
       * keep using the safe default.
       */
    }

    // ============================================================
    // CALCULATE CUSTOMER PRICE
    // ============================================================

    const serviceFee = Number(
      (
        basePrice *
        (serviceFeePercentage / 100)
      ).toFixed(2)
    );

    const amount = Number(
      (
        basePrice +
        serviceFee
      ).toFixed(2)
    );

    /*
     * Total profit is the customer payment
     * minus the actual provider cost.
     */
    const profit = Number(
      (
        amount -
        providerCost
      ).toFixed(2)
    );

    // ============================================================
    // WALLET CHECK
    // ============================================================

    const walletBalance = Number(
      user.walletBalance
    );

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
        },
        { status: 400 }
      );
    }

    // ============================================================
    // TRANSACTION REFERENCE
    // ============================================================

    const reference =
      `DATA-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // ============================================================
    // CREATE PENDING TRANSACTION
    // ============================================================

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

    // ============================================================
    // PROVIDER REQUEST
    // ============================================================

    const providerBody = {
      bundle_id: bundleId,
      phone_number: cleanedPhone,
    };

    const providerResponse =
      await fetch(
        CHEAPDATAHUB_DATA_URL,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${apiKey}`,
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

    // ============================================================
    // PROVIDER RESPONSE
    // ============================================================

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

    let providerResult: any;

    try {
      providerResult =
        responseText.trim()
          ? JSON.parse(
              responseText
            )
          : null;
    } catch {
      providerResult = null;
    }

    // ============================================================
    // INVALID PROVIDER RESPONSE
    // ============================================================

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
        },
        { status: 502 }
      );
    }

    // ============================================================
    // PROVIDER SUCCESS
    // ============================================================

    const providerSuccess =
      providerResult.success ===
        true ||
      providerResult.status ===
        true ||
      providerResult.status ===
        "true" ||
      providerResult.status ===
        "success";

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

    // ============================================================
    // COMPLETE FINANCIAL TRANSACTION
    // ============================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // ------------------------------------------------------
          // GET CURRENT USER BALANCE AGAIN
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // BUSINESS WALLET
          // ------------------------------------------------------

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
              await tx.businessWallet.create(
                {
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
                }
              );
          }

          // ------------------------------------------------------
          // NEW BALANCES
          // ------------------------------------------------------

          const newUserBalance =
            Number(
              (
                currentBalance -
                amount
              ).toFixed(2)
            );

          const newBusinessBalance =
            Number(
              (
                Number(
                  businessWallet.balance
                ) +
                amount
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

          // ------------------------------------------------------
          // UPDATE USER WALLET
          // ------------------------------------------------------

          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              walletBalance:
                newUserBalance,
            },
          });

          // ------------------------------------------------------
          // UPDATE BUSINESS WALLET
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // BUSINESS REVENUE
          // ------------------------------------------------------

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
                `${plan.provider.toUpperCase()} ${plan.size} ${plan.duration} for ${cleanedPhone}`,

              businessWalletId:
                businessWallet.id,
            },
          });

          // ------------------------------------------------------
          // COMPLETE TRANSACTION
          // ------------------------------------------------------

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

          return {
            walletBalance:
              newUserBalance,

            businessBalance:
              newBusinessBalance,

            profit,
          };
        }
      );

    // ============================================================
    // SUCCESS RESPONSE
    // ============================================================

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

      /*
       * Pricing information
       */

      basePrice,

      serviceFeePercentage,

      serviceFee,

      amount,

      cost:
        providerCost,

      profit:
        result.profit,

      walletBalance:
        result.walletBalance,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    // ============================================================
    // ERROR HANDLING
    // ============================================================

    console.error(
      "DATA PURCHASE ERROR:",
      error
    );

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
      { status: 500 }
    );
  }
}

