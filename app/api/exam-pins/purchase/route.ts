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

const CHEAPDATAHUB_EXAM_PIN_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/exam-pin/purchase/";

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
  (item: { pin: string; serial: string }) =>
    Boolean(item.pin)
);
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
      productId === null ||
      quantity === undefined ||
      quantity === null
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
    // VALIDATE PRODUCT ID
    // ========================================================

    const numericProductId =
      Number(productId);

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

    // ========================================================
    // VALIDATE QUANTITY
    // ========================================================

    const numericQuantity =
      Number(quantity);

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
    // FIND EXAM PRODUCT
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

    // ========================================================
    // BASE AMOUNT
    // ========================================================

    const baseAmount =
      Number(
        (
          unitPrice *
          numericQuantity
        ).toFixed(2)
      );

    // ========================================================
    // CONFIGURABLE SERVICE FEE
    // ========================================================
    //
    // This gets the percentage configured from the
    // admin service-fee setting.
    //
    // Example:
    //
    // Admin setting = 5%
    // WAEC = ₦6,000
    //
    // Provider cost = ₦6,000
    // Service fee = ₦300
    // Customer pays = ₦6,300
    //
    // If admin changes it to 10%:
    //
    // Provider cost = ₦6,000
    // Service fee = ₦600
    // Customer pays = ₦6,600
    //

    const serviceFeePercent =
      await getServiceFeePercent();

    const pricing =
      calculateServiceFee(
        baseAmount,
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

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

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

    // ========================================================
    // WALLET BALANCE
    // ========================================================

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

          providerCost,

          serviceFeePercent,

          serviceFee,

          totalAmount,
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
    // GENERATE REFERENCE
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

          /*
           * Amount is what the customer pays,
           * including the service fee.
           */
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
           * Actual amount paid to provider.
           */
          cost:
            providerCost,

          /*
           * Our profit is the service fee.
           */
          profit,

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
    //
    // The service fee is NOT sent to CheapDataHub.
    //
    // CheapDataHub receives only the actual product
    // request.
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
      "EXAM:",
      product.examName
    );

    console.log(
      "QUANTITY:",
      numericQuantity
    );

    console.log(
      "BASE AMOUNT:",
      baseAmount
    );

    console.log(
      "PROVIDER COST:",
      providerCost
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
      "CUSTOMER TOTAL:",
      totalAmount
    );

    console.log(
      "EXPECTED PROFIT:",
      profit
    );

    console.log(
      "API KEY EXISTS:",
      Boolean(apiKey)
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // CALL CHEAPDATAHUB
    // ========================================================

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
    // PARSE PROVIDER RESPONSE
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

    // ========================================================
    // PROVIDER SUCCESS CHECK
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
    // VERIFY PIN DELIVERY
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
    // ATOMIC ACCOUNTING
    // ========================================================

    const finalResult =
      await prisma.$transaction(
        async (tx) => {
          // ==================================================
          // GET FRESH USER
          // ==================================================

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

          // ==================================================
          // BUSINESS WALLET
          // ==================================================

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

          // ==================================================
          // CALCULATE NEW USER BALANCE
          // ==================================================

          const newUserBalance =
            Number(
              (
                freshBalance -
                totalAmount
              ).toFixed(2)
            );

          // ==================================================
          // BUSINESS ACCOUNTING
          // ==================================================
          //
          // Revenue = customer payment
          //
          // Cost = provider cost
          //
          // Profit = service fee
          //

          const revenue =
            totalAmount;

          const cost =
            providerCost;

          const businessProfit =
            Number(
              (
                revenue -
                cost
              ).toFixed(2)
            );

          // ==================================================
          // NEW BUSINESS VALUES
          // ==================================================

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
                businessProfit
              ).toFixed(2)
            );

          const newAvailableProfit =
            Number(
              (
                Number(
                  businessWallet.availableProfit
                ) +
                businessProfit
              ).toFixed(2)
            );

          // ==================================================
          // UPDATE USER WALLET
          // ==================================================

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

          // ==================================================
          // UPDATE TRANSACTION
          // ==================================================

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

              profit:
                businessProfit,

              isTest:
                false,
            },
          });

          // ==================================================
          // UPDATE BUSINESS WALLET
          // ==================================================

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

          // ==================================================
          // CREATE BUSINESS REVENUE
          // ==================================================

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

              profit:
                businessProfit,

              reference,

              description:
                `${product.examName} Exam PIN x${numericQuantity}`,

              businessWalletId:
                businessWallet.id,
            },
          });

          // ==================================================
          // SAVE EXAM PINS
          // ==================================================

          for (
            const pin of pins.slice(
              0,
              numericQuantity
            )
          ) {
            const pinReference =
              `${reference}-${Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase()}`;

            /*
             * Each PIN receives its own customer price:
             *
             * Unit provider cost:
             * ₦6,000
             *
             * 5% fee:
             * ₦300
             *
             * Customer price:
             * ₦6,300
             */

            const pinCustomerAmount =
              Number(
                (
                  unitPrice +
                  unitPrice *
                    (
                      serviceFeePercent /
                      100
                    )
                ).toFixed(2)
              );

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
                  pinCustomerAmount,

                reference:
                  pinReference,
              },
            });
          }

          return {
            walletBalance:
              newUserBalance,

            businessBalance:
              newBusinessBalance,

            revenue,

            cost,

            profit:
              businessProfit,
          };
        }
      );

    // ========================================================
    // SUCCESS RESPONSE
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

      providerCost,

      serviceFeePercent,

      serviceFee,

      totalAmount,

      profit:
        finalResult.profit,

      pins,

      walletBalance:
        finalResult.walletBalance,

      businessRevenue:
        finalResult.revenue,

      businessCost:
        finalResult.cost,

      businessProfit:
        finalResult.profit,

      plan: {
        id:
          numericProductId,

        examName:
          product.examName,

        unitPrice,

        quantity:
          numericQuantity,
      },

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    console.error(
      "EXAM PIN PURCHASE ERROR:",
      error
    );

    // ========================================================
    // MARK TRANSACTION FAILED
    // ========================================================

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