import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CHEAPDATAHUB_API_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/airtime/purchase/";

const SERVICE_FEE_SETTING_KEY = "AIRTIME_FEE_PERCENTAGE";
const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;

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

    // Airtime should be sent as a whole naira amount
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

    // Prevent an accidental unreasonable setting
    if (feePercentage > 100) {
      feePercentage = 100;
    }

    // =====================================================
    // 9. CALCULATE CUSTOMER CHARGE
    // =====================================================

    const serviceFee =
      airtimeAmount * (feePercentage / 100);

    const totalAmount =
      Math.round(
        (airtimeAmount + serviceFee) * 100
      ) / 100;

    chargedAmount = totalAmount;

    // Since CheapDataHub receives the airtime value
    // itself, the difference becomes business profit.
    const expectedProfit =
      Math.round(
        (totalAmount - airtimeAmount) * 100
      ) / 100;

    // =====================================================
    // 10. CREATE PENDING TRANSACTION
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

          // Amount is the TOTAL amount charged
          // to the customer.
          amount: totalAmount,

          description:
            `Airtime purchase of ₦${airtimeAmount} for ${cleanedPhone}`,

          status: "PENDING",

          reference,

          provider: "CheapDataHub",

          // CheapDataHub cost is the airtime value.
          cost: airtimeAmount,

          profit: expectedProfit,
        },
      });

    transactionId = transaction.id;

    // =====================================================
    // 11. ATOMICALLY RESERVE/DEDUCT USER WALLET
    // =====================================================
    //
    // This prevents two simultaneous purchases from
    // spending the same wallet balance.
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
    // 12. CALL CHEAPDATAHUB
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

          // IMPORTANT:
          // CheapDataHub receives the airtime value,
          // NOT the service fee.
          amount: airtimeAmount,
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
    // 13. PARSE PROVIDER RESPONSE
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
    // 14. HANDLE INVALID RESPONSE
    // =====================================================

    if (!providerResult) {
      // Refund customer because provider did not give
      // us a usable response.
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
    // 15. DETERMINE PROVIDER SUCCESS
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
    // 16. PROVIDER FAILED
    // =====================================================

    if (
      !providerResponse.ok ||
      !providerSuccess
    ) {
      // Refund the FULL amount charged to the user.
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
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 17. PROVIDER SUCCESS
    // =====================================================
    //
    // CheapDataHub documentation does NOT provide a
    // provider cost field for airtime.
    //
    // Therefore:
    //
    // Customer pays: airtime + service fee
    // CheapDataHub receives: airtime amount
    // Brainfriend profit: service fee
    // =====================================================

    const actualCost = airtimeAmount;

    const actualProfit =
      Math.round(
        (totalAmount - actualCost) * 100
      ) / 100;

    // =====================================================
    // 18. GET/CREATE BUSINESS WALLET
    // =====================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
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
          // BUSINESS WALLET
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
          // CREATE BUSINESS REVENUE
          // -----------------------------------------------

          await tx.businessRevenue.create({
            data: {
              transactionId:
                transaction.id,

              type: "AIRTIME",

              provider:
                "CheapDataHub",

              // Total money received from customer
              amount:
                totalAmount,

              // Actual provider cost
              cost:
                actualCost,

              // Service fee/profit
              profit:
                actualProfit,

              reference,

              description:
                `Airtime ₦${airtimeAmount} for ${cleanedPhone} + ${feePercentage}% service fee`,

              businessWalletId:
                businessWallet.id,
            },
          });

          const updatedUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },

              select: {
                walletBalance: true,
              },
            });

          return {
            walletBalance:
              Number(
                updatedUser?.walletBalance ?? 0
              ),

            businessBalance:
              newBusinessBalance,

            profit:
              actualProfit,
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

      // Airtime value
      amount:
        airtimeAmount,

      // Service fee
      serviceFee:

        Math.round(
          (totalAmount - airtimeAmount) * 100
        ) / 100,

      feePercentage,

      // What customer actually paid
      totalAmount,

      providerCost:
        actualCost,

      profit:
        result.profit,

      walletBalance:
        result.walletBalance,
    });
  } catch (error: any) {
    console.error(
      "AIRTIME PURCHASE ERROR:",
      error
    );

    // =====================================================
    // 20. ERROR RECOVERY
    // =====================================================

    if (transactionId) {
      try {
        const transaction =
          await prisma.transaction.findUnique({
            where: {
              id: transactionId,
            },
          });

        // If transaction is still pending, we need to
        // refund the user's wallet because we deducted
        // it before calling the provider.
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