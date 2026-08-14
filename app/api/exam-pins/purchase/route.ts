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

const CHEAPDATAHUB_EXAM_PIN_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/exam-pin/purchase/";

const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;

function generateReference() {
  return `EXAMPIN-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

type ExamProduct = {
  examName: string;
  price: number;
};

const EXAM_PRODUCTS: Record<number, ExamProduct> = {
  1: {
    examName: "WAEC",
    price: 6000,
  },

  2: {
    examName: "NECO",
    price: 2500,
  },

  3: {
    examName: "NABTEB",
    price: 1200,
  },
};

function isProviderSuccessful(result: any): boolean {
  return (
    result?.status === true ||
    result?.status === "true" ||
    result?.status === "success" ||
    result?.success === true
  );
}

function extractPins(
  providerResult: any
): Array<{
  pin: string;
  serial: string;
}> {
  const delivery =
    providerResult?.data?.delivery ||
    providerResult?.delivery ||
    {};

  const rawPins =
    Array.isArray(delivery?.pins)
      ? delivery.pins
      : Array.isArray(providerResult?.pins)
      ? providerResult.pins
      : [];

  return rawPins
    .map((pin: any) => {
      if (typeof pin === "string") {
        return {
          pin: pin.trim(),
          serial: "",
        };
      }

      return {
        pin: String(
          pin?.pin ||
            pin?.pin_number ||
            pin?.voucher ||
            pin?.voucher_pin ||
            ""
        ).trim(),

        serial: String(
          pin?.serial ||
            pin?.serial_number ||
            pin?.voucher_serial ||
            ""
        ).trim(),
      };
    })
    .filter(
      (item: {
        pin: string;
        serial: string;
      }) => Boolean(item.pin)
    );
}

/*
 * ============================================================
 * GET SERVICE FEE
 * ============================================================
 *
 * The admin service-fee setting is now used here.
 *
 * Supported database keys:
 *
 * SERVICE_FEE_PERCENT
 * DATA_SERVICE_FEE_PERCENTAGE
 * SERVICE_FEE_PERCENTAGE
 * SERVICE_FEE
 *
 * SERVICE_FEE_PERCENT is checked first because that is the
 * setting currently being created by your admin service-fees
 * page.
 */
async function getServiceFeePercentage(): Promise<number> {
  try {
    const setting =
      await prisma.systemSetting.findFirst({
        where: {
          key: {
            in: [
              "SERVICE_FEE_PERCENT",
              "DATA_SERVICE_FEE_PERCENTAGE",
              "SERVICE_FEE_PERCENTAGE",
              "SERVICE_FEE",
            ],
          },
        },

        orderBy: {
          updatedAt: "desc",
        },
      });

    if (setting) {
      const parsedFee = Number(setting.value);

      if (
        Number.isFinite(parsedFee) &&
        parsedFee >= 0 &&
        parsedFee <= 100
      ) {
        return parsedFee;
      }
    }
  } catch (error) {
    console.error(
      "EXAM PIN SERVICE FEE SETTING ERROR:",
      error
    );
  }

  return DEFAULT_SERVICE_FEE_PERCENTAGE;
}

export async function POST(
  request: NextRequest
) {
  let transactionId: string | null = null;

  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    const userId =
      session.user.id;

    // ========================================================
    // REQUEST BODY
    // ========================================================

    const body =
      await request.json();

    const {
      productId,
      quantity,
    } = body;

    if (
      productId === undefined ||
      quantity === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "productId and quantity are required.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // VALIDATION
    // ========================================================

    const numericProductId =
      Number(productId);

    const numericQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        numericProductId
      ) ||
      numericProductId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid exam PIN product.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        numericQuantity
      ) ||
      ![1, 2, 5].includes(
        numericQuantity
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quantity must be 1, 2, or 5.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // PRODUCT
    // ========================================================

    const product =
      EXAM_PRODUCTS[
        numericProductId
      ];

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Exam PIN product not found.",
        },
        {
          status: 404,
        }
      );
    }

    const unitPrice =
      Number(product.price);

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid exam PIN pricing configuration.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ========================================================
     * SERVICE FEE
     * ========================================================
     *
     * Example:
     *
     * WAEC = ₦6,000
     * Service fee = 5%
     *
     * Fee = ₦300
     * Customer pays = ₦6,300
     *
     * For quantity 2:
     *
     * Base = ₦12,000
     * Fee = ₦600
     * Customer pays = ₦12,600
     */

    const serviceFeePercentage =
      await getServiceFeePercentage();

    const baseAmount =
      Number(
        (
          unitPrice *
          numericQuantity
        ).toFixed(2)
      );

    const serviceFee =
      Number(
        (
          baseAmount *
          (serviceFeePercentage / 100)
        ).toFixed(2)
      );

    const totalAmount =
      Number(
        (
          baseAmount +
          serviceFee
        ).toFixed(2)
      );

    // ========================================================
    // FIND USER
    // ========================================================

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
        {
          status: 404,
        }
      );
    }

    if (
      user.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your account is not active.",
        },
        {
          status: 403,
        }
      );
    }

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
          error:
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

          error:
            "Insufficient wallet balance.",

          balance:
            walletBalance,

          required:
            totalAmount,

          baseAmount,

          serviceFeePercentage,

          serviceFee,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // API KEY
    // ========================================================

    const apiKey =
      process.env
        .CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // REFERENCE
    // ========================================================

    const reference =
      generateReference();

    // ========================================================
    // CREATE PENDING TRANSACTION
    // ========================================================

    const transaction =
      await prisma.transaction.create({
        data: {
          userId:
            user.id,

          type:
            "EXAM_PIN",

          amount:
            totalAmount,

          description:
            `${product.examName} Exam PIN x${numericQuantity}`,

          status:
            "PENDING",

          reference,

          provider:
            "CheapDataHub",

          /*
           * Provider cost is kept as the actual base amount.
           * The service fee increases customer payment and
           * therefore increases business profit.
           */
          cost:
            baseAmount,

          profit:
            serviceFee,

          isTest:
            false,
        },
      });

    transactionId =
      transaction.id;

    // ========================================================
    // PROVIDER REQUEST
    // ========================================================
    //
    // IMPORTANT:
    // The service fee is NOT sent to CheapDataHub.
    //
    // CheapDataHub receives the original product quantity.
    // The customer pays totalAmount from the wallet.
    //

    const requestBody = {
      product_id:
        numericProductId,

      quantity:
        numericQuantity,
    };

    console.log(
      "=========================================="
    );

    console.log(
      "CHEAPDATAHUB EXAM PIN PURCHASE"
    );

    console.log(
      "URL:",
      CHEAPDATAHUB_EXAM_PIN_URL
    );

    console.log(
      "REQUEST:",
      requestBody
    );

    console.log(
      "BASE AMOUNT:",
      baseAmount
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
      "API KEY EXISTS:",
      Boolean(apiKey)
    );

    console.log(
      "=========================================="
    );

    const providerResponse =
      await fetch(
        CHEAPDATAHUB_EXAM_PIN_URL,
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
      "EXAM PIN PROVIDER STATUS:",
      providerResponse.status
    );

    console.log(
      "EXAM PIN PROVIDER RESPONSE:",
      responseText
    );

    // ========================================================
    // PARSE RESPONSE
    // ========================================================

    let providerResult:
      any = null;

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

          error:
            "CheapDataHub returned an invalid response.",

          providerStatus:
            providerResponse.status,
        },
        {
          status: 502,
        }
      );
    }

    // ========================================================
    // PROVIDER SUCCESS
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

          error:
            providerResult?.message ||
            providerResult?.error ||
            providerResult?.response_description ||
            "Exam PIN purchase failed.",

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

    // ========================================================
    // EXTRACT DELIVERY
    // ========================================================

    const delivery =
      providerResult?.data
        ?.delivery ||
      providerResult?.delivery ||
      {};

    const pins =
      extractPins(
        providerResult
      );

    // ========================================================
    // VERIFY DELIVERY
    // ========================================================

    if (
      pins.length <
      numericQuantity
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

          error:
            "Exam PIN purchase was reported successful, but the expected PINs were not returned.",

          expected:
            numericQuantity,

          received:
            pins.length,

          providerResponse:
            providerResult,
        },
        {
          status: 502,
        }
      );
    }

    // ========================================================
    // ATOMIC PAYMENT
    // ========================================================

    const finalResult =
      await prisma.$transaction(
        async (tx) => {
          const freshUser =
            await tx.user.findUnique({
              where: {
                id:
                  user.id,
              },
            });

          if (!freshUser) {
            throw new Error(
              "User account not found."
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

          const newBalance =
            Number(
              (
                freshBalance -
                totalAmount
              ).toFixed(2)
            );

          /*
           * Revenue = what customer actually paid.
           *
           * Cost = original exam PIN price.
           *
           * Profit = service fee.
           */
          const revenue =
            totalAmount;

          const cost =
            baseAmount;

          const profit =
            Number(
              (
                revenue -
                cost
              ).toFixed(2)
            );

          await tx.user.update({
            where: {
              id:
                user.id,
            },

            data: {
              walletBalance:
                newBalance,
            },
          });

          await tx.transaction.update({
            where: {
              id:
                transaction.id,
            },

            data: {
              status:
                "SUCCESS",

              amount:
                revenue,

              cost,

              profit,

              isTest:
                false,
            },
          });

          const newBusinessBalance =
            Number(
              (
                Number(
                  businessWallet.balance
                ) +
                revenue
              ).toFixed(2)
            );

          const newTotalRevenue =
            Number(
              (
                Number(
                  businessWallet.totalRevenue
                ) +
                revenue
              ).toFixed(2)
            );

          const newTotalCost =
            Number(
              (
                Number(
                  businessWallet.totalCost
                ) +
                cost
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
                "EXAM_PIN",

              provider:
                "CheapDataHub",

              amount:
                revenue,

              cost,

              profit,

              reference,

              description:
                `${product.examName} Exam PIN x${numericQuantity}`,

              businessWalletId:
                businessWallet.id,
            },
          });

          // ====================================================
          // SAVE PINS
          // ====================================================

          for (
            const pin of pins.slice(
              0,
              numericQuantity
            )
          ) {
            await tx.examPin.create({
              data: {
                userId:
                  user.id,

                provider:
                  "CheapDataHub",

                pin:
                  pin.pin,

                serial:
                  pin.serial,

                amount:
                  Number(
                    (
                      unitPrice +
                      (
                        unitPrice *
                        (
                          serviceFeePercentage /
                          100
                        )
                      )
                    ).toFixed(2)
                  ),

                reference:
                  `${reference}-${Math.random()
                    .toString(36)
                    .substring(2, 8)
                    .toUpperCase()}`,
              },
            });
          }

          return {
            walletBalance:
              newBalance,

            businessBalance:
              newBusinessBalance,

            revenue,

            cost,

            profit,
          };
        }
      );

    // ========================================================
    // SUCCESS
    // ========================================================

    return NextResponse.json({
      success: true,

      message:
        providerResult?.message ||
        "Exam PIN purchase successful.",

      reference,

      examName:
        delivery?.exam_name ||
        delivery?.examName ||
        product.examName,

      quantity:
        delivery?.quantity ||
        numericQuantity,

      unitPrice,

      baseAmount,

      serviceFeePercentage,

      serviceFee,

      totalAmount,

      pins,

      walletBalance:
        finalResult.walletBalance,

      businessRevenue:
        finalResult.revenue,

      businessCost:
        finalResult.cost,

      businessProfit:
        finalResult.profit,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    console.error(
      "EXAM PIN PURCHASE ERROR:",
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
          "FAILED TO UPDATE EXAM PIN TRANSACTION:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Exam PIN purchase failed.",
      },
      {
        status: 500,
      }
    );
  }
}