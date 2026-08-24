import {
  NextRequest,
  NextResponse,
} from "next/server";

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

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    // ============================================================
    // 1. AUTHENTICATION
    // ============================================================

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

    // ============================================================
    // 2. REQUEST BODY
    // ============================================================

    const body = await request.json();

    const {
      discoId,
      meterNumber,
      amount,
      meterType,
      phone,
    } = body;

    const numericDiscoId = Number(discoId);
    const numericAmount = Number(amount);

    const cleanedMeter = String(
      meterNumber || ""
    ).replace(/\s+/g, "");

    const cleanedPhone = String(
      phone || ""
    )
      .trim()
      .replace(/\s+/g, "")
      .replace(/^\+234/, "0")
      .replace(/^234/, "0");

    const normalizedMeterType = String(
      meterType || "PREPAID"
    )
      .trim()
      .toUpperCase();

    // ============================================================
    // 3. VALIDATION
    // ============================================================

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

    if (!cleanedMeter) {
      return NextResponse.json(
        {
          success: false,
          error: "Meter number is required.",
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

    // ============================================================
    // 4. FIND USER + REFERRER
    // ============================================================

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
            referralBalance: true,
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

    // ============================================================
    // 5. SERVICE FEE
    // ============================================================

    const serviceFeePercent =
      await getServiceFeePercent();

    const pricing = calculateServiceFee(
      numericAmount,
      serviceFeePercent
    );

    const providerCost = pricing.providerCost;
    const serviceFee = pricing.serviceFee;
    const totalAmount = pricing.totalAmount;

    // ============================================================
    // 6. GROSS PROFIT
    // ============================================================

    const grossProfit = Number(
      (
        totalAmount -
        providerCost
      ).toFixed(2)
    );

    // ============================================================
    // 7. REFERRAL COMMISSION SETTING
    // ============================================================

    let referralPercentage =
      DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;

    try {
      const referralSetting =
        await prisma.systemSetting.findUnique({
          where: {
            key:
              REFERRAL_COMMISSION_SETTING_KEY,
          },
        });

      if (referralSetting) {
        const parsedReferral = Number(
          referralSetting.value
        );

        if (
          Number.isFinite(parsedReferral) &&
          parsedReferral >= 0 &&
          parsedReferral <= 100
        ) {
          referralPercentage = parsedReferral;
        }
      }
    } catch (error) {
      console.error(
        "ELECTRICITY REFERRAL SETTING ERROR:",
        error
      );
    }

    // ============================================================
    // 8. REFERRAL COMMISSION
    // ============================================================

    let referralCommission = 0;

    if (
      user.referredBy &&
      grossProfit > 0 &&
      referralPercentage > 0
    ) {
      const calculatedCommission = Number(
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

    // ============================================================
    // 9. FINAL BUSINESS PROFIT
    // ============================================================

    const profit = Number(
      (
        grossProfit -
        referralCommission
      ).toFixed(2)
    );

    console.log(
      "ELECTRICITY FINANCIAL BREAKDOWN:",
      {
        providerAmount: numericAmount,
        serviceFeePercent,
        serviceFee,
        totalAmount,
        providerCost,
        grossProfit,
        referralPercentage,
        referralCommission,
        businessProfit: profit,
        referrer:
          user.referredBy?.id ?? null,
      }
    );

    // ============================================================
    // 10. WALLET CHECK
    // ============================================================

    const walletBalance =
      Number(user.walletBalance);

    if (
      !Number.isFinite(walletBalance) ||
      walletBalance < totalAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Insufficient wallet balance.",
          balance: walletBalance,
          required: totalAmount,
          providerAmount: numericAmount,
          providerCost,
          serviceFee,
          serviceFeePercent,
          totalAmount,
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 11. API KEY
    // ============================================================

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

    // ============================================================
    // 12. TRANSACTION REFERENCE
    // ============================================================

    const reference =
      generateReference();

    // ============================================================
    // 13. CREATE PENDING TRANSACTION
    // ============================================================

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,

          type: "ELECTRICITY",

          amount: totalAmount,

          description:
            `Electricity payment of ₦${numericAmount} + ${serviceFeePercent}% service fee for meter ${cleanedMeter}`,

          status: "PENDING",

          reference,

          provider:
            "CheapDataHub",

          cost: providerCost,

          profit,

          isTest: false,
        },
      });

    transactionId = transaction.id;

    // ============================================================
    // 14. PROVIDER REQUEST
    // ============================================================

    const providerBody = {
      disco_id: numericDiscoId,

      meter_number: cleanedMeter,

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
      "REQUEST:",
      providerBody
    );

    console.log(
      "SERVICE FEE PERCENT:",
      serviceFeePercent
    );

    console.log(
      "SERVICE FEE:",
      serviceFee
    );

    console.log(
      "PROVIDER COST:",
      providerCost
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
      profit
    );

    console.log(
      "=========================================="
    );

    // ============================================================
    // 15. CALL CHEAPDATAHUB
    // ============================================================

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

    // ============================================================
    // 16. PROVIDER RESPONSE
    // ============================================================

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
    } catch {
      providerResult = null;
    }

    // ============================================================
    // 17. INVALID PROVIDER RESPONSE
    // ============================================================

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
            responseText.substring(
              0,
              500
            ),
        },
        { status: 502 }
      );
    }

    // ============================================================
    // 18. PROVIDER SUCCESS
    // ============================================================

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

    // ============================================================
    // 19. PROVIDER DATA
    // ============================================================

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

    // ============================================================
    // 20. ATOMIC ACCOUNTING
    // ============================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // ------------------------------------------------------
          // FRESH USER
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // ATOMIC WALLET DEDUCTION
          // ------------------------------------------------------

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

          if (walletDebit.count !== 1) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // ------------------------------------------------------
          // BUSINESS WALLET
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // BUSINESS WALLET VALUES
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // UPDATE USER
          // ------------------------------------------------------

          await tx.user.update({
            where: {
              id: freshUser.id,
            },

            data: {
              walletBalance: {
                decrement: 0,
              },
            },
          });

          // ------------------------------------------------------
          // UPDATE TRANSACTION
          // ------------------------------------------------------

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
                `Electricity payment of ₦${numericAmount} + ${serviceFeePercent}% service fee for meter ${cleanedMeter}`,
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
                `Electricity ₦${numericAmount} for meter ${cleanedMeter} + ${serviceFeePercent}% service fee`,

              businessWalletId:
                businessWallet.id,
            },
          });

          // ------------------------------------------------------
          // PAY REFERRER
          // ------------------------------------------------------

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
                  `Referral earning from ${freshUser.fullName}'s electricity payment of ₦${numericAmount}`,

                reference:
                  `REF-${reference}`,
              },
            });
          }

          // ------------------------------------------------------
          // FINAL USER BALANCES
          // ------------------------------------------------------

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

    // ============================================================
    // 21. SUCCESS RESPONSE
    // ============================================================

    return NextResponse.json({
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

      providerAmount:
        numericAmount,

      serviceFeePercent,

      serviceFee,

      amount:
        totalAmount,

      totalAmount,

      providerCost,

      grossProfit:
        result.grossProfit,

      referralPercentage,

      referralCommission:
        result.referralCommission,

      profit:
        result.profit,

      walletBalance:
        result.walletBalance,

      referralBalance:
        result.referralBalance,

      businessRevenue:
        totalAmount,

      businessCost:
        providerCost,

      businessProfit:
        result.profit,

      token,

      units,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    // ============================================================
    // 22. ERROR HANDLING
    // ============================================================

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