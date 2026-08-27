import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getServiceFeePercent,
  calculateServiceFee,
} from "@/lib/service-fee";

const CHEAPDATAHUB_ELECTRICITY_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/electricity/purchase/";

const REFERRAL_COMMISSION_SETTING_KEY =
  "REFERRAL_COMMISSION_ELECTRICITY";

const DEFAULT_REFERRAL_COMMISSION_PERCENTAGE = 1;

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================
// GET - LOAD SERVICE FEE
// ============================================================

export async function GET() {
  try {
    const serviceFeePercentage =
      await getServiceFeePercent();

    return NextResponse.json(
      {
        success: true,
        percentage: serviceFeePercentage,
        serviceFeePercentage,
        serviceFeePercent:
          serviceFeePercentage,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "ELECTRICITY SERVICE FEE GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load electricity service fee.",
        percentage: null,
        serviceFeePercentage: null,
        serviceFeePercent: null,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
// ============================================================
// HELPERS
// ============================================================

function generateReference(): string {
  return `ELEC-${Date.now()}-${Math.random()
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

function normalizePhone(phone: unknown): string {
  return String(phone || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/^\+234/, "0")
    .replace(/^234/, "0");
}

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function getReferralCommissionPercent(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: REFERRAL_COMMISSION_SETTING_KEY,
      },
      select: {
        value: true,
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
      "ELECTRICITY REFERRAL COMMISSION SETTING ERROR:",
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
    // ========================================================
    // 1. AUTHENTICATION
    // ========================================================

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

    // ========================================================
    // 2. REQUEST BODY
    // ========================================================

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const {
      discoId,
      meterNumber,
      amount,
      meterType,
      phone,
      transactionPin,
    } = body;

    const numericDiscoId = Number(discoId);
    const numericAmount = Number(amount);

    const cleanedMeter = String(
      meterNumber || ""
    ).replace(/\s+/g, "");

    const cleanedPhone = normalizePhone(phone);

    const normalizedMeterType = String(
      meterType || "prepaid"
    )
      .trim()
      .toUpperCase();

    // ========================================================
    // 3. VALIDATION
    // ========================================================

    if (
      !Number.isInteger(numericDiscoId) ||
      numericDiscoId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid electricity provider.",
        },
        { status: 400 }
      );
    }

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

    if (!cleanedMeter) {
      return NextResponse.json(
        {
          success: false,
          error: "Meter number is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{6,20}$/.test(cleanedMeter)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid meter number.",
        },
        { status: 400 }
      );
    }

    if (!cleanedPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number is required.",
        },
        { status: 400 }
      );
    }

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

    if (
      !["PREPAID", "POSTPAID"].includes(
        normalizedMeterType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meter type must be PREPAID or POSTPAID.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 4. TRANSACTION PIN
    // ========================================================

    const pin = String(
      transactionPin || ""
    ).trim();

    if (!pin) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction PIN is required.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 5. FIND USER
    // ========================================================

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        referredBy: {
          select: {
            id: true,
            fullName: true,
            referralCode: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User account not found.",
        },
        { status: 404 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 6. VERIFY TRANSACTION PIN
    // ========================================================

    if (!user.transactionPinHash) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You have not created a transaction PIN yet.",
        },
        { status: 400 }
      );
    }

    const pinIsValid = await bcrypt.compare(
      pin,
      user.transactionPinHash
    );

    if (!pinIsValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid transaction PIN.",
        },
        { status: 401 }
      );
    }

    // ========================================================
    // 7. SERVICE FEE
    // ========================================================

    const serviceFeePercentage =
      await getServiceFeePercent();

    const pricing = calculateServiceFee(
      numericAmount,
      serviceFeePercentage
    );

    const providerCost = Number(
      pricing.providerCost.toFixed(2)
    );

    const serviceFee = Number(
      pricing.serviceFee.toFixed(2)
    );

    const totalAmount = Number(
      pricing.totalAmount.toFixed(2)
    );

    console.log(
      "=========================================="
    );

    console.log("ELECTRICITY PRICING");

    console.log(
      "ELECTRICITY AMOUNT:",
      numericAmount
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
      "PROVIDER COST:",
      providerCost
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // 8. WALLET BALANCE
    // ========================================================

    const walletBalance = Number(
      user.walletBalance
    );

    if (!Number.isFinite(walletBalance)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet balance.",
        },
        { status: 400 }
      );
    }

    if (walletBalance < totalAmount) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient wallet balance.",
          balance: walletBalance,
          required: totalAmount,
          providerAmount: numericAmount,
          providerCost,
          serviceFee,
          serviceFeePercentage,
          serviceFeePercent:
            serviceFeePercentage,
          totalAmount,
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 9. API KEY
    // ========================================================

    const apiKey =
      process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // 10. REFERRAL COMMISSION
    // ========================================================

    const referralPercentage =
      await getReferralCommissionPercent();

    // ========================================================
    // 11. PROFIT CALCULATION
    // ========================================================

    const grossProfit = Number(
      (
        totalAmount -
        providerCost
      ).toFixed(2)
    );

    let referralCommission = 0;

    if (
      user.referredBy &&
      grossProfit > 0 &&
      referralPercentage > 0
    ) {
      const calculatedCommission =
        Number(
          (
            numericAmount *
            (referralPercentage / 100)
          ).toFixed(2)
        );

      referralCommission = Math.min(
        calculatedCommission,
        grossProfit
      );
    }

    const profit = Number(
      (
        grossProfit -
        referralCommission
      ).toFixed(2)
    );

    // ========================================================
    // 12. REFERENCE
    // ========================================================

    const reference =
      generateReference();

    // ========================================================
    // 13. CREATE PENDING TRANSACTION
    // ========================================================

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,

          type: "ELECTRICITY",

          amount: totalAmount,

          description:
            `Electricity payment of ₦${formatAmount(
              numericAmount
            )} + ${serviceFeePercentage}% service fee for meter ${cleanedMeter}`,

          status: "PENDING",

          reference,

          provider: "CheapDataHub",

          cost: providerCost,

          profit,

          isTest: false,
        },
      });

    transactionId = transaction.id;

    // ========================================================
    // 14. CHEAPDATAHUB REQUEST
    // ========================================================

    const providerBody = {
      disco_id: numericDiscoId,

      meter_number: cleanedMeter,

      // Only the electricity amount goes to provider.
      // Service fee stays with Brainfriend Global Tech.
      amount: providerCost,

      meter_type:
        normalizedMeterType.toLowerCase(),

      phone: cleanedPhone,
    };

    console.log(
      "=========================================="
    );

    console.log(
      "CHEAPDATAHUB ELECTRICITY PURCHASE"
    );

    console.log(
      "REFERENCE:",
      reference
    );

    console.log(
      "REQUEST:",
      providerBody
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
      "PROVIDER COST:",
      providerCost
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
      profit
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // 15. CALL CHEAPDATAHUB
    // ========================================================

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

    // ========================================================
    // 16. READ PROVIDER RESPONSE SAFELY
    // ========================================================

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

    let providerResult: any = null;

    try {
      providerResult =
        responseText.trim()
          ? JSON.parse(responseText)
          : null;
    } catch (parseError) {
      console.error(
        "CHEAPDATAHUB RESPONSE JSON PARSE ERROR:",
        parseError
      );

      providerResult = null;
    }

    // ========================================================
    // 17. INVALID PROVIDER RESPONSE
    // ========================================================

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

          error:
            "CheapDataHub returned an invalid response.",

          providerStatus:
            providerResponse.status,

          providerResponse:
            responseText.substring(0, 500),
        },

        { status: 502 }
      );
    }

    // ========================================================
    // 18. CHECK PROVIDER SUCCESS
    // ========================================================

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

    // ========================================================
    // 19. EXTRACT ELECTRICITY RESULT
    // ========================================================

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
      providerResult?.units ??
      providerData?.units ??
      null;

    // ========================================================
    // 20. ATOMIC ACCOUNTING
    // ========================================================

    const accountingResult =
      await prisma.$transaction(
        async (tx) => {
          // --------------------------------------------------
          // FRESH USER
          // --------------------------------------------------

          const freshUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },

              include: {
                referredBy: {
                  select: {
                    id: true,
                    fullName: true,
                    referralCode: true,
                  },
                },
              },
            });

          if (!freshUser) {
            throw new Error(
              "User account could not be found."
            );
          }

          if (
            freshUser.status !==
            "ACTIVE"
          ) {
            throw new Error(
              "Your account is not active."
            );
          }

          // --------------------------------------------------
          // ATOMIC WALLET DEDUCTION
          // --------------------------------------------------

          const walletDebit =
            await tx.user.updateMany({
              where: {
                id: freshUser.id,

                status: "ACTIVE",

                walletBalance: {
                  gte: totalAmount,
                },
              },

              data: {
                walletBalance: {
                  decrement:
                    totalAmount,
                },
              },
            });

          if (
            walletDebit.count !== 1
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // --------------------------------------------------
          // BUSINESS WALLET
          // --------------------------------------------------

          const businessWallet =
            await tx.businessWallet.upsert({
              where: {
                name:
                  "Brainfriend Global Tech",
              },

              update: {},

              create: {
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

          // --------------------------------------------------
          // BUSINESS VALUES
          // --------------------------------------------------

          const newBusinessBalance =
            Number(
              (
                Number(
                  businessWallet.balance
                ) + profit
              ).toFixed(2)
            );

          const newTotalRevenue =
            Number(
              (
                Number(
                  businessWallet.totalRevenue
                ) + totalAmount
              ).toFixed(2)
            );

          const newTotalCost =
            Number(
              (
                Number(
                  businessWallet.totalCost
                ) + providerCost
              ).toFixed(2)
            );

          const newTotalProfit =
            Number(
              (
                Number(
                  businessWallet.totalProfit
                ) + profit
              ).toFixed(2)
            );

          const newAvailableProfit =
            Number(
              (
                Number(
                  businessWallet.availableProfit
                ) + profit
              ).toFixed(2)
            );

          // --------------------------------------------------
          // UPDATE TRANSACTION
          // --------------------------------------------------

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status: "SUCCESS",

              amount: totalAmount,

              cost: providerCost,

              profit,

              description:
                `Electricity payment of ₦${formatAmount(
                  numericAmount
                )} + ${serviceFeePercentage}% service fee for meter ${cleanedMeter}`,
            },
          });

          // --------------------------------------------------
          // UPDATE BUSINESS WALLET
          // --------------------------------------------------

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

          // --------------------------------------------------
          // BUSINESS REVENUE
          // --------------------------------------------------

          await tx.businessRevenue.create({
            data: {
              transactionId:
                transaction.id,

              type:
                "ELECTRICITY",

              provider:
                "CheapDataHub",

              amount:
                totalAmount,

              cost:
                providerCost,

              profit,

              reference,

              description:
                `Electricity ₦${formatAmount(
                  numericAmount
                )} for meter ${cleanedMeter} + ${serviceFeePercentage}% service fee`,

              businessWalletId:
                businessWallet.id,
            },
          });

          // --------------------------------------------------
          // REFERRAL COMMISSION
          // --------------------------------------------------

          if (
            freshUser.referredBy &&
            referralCommission > 0
          ) {
            await tx.user.update({
              where: {
                id:
                  freshUser.referredBy.id,
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
                  freshUser.referredBy.id,

                referredUserId:
                  freshUser.id,

                transactionId:
                  transaction.id,

                amount:
                  referralCommission,

                percentage:
                  referralPercentage,

                transactionAmount:
                  numericAmount,

                type:
                  "ELECTRICITY",

                status:
                  "SUCCESS",

                description:
                  `Referral earning from ${freshUser.fullName}'s electricity payment of ₦${formatAmount(
                    numericAmount
                  )}`,

                reference:
                  `REF-${reference}`,
              },
            });
          }

          // --------------------------------------------------
          // FINAL USER BALANCES
          // --------------------------------------------------

          const finalUser =
            await tx.user.findUnique({
              where: {
                id: freshUser.id,
              },

              select: {
                walletBalance: true,
                referralBalance: true,
              },
            });

          return {
            walletBalance:
              Number(
                finalUser?.walletBalance ??
                  0
              ),

            referralBalance:
              Number(
                finalUser?.referralBalance ??
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

            profit,
          };
        }
      );

    // ========================================================
    // 21. SUCCESS RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        message:
          providerResult?.message ||
          "Electricity payment successful.",

        reference,

        providerReference,

        discoId:
          numericDiscoId,

        meterNumber:
          cleanedMeter,

        meterType:
          normalizedMeterType,

        phone:
          cleanedPhone,

        // ====================================================
        // ELECTRICITY AMOUNT
        // ====================================================

        providerAmount:
          numericAmount,

        // ====================================================
        // SERVICE FEE
        // ====================================================

        serviceFeePercentage,

        // Backward-compatible property
        serviceFeePercent:
          serviceFeePercentage,

        serviceFee,

        // ====================================================
        // CUSTOMER TOTAL
        // ====================================================

        amount:
          totalAmount,

        totalAmount,

        // ====================================================
        // BUSINESS ACCOUNTING
        // ====================================================

        providerCost,

        grossProfit:
          accountingResult.grossProfit,

        referralPercentage,

        referralCommission:
          accountingResult.referralCommission,

        profit:
          accountingResult.profit,

        walletBalance:
          accountingResult.walletBalance,

        referralBalance:
          accountingResult.referralBalance,

        businessRevenue:
          totalAmount,

        businessCost:
          providerCost,

        businessProfit:
          accountingResult.profit,

        // ====================================================
        // ELECTRICITY RESULT
        // ====================================================

        token,

        units,

        providerResponse:
          providerResult,
      },

      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    // ========================================================
    // 22. ERROR HANDLING
    // ========================================================

    console.error(
      "ELECTRICITY PURCHASE ERROR:",
      error
    );

    if (transactionId) {
      try {
        const existingTransaction =
          await prisma.transaction.findUnique({
            where: {
              id: transactionId,
            },

            select: {
              status: true,
            },
          });

        if (
          existingTransaction?.status ===
          "PENDING"
        ) {
          await prisma.transaction.update({
            where: {
              id: transactionId,
            },

            data: {
              status: "FAILED",

              cost: 0,

              profit: 0,
            },
          });
        }
      } catch (updateError) {
        console.error(
          "FAILED TO UPDATE ELECTRICITY TRANSACTION:",
          updateError
        );
      }
    }

    const errorMessage =
      error?.message ||
      "Electricity purchase failed.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },

      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}