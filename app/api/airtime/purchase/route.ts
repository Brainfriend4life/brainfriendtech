import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CHEAPDATAHUB_API_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/airtime/purchase/";

const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_AIRTIME";
const REFERRAL_COMMISSION_SETTING_KEY =
  "REFERRAL_COMMISSION_AIRTIME";

const DEFAULT_SERVICE_FEE_PERCENTAGE = 0;
const DEFAULT_REFERRAL_COMMISSION_PERCENTAGE = 1;

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;
  let userId: string | null = null;
  let chargedAmount = 0;

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

    userId = session.user.id;

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
      numericAmount < 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum airtime purchase is ₦100.",
        },
        { status: 400 }
      );
    }

    if (numericAmount > 50000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maximum airtime purchase is ₦50,000.",
        },
        { status: 400 }
      );
    }

    const airtimeAmount = Math.round(numericAmount);

    if (airtimeAmount <= 0) {
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
      .trim()
      .replace(/\s+/g, "")
      .replace(/^\+234/, "0")
      .replace(/^234/, "0");

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
    // 5. FIND USER + REFERRER
    // =====================================================

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
    // 7. CHECK API KEY
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
    // 8. GET SERVICE FEE
    // =====================================================

    const feeSetting =
      await prisma.systemSetting.findUnique({
        where: {
          key: SERVICE_FEE_SETTING_KEY,
        },
      });

    let feePercentage =
      feeSetting?.value !== undefined
        ? Number(feeSetting.value)
        : DEFAULT_SERVICE_FEE_PERCENTAGE;

    if (
      !Number.isFinite(feePercentage) ||
      feePercentage < 0
    ) {
      feePercentage =
        DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    if (feePercentage > 100) {
      feePercentage = 100;
    }

    // =====================================================
    // 9. GET REFERRAL COMMISSION
    // =====================================================

    const referralSetting =
      await prisma.systemSetting.findUnique({
        where: {
          key: REFERRAL_COMMISSION_SETTING_KEY,
        },
      });

    let referralPercentage =
      referralSetting?.value !== undefined
        ? Number(referralSetting.value)
        : DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;

    if (
      !Number.isFinite(referralPercentage) ||
      referralPercentage < 0
    ) {
      referralPercentage =
        DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;
    }

    if (referralPercentage > 100) {
      referralPercentage = 100;
    }

    console.log(
      "AIRTIME SERVICE FEE:",
      `${feePercentage}%`
    );

    console.log(
      "AIRTIME REFERRAL COMMISSION:",
      `${referralPercentage}%`
    );

    // =====================================================
    // 10. CALCULATE CUSTOMER CHARGE
    // =====================================================

    const serviceFee =
      airtimeAmount * (feePercentage / 100);

    const totalAmount =
      Math.round(
        (airtimeAmount + serviceFee) * 100
      ) / 100;

    chargedAmount = totalAmount;

    const expectedProfit =
      Math.round(
        (totalAmount - airtimeAmount) * 100
      ) / 100;

    // =====================================================
    // 11. CREATE PENDING TRANSACTION
    // =====================================================

    const reference =
      `AIRTIME-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "AIRTIME",
          amount: totalAmount,
          description:
            `Airtime purchase of ₦${airtimeAmount} for ${cleanedPhone}`,
          status: "PENDING",
          reference,
          provider: "CheapDataHub",
          cost: airtimeAmount,
          profit: expectedProfit,
        },
      });

    transactionId = transaction.id;

    // =====================================================
    // 12. ATOMICALLY DEDUCT USER WALLET
    // =====================================================

    const walletDebit =
      await prisma.user.updateMany({
        where: {
          id: user.id,
          status: "ACTIVE",
          walletBalance: {
            gte: totalAmount,
          },
        },
        data: {
          walletBalance: {
            decrement: totalAmount,
          },
        },
      });

    if (walletDebit.count !== 1) {
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
          error: "Insufficient wallet balance.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 13. CALL CHEAPDATAHUB
    // =====================================================

    const providerRequestBody = {
      provider_id: Number(providerId),
      phone_number: cleanedPhone,
      amount: airtimeAmount,
    };

    console.log(
      "======================================"
    );

    console.log(
      "CHEAPDATAHUB AIRTIME REQUEST:",
      {
        provider_id: Number(providerId),
        phone_number: cleanedPhone,
        amount: airtimeAmount,
        serviceFeePercentage: feePercentage,
        totalCustomerCharge: totalAmount,
      }
    );

    const providerResponse =
      await fetch(
        CHEAPDATAHUB_API_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(
            providerRequestBody
          ),
          cache: "no-store",
        }
      );

    const responseText =
      await providerResponse.text();

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
    // 14. PARSE PROVIDER RESPONSE
    // =====================================================

    let providerResult: any = null;

    try {
      providerResult = responseText.trim()
        ? JSON.parse(responseText)
        : null;
    } catch {
      providerResult = null;
    }

    // =====================================================
    // 15. INVALID PROVIDER RESPONSE
    // =====================================================

    if (!providerResult) {
      await prisma.$transaction([
        prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            walletBalance: {
              increment: totalAmount,
            },
          },
        }),

        prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            status: "FAILED",
            cost: 0,
            profit: 0,
          },
        }),
      ]);

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
    // 16. DETERMINE PROVIDER SUCCESS
    // =====================================================

    const providerStatus =
      providerResult.status;

    const providerSuccess =
      providerResult.success === true ||
      providerStatus === true ||
      providerStatus === "true" ||
      providerStatus === "success" ||
      providerStatus === "successful";

    // =====================================================
    // 17. PROVIDER FAILED
    // =====================================================

    if (
      !providerResponse.ok ||
      !providerSuccess
    ) {
      console.error(
        "CHEAPDATAHUB AIRTIME FAILED:",
        {
          httpStatus:
            providerResponse.status,
          response: providerResult,
          request: providerRequestBody,
        }
      );

      await prisma.$transaction([
        prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            walletBalance: {
              increment: totalAmount,
            },
          },
        }),

        prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            status: "FAILED",
            cost: 0,
            profit: 0,
          },
        }),
      ]);

      return NextResponse.json(
        {
          success: false,
          error:
            providerResult.message ||
            providerResult.error ||
            "Airtime purchase failed.",
          providerResponse: providerResult,
          providerStatus:
            providerResponse.status,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 18. PROVIDER SUCCESS
    // =====================================================

    const actualCost = airtimeAmount;

    const grossProfit =
      Math.round(
        (totalAmount - actualCost) * 100
      ) / 100;

    // =====================================================
    // 19. CALCULATE REFERRAL COMMISSION
    // =====================================================

    let referralCommission = 0;

    if (
      user.referredBy &&
      grossProfit > 0 &&
      referralPercentage > 0
    ) {
      const calculatedCommission =
        Math.round(
          (
            airtimeAmount *
            (referralPercentage / 100)
          ) * 100
        ) / 100;

      // Never allow referral commission
      // to exceed the business profit.
      referralCommission =
        Math.min(
          calculatedCommission,
          grossProfit
        );
    }

    // Business profit after referral commission.
    const actualProfit =
      Math.round(
        (grossProfit - referralCommission) * 100
      ) / 100;

    console.log(
      "AIRTIME REFERRAL:",
      {
        referredUser: user.id,
        referrer:
          user.referredBy?.id ?? null,
        grossProfit,
        referralPercentage,
        referralCommission,
        businessProfit: actualProfit,
      }
    );

    // =====================================================
    // 20. BUSINESS WALLET + REFERRAL
    // =====================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          // -----------------------------------------------
          // GET / CREATE BUSINESS WALLET
          // -----------------------------------------------

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
          // BUSINESS WALLET VALUES
          // -----------------------------------------------

          const newBusinessBalance =
            Number(businessWallet.balance) +
            actualProfit;

          const newTotalRevenue =
            Number(
              businessWallet.totalRevenue
            ) + totalAmount;

          const newTotalCost =
            Number(
              businessWallet.totalCost
            ) + actualCost;

          const newTotalProfit =
            Number(
              businessWallet.totalProfit
            ) + actualProfit;

          const newAvailableProfit =
            Number(
              businessWallet.availableProfit
            ) + actualProfit;

          // -----------------------------------------------
          // UPDATE TRANSACTION
          // -----------------------------------------------

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },
            data: {
              status: "SUCCESS",
              cost: actualCost,
              profit: actualProfit,
              description:
                `Airtime purchase of ₦${airtimeAmount} + ${feePercentage}% service fee for ${cleanedPhone}`,
            },
          });

          // -----------------------------------------------
          // UPDATE BUSINESS WALLET
          // -----------------------------------------------

          await tx.businessWallet.update({
            where: {
              id: businessWallet.id,
            },
            data: {
              balance: newBusinessBalance,
              totalRevenue: newTotalRevenue,
              totalCost: newTotalCost,
              totalProfit: newTotalProfit,
              availableProfit:
                newAvailableProfit,
            },
          });

          // -----------------------------------------------
          // CREATE BUSINESS REVENUE
          // -----------------------------------------------

          await tx.businessRevenue.create({
            data: {
              transactionId: transaction.id,
              type: "AIRTIME",
              provider: "CheapDataHub",
              amount: totalAmount,
              cost: actualCost,
              profit: actualProfit,
              reference,
              description:
                `Airtime ₦${airtimeAmount} for ${cleanedPhone} + ${feePercentage}% service fee`,
              businessWalletId:
                businessWallet.id,
            },
          });

          // -----------------------------------------------
          // PAY REFERRER
          // -----------------------------------------------

          if (
            user.referredBy &&
            referralCommission > 0
          ) {
            await tx.user.update({
              where: {
                id: user.referredBy.id,
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
                  airtimeAmount,

                type: "AIRTIME",

                status: "SUCCESS",

                description:
                  `Referral earning from ${user.fullName}'s airtime purchase of ₦${airtimeAmount}`,

                reference:
                  `REF-${reference}`,
              },
            });
          }

          // -----------------------------------------------
          // GET UPDATED USER BALANCE
          // -----------------------------------------------

          const updatedUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
              select: {
                walletBalance: true,
                referralBalance: true,
              },
            });

          return {
            walletBalance:
              Number(
                updatedUser?.walletBalance ?? 0
              ),

            referralBalance:
              Number(
                updatedUser?.referralBalance ?? 0
              ),

            businessBalance:
              newBusinessBalance,

            grossProfit,

            referralCommission,

            profit: actualProfit,
          };
        }
      );

    // =====================================================
    // 21. SUCCESS RESPONSE
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

      phoneNumber: cleanedPhone,

      amount: airtimeAmount,

      serviceFee:
        Math.round(
          (totalAmount - airtimeAmount) * 100
        ) / 100,

      feePercentage,

      totalAmount,

      providerCost: actualCost,

      grossProfit:
        result.grossProfit,

      referralCommission:
        result.referralCommission,

      profit: result.profit,

      walletBalance:
        result.walletBalance,

      referralBalance:
        result.referralBalance,
    });
  } catch (error: any) {
    console.error(
      "AIRTIME PURCHASE ERROR:",
      error
    );

    // =====================================================
    // 22. ERROR RECOVERY
    // =====================================================

    if (transactionId) {
      try {
        const transaction =
          await prisma.transaction.findUnique({
            where: {
              id: transactionId,
            },
          });

        if (
          transaction &&
          transaction.status === "PENDING" &&
          userId &&
          chargedAmount > 0
        ) {
          await prisma.$transaction([
            prisma.user.update({
              where: {
                id: userId,
              },
              data: {
                walletBalance: {
                  increment: chargedAmount,
                },
              },
            }),

            prisma.transaction.update({
              where: {
                id: transactionId,
              },
              data: {
                status: "FAILED",
                cost: 0,
                profit: 0,
              },
            }),
          ]);
        }
      } catch (recoveryError) {
        console.error(
          "AIRTIME ERROR RECOVERY FAILED:",
          recoveryError
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