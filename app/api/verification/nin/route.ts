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

function toPositiveNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined
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
      process.env.NIN_REGULAR_PRICE || "150",

    premium:
      process.env.NIN_PREMIUM_PRICE || "150",

    vnin_slip:
      process.env.NIN_VNIN_SLIP_PRICE ||
      "150",
  };

  return toPositiveNumber(
    prices[cardType]
  );
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
  let transactionReference:
    | string
    | null = null;

  try {
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
        { status: 401 }
      );
    }

    const userId =
      session.user.id;

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const nin = String(
      body?.nin || ""
    ).replace(/\s+/g, "");

    const cardType =
      String(
        body?.cardType || ""
      )
        .trim()
        .toLowerCase() as NinCardType;

    if (!/^\d{11}$/.test(nin)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid 11-digit NIN.",
        },
        { status: 400 }
      );
    }

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
            "User not found.",
        },
        { status: 404 }
      );
    }

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
        { status: 403 }
      );
    }

    const amount =
      getNinPrice(cardType);

    if (amount === null) {
      return NextResponse.json(
        {
          success: false,
          error:
            `NIN price is not configured for ${cardType}.`,
        },
        { status: 500 }
      );
    }

    const reference =
      createReference();

    transactionReference =
      reference;

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
                    decrement:
                      amount,
                  },
                },
              });

            if (
              debitResult.count !== 1
            ) {
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
        { status: 502 }
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

    if (
      providerData.success !==
      true
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
        { status: 400 }
      );
    }

    const verificationData =
      providerData.data || {};

    const details =
      verificationData.details ||
      {};

    const providerReference =
      verificationData.reference ??
      null;

    const providerTransactionId =
      verificationData.transaction_id ??
      null;

    const providerAmount =
      toPositiveNumber(
        verificationData.amount
      );

    const providerCost =
      providerAmount ??
      amount;

    const profit = Math.max(
      0,
      amount -
        providerCost
    );

    // ============================================================
    // PDF EXTRACTION
    // ============================================================

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

    console.log(
      "========== PDF EXTRACTION =========="
    );

    console.log({
      hasPdf,
      pdfLength:
        pdfBase64?.length || 0,
      providerHasPdf:
        verificationData.has_pdf,
      hasPdfBase64:
        Boolean(
          verificationData.pdf_base64
        ),
      hasPdfCamel:
        Boolean(
          verificationData.pdfBase64
        ),
      hasPdfField:
        Boolean(
          verificationData.pdf
        ),
      hasDocument:
        Boolean(
          verificationData.document
        ),
    });

    console.log(
      "====================================="
    );

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
      typeof details.lastName ===
      "string"
        ? details.lastName
        : typeof details.surname ===
          "string"
        ? details.surname
        : null;

    const gender =
      typeof details.gender ===
      "string"
        ? details.gender
        : null;

    const birthDate =
      typeof details.dateOfBirth ===
      "string"
        ? details.dateOfBirth
        : typeof details.birthDate ===
          "string"
        ? details.birthDate
        : null;

    const telephone =
      typeof details.telephone ===
      "string"
        ? details.telephone
        : typeof details.phone ===
          "string"
        ? details.phone
        : null;

    const photo =
      typeof details.photo ===
      "string"
        ? details.photo
        : null;

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
              await tx.businessWallet.findUnique({
                where: {
                  name:
                    "Brainfriend Tech",
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

            // ==================================================
            // SAVE NIN + PDF
            // ==================================================

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

                  pdfBase64:
                    pdfBase64,

                  hasPdf:
                    hasPdf,
                },
              });

            console.log(
              "NIN SAVED TO DATABASE:",
              {
                id:
                  ninVerification.id,
                reference:
                  ninVerification.reference,
                hasPdf:
                  ninVerification.hasPdf,
                pdfLength:
                  ninVerification
                    .pdfBase64
                    ?.length || 0,
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
        { status: 500 }
      );
    }

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
            providerTransactionId,

          reference,

          provider_reference:
            providerReference,

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
            result
              .ninVerification
              .hasPdf,

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
            providerCost,

          business_profit:
            result.profit,
        },
      },
      { status: 200 }
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
      { status: 500 }
    );
  }
}