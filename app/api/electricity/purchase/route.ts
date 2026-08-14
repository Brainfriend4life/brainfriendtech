import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getServerSession,
} from "next-auth";

import {
  authOptions,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  getServiceFeePercent,
  calculateServiceFee,
} from "@/lib/service-fee";

const CHEAPDATAHUB_ELECTRICITY_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/electricity/purchase/";

function generateReference() {
  return `ELEC-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

export async function POST(
  request: NextRequest
) {
  let transactionId: string | null = null;

  try {
    const session =
      await getServerSession(authOptions);

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
    ).replace(/\s+/g, "");

    const normalizedMeterType =
      String(meterType || "PREPAID")
        .trim()
        .toUpperCase();

    if (
      !Number.isInteger(numericDiscoId) ||
      numericDiscoId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid electricity provider.",
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
          error:
            "Invalid electricity amount.",
        },
        { status: 400 }
      );
    }

    if (!cleanedMeter) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meter number is required.",
        },
        { status: 400 }
      );
    }

    if (!cleanedPhone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Phone number is required.",
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
          error:
            "User account not found.",
        },
        { status: 404 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your account is not active.",
        },
        { status: 403 }
      );
    }

    const serviceFeePercent =
      await getServiceFeePercent();

    const pricing =
      calculateServiceFee(
        numericAmount,
        serviceFeePercent
      );

    const providerCost =
      pricing.providerCost;

    const serviceFee =
      pricing.serviceFee;

    const totalAmount =
      pricing.totalAmount;

    const profit =
      pricing.profit;

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
          providerCost,
          serviceFee,
          serviceFeePercent,
          totalAmount,
        },
        { status: 400 }
      );
    }

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

    const reference =
      generateReference();

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "ELECTRICITY",
          amount: totalAmount,

          description:
            `Electricity payment for meter ${cleanedMeter}`,

          status: "PENDING",

          reference,

          provider:
            "CheapDataHub",

          cost: providerCost,
          profit,
          isTest: false,
        },
      });

    transactionId =
      transaction.id;

    const providerBody = {
      disco_id:
        numericDiscoId,

      meter_number:
        cleanedMeter,

      amount:
        providerCost,

      meter_type:
        normalizedMeterType.toLowerCase(),

      phone:
        cleanedPhone,
    };

    console.log(
      "CHEAPDATAHUB ELECTRICITY PURCHASE"
    );

    console.log(
      "BODY:",
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

          body:
            JSON.stringify(
              providerBody
            ),

          cache: "no-store",
        }
      );

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

          providerResponse:
            responseText.substring(
              0,
              500
            ),
        },
        { status: 502 }
      );
    }

    const providerSuccess =
      providerResult?.status === true ||
      providerResult?.status === "true" ||
      providerResult?.success === true ||
      providerResult?.status === "success";

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

    const result =
      await prisma.$transaction(
        async (tx) => {
          const freshUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
            });

          if (!freshUser) {
            throw new Error(
              "User account could not be found."
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
            freshBalance <
              totalAmount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          const businessWallet =
            await tx.businessWallet.upsert({
              where: {
                name:
                  "Brainfriend Tech",
              },

              update: {},

              create: {
                name:
                  "Brainfriend Tech",

                balance: 0,

                totalRevenue: 0,

                totalCost: 0,

                totalProfit: 0,

                withdrawnProfit: 0,

                availableProfit: 0,
              },
            });

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
                totalAmount
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

          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              walletBalance:
                newUserBalance,
            },
          });

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status: "SUCCESS",
              amount: totalAmount,
              cost: providerCost,
              profit,
              isTest: false,
            },
          });

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
                `Electricity payment for meter ${cleanedMeter}`,

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
          };
        }
      );

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
        providerCost,

      serviceFeePercent,

      serviceFee,

      amount:
        totalAmount,

      providerCost,

      profit,

      token,

      units,

      walletBalance:
        result.walletBalance,

      businessRevenue:
        totalAmount,

      businessCost:
        providerCost,

      businessProfit:
        profit,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    console.error(
      "ELECTRICITY PURCHASE ERROR:",
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