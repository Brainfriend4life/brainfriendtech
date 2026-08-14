import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { networkDataSubRequest } from "@/lib/networkdatasub";

const ALLOWED_CARD_TYPES = [
  "standard",
  "regular",
  "premium",
  "vnin_slip",
] as const;

type NinCardType = (typeof ALLOWED_CARD_TYPES)[number];

type ProviderNinResponse = {
  success?: boolean;
  message?: string;

  data?: {
    verification_id?: number | string;
    transaction_id?: string | number | null;
    reference?: string | null;
    amount?: number | string | null;

    details?: {
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
      surname?: string | null;
      gender?: string | null;
      dateOfBirth?: string | null;
      birthDate?: string | null;
      telephone?: string | null;
      phone?: string | null;
      photo?: string | null;

      [key: string]: unknown;
    };

    pdf_base64?: string | null;
    pdfBase64?: string | null;
    pdf?: string | null;
    document?: string | null;
    document_base64?: string | null;
    documentBase64?: string | null;

    pdf_url?: string | null;
    document_url?: string | null;

    has_pdf?: boolean;

    [key: string]: unknown;
  };
};

const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";
const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;

/*
|--------------------------------------------------------------------------
| NIN CUSTOMER BASE PRICES
|--------------------------------------------------------------------------
|
| These are the actual NIN prices before your service fee.
|
| Standard   = ₦150
| Regular    = ₦150
| Premium    = ₦250
| VNIN Slip  = ₦150
|
*/

const NIN_BASE_PRICES: Record<NinCardType, number> = {
  standard: 150,
  regular: 150,
  premium: 250,
  vnin_slip: 150,
};

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

function createReference(): string {
  return `NIN-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase()}`;
}

async function getServiceFeePercentage(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: SERVICE_FEE_SETTING_KEY,
      },
    });

    if (!setting) {
      return DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    const percentage = Number(setting.value);

    if (
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      return DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    return percentage;
  } catch (error) {
    console.error(
      "NIN SERVICE FEE SETTING ERROR:",
      error
    );

    return DEFAULT_SERVICE_FEE_PERCENTAGE;
  }
}

function calculateCustomerPrice(
  basePrice: number,
  serviceFeePercentage: number
) {
  const serviceFee = Number(
    (
      basePrice *
      (serviceFeePercentage / 100)
    ).toFixed(2)
  );

  const totalAmount = Number(
    (basePrice + serviceFee).toFixed(2)
  );

  return {
    basePrice,
    serviceFee,
    totalAmount,
  };
}

async function refundFailedTransaction(params: {
  transactionId: string;
  userId: string;
  amount: number;
}) {
  const {
    transactionId,
    userId,
    amount,
  } = params;

  try {
    await prisma.$transaction(
      async (tx) => {
        const transaction =
          await tx.transaction.findUnique({
            where: {
              id: transactionId,
            },
          });

        if (!transaction) {
          throw new Error(
            "Transaction not found during refund."
          );
        }

        /*
         * Only refund a transaction that is still pending.
         * This prevents double refunds.
         */
        if (transaction.status !== "PENDING") {
          return;
        }

        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            walletBalance: {
              increment: amount,
            },
          },
        });

        await tx.transaction.update({
          where: {
            id: transactionId,
          },
          data: {
            status: "FAILED",
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "NIN REFUND FAILED:",
      error
    );

    return false;
  }
}

export async function POST(
  request: NextRequest
) {
  let transactionId: string | null = null;
  let transactionReference: string | null = null;

  try {
    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATION
    |--------------------------------------------------------------------------
    */

    const session = await getServerSession(
      authOptions
    );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    const userId = session.user.id;

    /*
    |--------------------------------------------------------------------------
    | REQUEST BODY
    |--------------------------------------------------------------------------
    */

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const nin = String(
      body?.nin || ""
    ).replace(/\s+/g, "");

    const cardType = String(
      body?.cardType || ""
    )
      .trim()
      .toLowerCase() as NinCardType;

    /*
    |--------------------------------------------------------------------------
    | VALIDATE NIN
    |--------------------------------------------------------------------------
    */

    if (!/^\d{11}$/.test(nin)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid 11-digit NIN.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE CARD TYPE
    |--------------------------------------------------------------------------
    */

    if (
      !ALLOWED_CARD_TYPES.includes(cardType)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid NIN card type.",
          allowedCardTypes:
            ALLOWED_CARD_TYPES,
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | FIND USER
    |--------------------------------------------------------------------------
    */

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (user.status !== "ACTIVE") {
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

    /*
    |--------------------------------------------------------------------------
    | GET SERVICE FEE
    |--------------------------------------------------------------------------
    */

    const serviceFeePercentage =
      await getServiceFeePercentage();

    /*
    |--------------------------------------------------------------------------
    | GET NIN BASE PRICE
    |--------------------------------------------------------------------------
    */

    const basePrice =
      NIN_BASE_PRICES[cardType];

    /*
    |--------------------------------------------------------------------------
    | CALCULATE CUSTOMER PRICE
    |--------------------------------------------------------------------------
    */

    const pricing =
      calculateCustomerPrice(
        basePrice,
        serviceFeePercentage
      );

    const serviceFee =
      pricing.serviceFee;

    const amount =
      pricing.totalAmount;

    /*
    |--------------------------------------------------------------------------
    | CREATE REFERENCE
    |--------------------------------------------------------------------------
    */

    const reference =
      createReference();

    transactionReference =
      reference;

    /*
    |--------------------------------------------------------------------------
    | RESERVE USER WALLET
    |--------------------------------------------------------------------------
    */

    let transaction;

    try {
      transaction =
        await prisma.$transaction(
          async (tx) => {
            const debitResult =
              await tx.user.updateMany({
                where: {
                  id: userId,
                  status: "ACTIVE",
                  walletBalance: {
                    gte: amount,
                  },
                },
                data: {
                  walletBalance: {
                    decrement: amount,
                  },
                },
              });

            if (debitResult.count !== 1) {
              throw new Error(
                "Insufficient wallet balance."
              );
            }

            return await tx.transaction.create({
              data: {
                userId,

                type: "NIN",

                amount,

                description:
                  `NIN verification (${cardType})`,

                status: "PENDING",

                reference,

                provider:
                  "NetworkDataSub",

                cost: 0,

                profit: 0,
              },
            });
          },
          {
            maxWait: 10000,
            timeout: 20000,
          }
        );

      transactionId =
        transaction.id;
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,

          error:
            error?.message ===
            "Insufficient wallet balance."
              ? "Insufficient wallet balance."
              : "Unable to reserve wallet funds. Please try again.",
        },
        {
          status:
            error?.message ===
            "Insufficient wallet balance."
              ? 400
              : 500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | NETWORKDATASUB NIN VERIFICATION
    |--------------------------------------------------------------------------
    */

    let providerResponse;

    try {
      providerResponse =
        await networkDataSubRequest<ProviderNinResponse>(
          "/verification/nin",
          {
            method: "POST",

            body: {
              nin,

              card_type:
                cardType,
            },
          }
        );
    } catch (error) {
      console.error(
        "NETWORKDATASUB ERROR:",
        error
      );

      const refunded =
        await refundFailedTransaction({
          transactionId:
            transaction.id,

          userId,

          amount,
        });

      return NextResponse.json(
        {
          success: false,

          error:
            "NetworkDataSub could not be reached.",

          refunded,

          reference,

          transactionId:
            transaction.id,
        },
        {
          status: 502,
        }
      );
    }

    console.log(
      "NETWORKDATASUB STATUS:",
      providerResponse.response.status
    );

    console.log(
      "NETWORKDATASUB FULL RESPONSE:",
      JSON.stringify(
        providerResponse.data,
        null,
        2
      )
    );

    /*
    |--------------------------------------------------------------------------
    | PROVIDER HTTP ERROR
    |--------------------------------------------------------------------------
    */

    if (
      !providerResponse.response.ok ||
      !providerResponse.data
    ) {
      const refunded =
        await refundFailedTransaction({
          transactionId:
            transaction.id,

          userId,

          amount,
        });

      return NextResponse.json(
        {
          success: false,

          error:
            providerResponse.data
              ?.message ||
            "NIN verification failed.",

          refunded,

          reference,

          transactionId:
            transaction.id,
        },
        {
          status: 400,
        }
      );
    }

    const providerData =
      providerResponse.data;

    /*
    |--------------------------------------------------------------------------
    | PROVIDER BUSINESS ERROR
    |--------------------------------------------------------------------------
    */

    if (
      providerData.success !== true
    ) {
      const refunded =
        await refundFailedTransaction({
          transactionId:
            transaction.id,

          userId,

          amount,
        });

      return NextResponse.json(
        {
          success: false,

          error:
            providerData.message ||
            "NIN verification failed.",

          refunded,

          reference,

          transactionId:
            transaction.id,
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PROVIDER DATA
    |--------------------------------------------------------------------------
    */

    const verificationData =
      providerData.data || {};

    const details =
      verificationData.details || {};

    const providerReference =
      verificationData.reference ??
      null;

    const providerTransactionId =
      verificationData.transaction_id ??
      null;

    /*
    |--------------------------------------------------------------------------
    | PROVIDER COST
    |--------------------------------------------------------------------------
    */

    const providerAmount =
      toPositiveNumber(
        verificationData.amount
      );

    const providerCost =
      providerAmount ?? 0;

    /*
    |--------------------------------------------------------------------------
    | PROFIT
    |--------------------------------------------------------------------------
    |
    | Customer pays:
    |
    | Base price + service fee
    |
    | Profit:
    |
    | Customer price - actual provider cost
    |
    */

    const profit = Number(
      Math.max(
        0,
        amount - providerCost
      ).toFixed(2)
    );

    /*
    |--------------------------------------------------------------------------
    | PDF EXTRACTION
    |--------------------------------------------------------------------------
    */

    let pdfBase64: string | null =
      null;

    const possiblePdfValues = [
      verificationData.pdf_base64,
      verificationData.pdfBase64,
      verificationData.pdf,
      verificationData.document,
      verificationData.document_base64,
      verificationData.documentBase64,
    ];

    for (
      const value of possiblePdfValues
    ) {
      if (
        typeof value === "string" &&
        value.trim().length > 0
      ) {
        pdfBase64 =
          value.trim();

        break;
      }
    }

    const hasPdf =
      Boolean(pdfBase64);

    /*
    |--------------------------------------------------------------------------
    | NIN DETAILS
    |--------------------------------------------------------------------------
    */

    const firstName =
      typeof details.firstName === "string"
        ? details.firstName
        : null;

    const middleName =
      typeof details.middleName === "string"
        ? details.middleName
        : null;

    const surname =
      typeof details.lastName === "string"
        ? details.lastName
        : typeof details.surname === "string"
        ? details.surname
        : null;

    const gender =
      typeof details.gender === "string"
        ? details.gender
        : null;

    const birthDate =
      typeof details.dateOfBirth === "string"
        ? details.dateOfBirth
        : typeof details.birthDate === "string"
        ? details.birthDate
        : null;

    const telephone =
      typeof details.telephone === "string"
        ? details.telephone
        : typeof details.phone === "string"
        ? details.phone
        : null;

    const photo =
      typeof details.photo === "string"
        ? details.photo
        : null;

    /*
    |--------------------------------------------------------------------------
    | FINALIZE TRANSACTION
    |--------------------------------------------------------------------------
    */

    let result;

    try {
      result =
        await prisma.$transaction(
          async (tx) => {
            const currentTransaction =
              await tx.transaction.findUnique({
                where: {
                  id: transaction.id,
                },
              });

            if (!currentTransaction) {
              throw new Error(
                "Transaction could not be found."
              );
            }

            if (
              currentTransaction.status !==
              "PENDING"
            ) {
              throw new Error(
                "Transaction is no longer pending."
              );
            }

            /*
            |--------------------------------------------------------------------------
            | BUSINESS WALLET
            |--------------------------------------------------------------------------
            */

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
            }

            /*
            |--------------------------------------------------------------------------
            | GET FRESH USER
            |--------------------------------------------------------------------------
            */

            const freshUser =
              await tx.user.findUnique({
                where: {
                  id: userId,
                },
              });

            if (!freshUser) {
              throw new Error(
                "User account could not be found."
              );
            }

            /*
            |--------------------------------------------------------------------------
            | UPDATE TRANSACTION
            |--------------------------------------------------------------------------
            */

            await tx.transaction.update({
              where: {
                id: transaction.id,
              },

              data: {
                status: "SUCCESS",

                cost:
                  providerCost,

                profit,
              },
            });

            /*
            |--------------------------------------------------------------------------
            | UPDATE BUSINESS WALLET
            |--------------------------------------------------------------------------
            */

            const updatedBusinessWallet =
              await tx.businessWallet.update({
                where: {
                  id:
                    businessWallet.id,
                },

                data: {
                  balance: {
                    increment:
                      amount,
                  },

                  totalRevenue: {
                    increment:
                      amount,
                  },

                  totalCost: {
                    increment:
                      providerCost,
                  },

                  totalProfit: {
                    increment:
                      profit,
                  },

                  availableProfit: {
                    increment:
                      profit,
                  },
                },
              });

            /*
            |--------------------------------------------------------------------------
            | BUSINESS REVENUE
            |--------------------------------------------------------------------------
            */

            await tx.businessRevenue.create({
              data: {
                transactionId:
                  transaction.id,

                type: "NIN",

                provider:
                  "NetworkDataSub",

                amount,

                cost:
                  providerCost,

                profit,

                reference,

                description:
                  `NIN verification (${cardType})`,

                businessWalletId:
                  businessWallet.id,
              },
            });

            /*
            |--------------------------------------------------------------------------
            | SAVE NIN VERIFICATION
            |--------------------------------------------------------------------------
            */

            const ninVerification =
              await tx.ninVerification.create({
                data: {
                  userId:
                    user.id,

                  nin,

                  cardType,

                  amount,

                  status:
                    "SUCCESS",

                  reference,

                  transactionId:
                    transaction.id,

                  firstName,

                  middleName,

                  surname,

                  gender,

                  birthDate,

                  telephone,

                  photo,

                  pdfBase64,

                  hasPdf,
                },
              });

            return {
              ninVerification,

              walletBalance:
                Number(
                  freshUser.walletBalance
                ),

              businessBalance:
                Number(
                  updatedBusinessWallet.balance
                ),

              profit,
            };
          },
          {
            maxWait: 10000,
            timeout: 20000,
          }
        );
    } catch (error: any) {
      console.error(
        "NIN FINALIZATION ERROR:",
        error
      );

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | The provider already succeeded here.
      | Do not automatically refund the user because
      | the database finalization failed.
      |
      | The transaction remains pending and should be
      | reconciled manually if this rare case occurs.
      |
      */

      return NextResponse.json(
        {
          success: false,

          error:
            "NIN verification succeeded but could not be stored.",

          reference,

          transactionId:
            transaction.id,

          debug:
            process.env.NODE_ENV ===
            "development"
              ? error?.message
              : undefined,
        },
        {
          status: 500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SUCCESS RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        message:
          providerData.message ||
          "NIN verification completed successfully.",

        data: {
          verification_id:
            result.ninVerification.id,

          transaction_id:
            transaction.id,

          provider_transaction_id:
            providerTransactionId,

          reference,

          provider_reference:
            providerReference,

          /*
          |--------------------------------------------------------------------------
          | PRICING BREAKDOWN
          |--------------------------------------------------------------------------
          */

          base_price:
            pricing.basePrice,

          service_fee:
            serviceFee,

          service_fee_percentage:
            serviceFeePercentage,

          amount,

          provider_cost:
            providerCost,

          profit,

          card_type:
            cardType,

          status:
            "SUCCESS",

          details: {
            firstName,

            middleName,

            surname,

            gender,

            birthDate,

            telephoneNo:
              telephone,

            photo,
          },

          has_pdf:
            result.ninVerification
              .hasPdf,

          pdf_url:
            result.ninVerification
              .hasPdf
              ? `/api/verification/nin/${result.ninVerification.id}/pdf`
              : null,

          wallet_balance:
            result.walletBalance,

          business_revenue:
            amount,

          business_cost:
            providerCost,

          business_profit:
            result.profit,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "NIN FATAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "NIN verification could not be completed.",

        transactionId,

        reference:
          transactionReference,
      },
      {
        status: 500,
      }
    );
  }
}