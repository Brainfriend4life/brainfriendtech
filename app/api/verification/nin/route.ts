
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

type ProviderDetails = {
  nin?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  lastName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  dateOfBirth?: string | null;
  telephoneNo?: string | null;
  telephone?: string | null;
  phone?: string | null;
  mobile?: string | null;
  photo?: string | null;
  [key: string]: unknown;
};

type ProviderNinData = {
  verification_id?: number | string | null;
  transaction_id?: string | number | null;
  reference?: string | null;
  amount?: number | string | null;
  details?: ProviderDetails;
  pdf_base64?: string | null;
  pdfBase64?: string | null;
  pdf?: string | null;
  has_pdf?: boolean;
  card_type?: string | null;
  [key: string]: unknown;
};

type ProviderNinResponse = {
  success?: boolean;
  message?: string;
  data?: ProviderNinData;
  [key: string]: unknown;
};

function toPositiveNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue <= 0
  ) {
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

function getNinPrice(
  cardType: NinCardType
): number | null {
  const prices: Record<
    NinCardType,
    string | undefined
  > = {
    standard:
      process.env.NIN_STANDARD_PRICE || "150",

    regular:
      process.env.NIN_REGULAR_PRICE || "300",

    premium:
      process.env.NIN_PREMIUM_PRICE || "500",

    vnin_slip:
      process.env.NIN_VNIN_SLIP_PRICE || "300",
  };

  return toPositiveNumber(
    prices[cardType]
  );
}

/**
 * NetworkDataSub card-specific endpoints.
 *
 * IMPORTANT:
 * These endpoints only require:
 *
 * {
 *   nin: "12345678901"
 * }
 *
 * Do NOT send card_type or force_new.
 */
function getProviderEndpoint(
  cardType: NinCardType
): string {
  switch (cardType) {
    case "standard":
      return "/verification/nin/standard";

    case "regular":
      return "/verification/nin/regular";

    case "premium":
      return "/verification/nin/premium";

    case "vnin_slip":
      return "/verification/nin/vnin-slip";

    default:
      return "/verification/nin/standard";
  }
}

function extractPdf(
  response: unknown
): string | null {
  if (
    !response ||
    typeof response !== "object"
  ) {
    return null;
  }

  const root =
    response as Record<string, unknown>;

  const nested =
    root.data &&
    typeof root.data === "object"
      ? (root.data as Record<
          string,
          unknown
        >)
      : undefined;

  const candidates: unknown[] = [
    root.pdf_base64,
    root.pdfBase64,
    root.pdf,

    nested?.pdf_base64,
    nested?.pdfBase64,
    nested?.pdf,
  ];

  for (
    const candidate of candidates
  ) {
    if (
      typeof candidate === "string" &&
      candidate.trim().length > 0
    ) {
      return candidate.trim();
    }
  }

  return null;
}

function extractProviderCost(
  response: unknown
): number | null {
  if (
    !response ||
    typeof response !== "object"
  ) {
    return null;
  }

  const root =
    response as Record<string, unknown>;

  const nested =
    root.data &&
    typeof root.data === "object"
      ? (root.data as Record<
          string,
          unknown
        >)
      : undefined;

  const candidates: unknown[] = [
    root.amount,
    root.cost,
    root.price,

    nested?.amount,
    nested?.cost,
    nested?.price,
  ];

  for (
    const candidate of candidates
  ) {
    const value =
      toPositiveNumber(candidate);

    if (value !== null) {
      return value;
    }
  }

  return null;
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

        if (
          transaction.status !==
          "PENDING"
        ) {
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

    console.log(
      "NIN REFUND SUCCESS:",
      {
        transactionId,
        userId,
        amount,
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
  let transactionId:
    | string
    | null = null;

  let transactionReference:
    | string
    | null = null;

  try {
    // ========================================================
    // 1. AUTHENTICATION
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
    // 2. REQUEST BODY
    // ========================================================

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const nin =
      String(
        body?.nin || ""
      ).replace(/\s+/g, "");

    const cardType =
      String(
        body?.cardType || ""
      )
        .trim()
        .toLowerCase() as NinCardType;

    // ========================================================
    // 3. VALIDATE NIN
    // ========================================================

    if (
      !/^\d{11}$/.test(nin)
    ) {
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

    // ========================================================
    // 4. VALIDATE CARD TYPE
    // ========================================================

    if (
      !ALLOWED_CARD_TYPES.includes(
        cardType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid NIN card type.",
          allowedCardTypes:
            ALLOWED_CARD_TYPES,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // 5. FIND USER
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
            "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // 6. ACCOUNT STATUS
    // ========================================================

    if (
      user.status !==
      "ACTIVE"
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
    // 7. CUSTOMER PRICE
    // ========================================================

    const amount =
      getNinPrice(cardType);

    if (amount === null) {
      return NextResponse.json(
        {
          success: false,
          error:
            `NIN price is not configured for ${cardType}.`,
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "NIN LOCAL PRICING:",
      {
        cardType,
        customerPrice:
          amount,
      }
    );

    // ========================================================
    // 8. PROVIDER ENDPOINT
    // ========================================================

    const endpoint =
      getProviderEndpoint(
        cardType
      );

    console.log(
      "NIN PROVIDER ENDPOINT:",
      {
        cardType,
        endpoint,
      }
    );

    // ========================================================
    // 9. INTERNAL REFERENCE
    // ========================================================

    const reference =
      createReference();

    transactionReference =
      reference;

    // ========================================================
    // 10. DEBIT CUSTOMER ONCE
    // ========================================================

    let transaction;

    try {
      transaction =
        await prisma.$transaction(
          async (tx) => {
            const debitResult =
              await tx.user.updateMany(
                {
                  where: {
                    id: userId,
                    status:
                      "ACTIVE",
                    walletBalance:
                      {
                        gte: amount,
                      },
                  },

                  data: {
                    walletBalance:
                      {
                        decrement:
                          amount,
                      },
                  },
                }
              );

            if (
              debitResult.count !==
              1
            ) {
              throw new Error(
                "Insufficient wallet balance."
              );
            }

            return tx.transaction.create(
              {
                data: {
                  userId,

                  type: "NIN",

                  amount,

                  description:
                    `NIN verification (${cardType})`,

                  status:
                    "PENDING",

                  reference,

                  provider:
                    "NetworkDataSub",

                  cost: 0,

                  profit: 0,
                },
              }
            );
          },
          {
            maxWait: 10000,
            timeout: 20000,
          }
        );

      transactionId =
        transaction.id;

      console.log(
        "NIN CUSTOMER DEBIT SUCCESS:",
        {
          transactionId:
            transaction.id,

          reference,

          amount,

          cardType,
        }
      );
    } catch (error: any) {
      console.error(
        "NIN WALLET RESERVATION FAILED:",
        error
      );

      const insufficientBalance =
        error?.message ===
        "Insufficient wallet balance.";

      return NextResponse.json(
        {
          success: false,

          error:
            insufficientBalance
              ? "Insufficient wallet balance."
              : "Unable to reserve wallet funds. Please try again.",
        },
        {
          status:
            insufficientBalance
              ? 400
              : 500,
        }
      );
    }

    // ========================================================
    // 11. NETWORKDATASUB REQUEST
    //
    // ONE REQUEST.
    //
    // Card-specific endpoint.
    //
    // IMPORTANT:
    // ONLY "nin" is sent.
    //
    // No card_type.
    // No force_new.
    // ========================================================

    let providerResponse;

    try {
      providerResponse =
        await networkDataSubRequest<
          ProviderNinResponse
        >(
          endpoint,
          {
            method:
              "POST",

            body: {
              nin,
            },
          }
        );
    } catch (
      providerError
    ) {
      console.error(
        "NETWORKDATASUB NIN REQUEST ERROR:",
        providerError
      );

      const refunded =
        await refundFailedTransaction(
          {
            transactionId:
              transaction.id,

            userId,

            amount,
          }
        );

      return NextResponse.json(
        {
          success: false,

          error:
            refunded
              ? "NetworkDataSub could not be reached. Your wallet has been refunded."
              : "NetworkDataSub could not be reached.",

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

    // ========================================================
    // 12. RAW PROVIDER RESPONSE
    // ========================================================

    console.log(
      "======================================================"
    );

    console.log(
      "NETWORKDATASUB RAW NIN RESPONSE"
    );

    console.log(
      "HTTP STATUS:",
      providerResponse
        .response.status
    );

    console.log(
      "REQUESTED CARD TYPE:",
      cardType
    );

    console.log(
      "REQUESTED ENDPOINT:",
      endpoint
    );

    console.log(
      JSON.stringify(
        providerResponse.data,
        null,
        2
      )
    );

    console.log(
      "======================================================"
    );

    // ========================================================
    // 13. PROVIDER HTTP FAILURE
    // ========================================================

    if (
      !providerResponse.response
        .ok ||
      !providerResponse.data
    ) {
      const providerMessage =
        providerResponse
          .data?.message ||
        "NIN verification failed.";

      const refunded =
        await refundFailedTransaction(
          {
            transactionId:
              transaction.id,

            userId,

            amount,
          }
        );

      return NextResponse.json(
        {
          success: false,

          message:
            refunded
              ? `${providerMessage} Your wallet has been refunded.`
              : `${providerMessage} Please contact support.`,

          error:
            providerMessage,

          providerStatus:
            providerResponse
              .response.status,

          refunded,

          reference,

          transactionId:
            transaction.id,
        },
        {
          status:
            providerResponse
              .response.status >=
              400 &&
            providerResponse
              .response.status < 500
              ? 400
              : 502,
        }
      );
    }

    // ========================================================
    // 14. PROVIDER BUSINESS FAILURE
    // ========================================================

    const providerData =
      providerResponse.data;

    if (
      providerData.success !==
      true
    ) {
      const providerMessage =
        providerData.message ||
        "NIN verification failed.";

      const refunded =
        await refundFailedTransaction(
          {
            transactionId:
              transaction.id,

            userId,

            amount,
          }
        );

      return NextResponse.json(
        {
          success: false,

          message:
            refunded
              ? `${providerMessage} Your wallet has been refunded.`
              : `${providerMessage} Please contact support.`,

          error:
            providerMessage,

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

    // ========================================================
    // 15. PROVIDER DATA
    // ========================================================

    const verificationData =
      providerData.data || {};

    const details =
      verificationData.details ||
      {};

    // ========================================================
    // 16. EXTRACT PDF
    // ========================================================

    const pdfBase64 =
      extractPdf(
        verificationData
      );

    const hasPdf =
      Boolean(pdfBase64);

    // ========================================================
    // 17. PROVIDER COST
    // ========================================================

    const providerCost =
      extractProviderCost(
        verificationData
      ) ?? amount;

    console.log(
      "========== NIN PDF RESULT =========="
    );

    console.log({
      cardType,

      endpoint,

      providerCardType:
        verificationData
          .card_type ??
        null,

      providerHasPdf:
        verificationData
          .has_pdf === true,

      extractedHasPdf:
        hasPdf,

      pdfLength:
        pdfBase64?.length ||
        0,

      providerCost,
    });

    console.log(
      "===================================="
    );

    // ========================================================
    // 18. PROFIT
    // ========================================================

    const profit =
      Number(
        Math.max(
          0,
          amount -
            providerCost
        ).toFixed(2)
      );

    // ========================================================
    // 19. NORMALIZE DETAILS
    // ========================================================

    const firstName =
      typeof details.firstName ===
      "string"
        ? details.firstName
        : null;

    const middleName =
      typeof details.middleName ===
      "string"
        ? details.middleName
        : null;

    const surname =
      typeof details.surname ===
      "string"
        ? details.surname
        : typeof details.lastName ===
          "string"
        ? details.lastName
        : null;

    const gender =
      typeof details.gender ===
      "string"
        ? details.gender
        : null;

    const birthDate =
      typeof details.birthDate ===
      "string"
        ? details.birthDate
        : typeof details.dateOfBirth ===
          "string"
        ? details.dateOfBirth
        : null;

    const telephone =
      typeof details.telephoneNo ===
      "string"
        ? details.telephoneNo
        : typeof details.telephone ===
          "string"
        ? details.telephone
        : typeof details.phone ===
          "string"
        ? details.phone
        : typeof details.mobile ===
          "string"
        ? details.mobile
        : null;

    const photo =
      typeof details.photo ===
      "string"
        ? details.photo
        : null;

    const returnedNin =
      typeof details.nin ===
      "string"
        ? details.nin
        : nin;

    // ========================================================
    // 20. FINALIZE DATABASE
    // ========================================================

    let result;

    try {
      result =
        await prisma.$transaction(
          async (tx) => {
            const currentTransaction =
              await tx.transaction.findUnique(
                {
                  where: {
                    id: transaction.id,
                  },
                }
              );

            if (
              !currentTransaction
            ) {
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

            let businessWallet =
              await tx.businessWallet.findUnique(
                {
                  where: {
                    name:
                      "Brainfriend Global Tech",
                  },
                }
              );

            if (
              !businessWallet
            ) {
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

                      withdrawnProfit:
                        0,

                      availableProfit:
                        0,
                    },
                  }
                );
            }

            const freshUser =
              await tx.user.findUnique(
                {
                  where: {
                    id: userId,
                  },
                }
              );

            if (!freshUser) {
              throw new Error(
                "User account could not be found."
              );
            }

            await tx.transaction.update(
              {
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
              }
            );

            const updatedBusinessWallet =
              await tx.businessWallet.update(
                {
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
                }
              );

            await tx.businessRevenue.create(
              {
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
              }
            );

            const ninVerification =
              await tx.ninVerification.create(
                {
                  data: {
                    userId:
                      user.id,

                    nin:
                      returnedNin,

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

                    hasPdf,

                    pdfBase64:
                      hasPdf
                        ? pdfBase64
                        : null,
                  },
                }
              );

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

              providerCost,
            };
          },
          {
            maxWait: 10000,
            timeout: 20000,
          }
        );
    } catch (error: any) {
      console.error(
        "========== NIN FINALIZATION ERROR =========="
      );

      console.error(
        "ERROR:",
        error
      );

      console.error(
        "MESSAGE:",
        error?.message
      );

      console.error(
        "CODE:",
        error?.code
      );

      console.error(
        "META:",
        error?.meta
      );

      console.error(
        "TRANSACTION ID:",
        transaction.id
      );

      console.error(
        "REFERENCE:",
        reference
      );

      console.error(
        "============================================"
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "NIN verification was successful, but transaction finalization failed. Please contact support with your reference.",

          error:
            "NIN verification was successful, but transaction finalization failed.",

          reference,

          transactionId:
            transaction.id,

          providerReference:
            verificationData
              .reference ??
            null,

          providerTransactionId:
            verificationData
              .transaction_id ??
            null,

          status:
            "PENDING_REVIEW",

          debug:
            process.env.NODE_ENV ===
            "development"
              ? {
                  prismaCode:
                    error?.code ||
                    null,

                  prismaMessage:
                    error?.message ||
                    null,

                  prismaMeta:
                    error?.meta ||
                    null,
                }
              : undefined,
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // 21. SUCCESS RESPONSE
    // ========================================================

    console.log(
      "NIN VERIFICATION SUCCESS:",
      {
        verificationId:
          result
            .ninVerification
            .id,

        transactionId:
          transaction.id,

        reference,

        cardType,

        endpoint,

        amount,

        providerCost:
          result.providerCost,

        profit,

        hasPdf:
          result
            .ninVerification
            .hasPdf,

        pdfLength:
          result
            .ninVerification
            .pdfBase64
            ?.length ||
          0,
      }
    );

    return NextResponse.json(
      {
        success: true,

        message:
          providerData.message ||
          "NIN verification completed successfully.",

        data: {
          verification_id:
            result
              .ninVerification
              .id,

          transaction_id:
            transaction.id,

          provider_transaction_id:
            verificationData
              .transaction_id ??
            null,

          reference,

          provider_reference:
            verificationData
              .reference ??
            null,

          amount,

          provider_cost:
            result.providerCost,

          verification_cost:
            result.providerCost,

          profit:
            result.profit,

          card_type:
            cardType,

          status:
            "SUCCESS",

          details: {
            nin:
              returnedNin,

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
            result
              .ninVerification
              .hasPdf,

          pdf_base64:
            result
              .ninVerification
              .hasPdf
              ? result
                  .ninVerification
                  .pdfBase64
              : null,

          pdf_url:
            result
              .ninVerification
              .hasPdf
              ? `/api/verification/nin/${result.ninVerification.id}/pdf`
              : null,

          wallet_balance:
            result.walletBalance,

          business_revenue:
            amount,

          business_cost:
            result.providerCost,

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
      "========== NIN VERIFICATION FATAL ERROR =========="
    );

    console.error(
      "ERROR:",
      error
    );

    console.error(
      "MESSAGE:",
      error?.message
    );

    console.error(
      "CODE:",
      error?.code
    );

    console.error(
      "META:",
      error?.meta
    );

    console.error(
      "STACK:",
      error?.stack
    );

    console.error(
      "TRANSACTION ID:",
      transactionId
    );

    console.error(
      "TRANSACTION REFERENCE:",
      transactionReference
    );

    console.error(
      "=================================================="
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "NIN verification could not be completed.",

        error:
          error?.message ||
          "NIN verification could not be completed.",

        transactionId,

        reference:
          transactionReference,

        debug:
          process.env.NODE_ENV ===
          "development"
            ? {
                prismaCode:
                  error?.code ||
                  null,

                prismaMeta:
                  error?.meta ||
                  null,
              }
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}

