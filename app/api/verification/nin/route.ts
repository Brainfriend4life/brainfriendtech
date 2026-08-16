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
      mobile?: string | null;
      photo?: string | null;
      [key: string]: unknown;
    };

    pdf_base64?: string | null;
    has_pdf?: boolean;

    [key: string]: unknown;
  };
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

function getNinPrice(cardType: NinCardType): number | null {
  const prices: Record<NinCardType, string | undefined> = {
    standard: process.env.NIN_STANDARD_PRICE || "150",
    regular: process.env.NIN_REGULAR_PRICE || "150",
    premium: process.env.NIN_PREMIUM_PRICE || "150",
    vnin_slip: process.env.NIN_VNIN_SLIP_PRICE || "150",
  };

  return toPositiveNumber(prices[cardType]);
}

// ============================================================
// PDF EXTRACTION
//
// NetworkDataSub's field name for the PDF has not been confirmed
// to be stable across card types / response variants, so this
// checks every plausible field name at both the top level of
// `data` and inside `data.details`. This does NOT invent a PDF
// that the provider did not send — it only widens where we look
// for one that WAS sent.
// ============================================================

function extractProviderPdf(
  verificationData: Record<string, unknown>,
  details: Record<string, unknown>
): string | null {
  const candidates = [
    verificationData.pdf_base64,
    verificationData.slip_base64,
    verificationData.document_base64,
    verificationData.pdf,
    verificationData.document,
    details.pdf_base64,
    details.slip_base64,
    details.pdf,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

async function refundFailedTransaction(params: {
  transactionId: string;
  userId: string;
  amount: number;
}) {
  const { transactionId, userId, amount } = params;

  try {
    await prisma.$transaction(
      async (tx) => {
        const transaction = await tx.transaction.findUnique({
          where: {
            id: transactionId,
          },
        });

        if (!transaction) {
          throw new Error("Transaction not found during refund.");
        }

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

    console.log("NIN REFUND SUCCESS:", {
      transactionId,
      userId,
      amount,
    });

    return true;
  } catch (error) {
    console.error("NIN REFUND FAILED:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;
  let transactionReference: string | null = null;

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

    const nin = String(body?.nin || "").replace(/\s+/g, "");

    const cardType = String(body?.cardType || "")
      .trim()
      .toLowerCase() as NinCardType;

    // ============================================================
    // 3. VALIDATE NIN
    // ============================================================

    if (!/^\d{11}$/.test(nin)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid 11-digit NIN.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 4. VALIDATE CARD TYPE
    // ============================================================

    if (!ALLOWED_CARD_TYPES.includes(cardType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid NIN card type.",
          allowedCardTypes: ALLOWED_CARD_TYPES,
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 5. FIND USER
    // ============================================================

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
        { status: 404 }
      );
    }

    // ============================================================
    // 6. ACCOUNT STATUS
    // ============================================================

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
    // 7. GET SELLING PRICE
    // ============================================================

    const amount = getNinPrice(cardType);

    if (amount === null) {
      return NextResponse.json(
        {
          success: false,
          error: `NIN price is not configured for ${cardType}.`,
        },
        { status: 500 }
      );
    }

    console.log("NIN LOCAL PRICING:", {
      cardType,
      customerPrice: amount,
    });

    // ============================================================
    // 8. CREATE INTERNAL REFERENCE
    // ============================================================

    const reference = createReference();

    transactionReference = reference;

    // ============================================================
    // 9. ATOMIC WALLET DEBIT + TRANSACTION
    // ============================================================

    let transaction;

    try {
      transaction = await prisma.$transaction(
        async (tx) => {
          const debitResult = await tx.user.updateMany({
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
            throw new Error("Insufficient wallet balance.");
          }

          return await tx.transaction.create({
            data: {
              userId: user.id,
              type: "NIN",
              amount,
              description: `NIN verification (${cardType})`,
              status: "PENDING",
              reference,
              provider: "NetworkDataSub",
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

      transactionId = transaction.id;

      console.log("NIN WALLET DEBIT SUCCESS:", {
        transactionId: transaction.id,
        reference,
        amount,
        cardType,
      });
    } catch (error: any) {
      console.error("NIN WALLET RESERVATION FAILED:", error);

      const insufficientBalance =
        error?.message === "Insufficient wallet balance.";

      return NextResponse.json(
        {
          success: false,
          error: insufficientBalance
            ? "Insufficient wallet balance."
            : "Unable to reserve wallet funds. Please try again.",
        },
        {
          status: insufficientBalance ? 400 : 500,
        }
      );
    }

    // ============================================================
    // 10. CALL NETWORKDATASUB
    // ============================================================

    let providerResponse;

    try {
      providerResponse =
        await networkDataSubRequest<ProviderNinResponse>(
          "/verification/nin",
          {
            method: "POST",

            body: {
              nin,
              card_type: cardType,

              // IMPORTANT:
              // Force a fresh verification every time so the
              // provider does not reuse an old cached record that
              // may not have a PDF attached. Per NetworkDataSub's
              // docs, standard verification is supposed to always
              // return pdf_base64 / has_pdf: true — force_new
              // ensures we get a live result instead of a stale
              // cached one.
              force_new: true,
            },
          }
        );
    } catch (providerError) {
      console.error(
        "NETWORKDATASUB NIN REQUEST ERROR:",
        providerError
      );

      const refunded = await refundFailedTransaction({
        transactionId: transaction.id,
        userId,
        amount,
      });

      return NextResponse.json(
        {
          success: false,
          message: refunded
            ? "NetworkDataSub could not be reached. Your wallet has been refunded."
            : "NetworkDataSub could not be reached. Please contact support with your transaction reference.",
          error: refunded
            ? "NetworkDataSub could not be reached. Your wallet has been refunded."
            : "NetworkDataSub could not be reached.",
          refunded,
          reference,
          transactionId: transaction.id,
        },
        { status: 502 }
      );
    }

    console.log(
      "NETWORKDATASUB NIN VERIFICATION STATUS:",
      providerResponse.response.status
    );

    console.log(
      "NETWORKDATASUB NIN VERIFICATION RESPONSE:",
      JSON.stringify(providerResponse.data, null, 2)
    );

    // ============================================================
    // 11. PROVIDER HTTP FAILURE
    // ============================================================

    if (
      !providerResponse.response.ok ||
      !providerResponse.data
    ) {
      const providerMessage =
        providerResponse.data?.message ||
        "NIN verification failed.";

      const refunded = await refundFailedTransaction({
        transactionId: transaction.id,
        userId,
        amount,
      });

      return NextResponse.json(
        {
          success: false,
          message: refunded
            ? `${providerMessage} Your wallet has been refunded.`
            : `${providerMessage} Please contact support with your transaction reference.`,
          error: providerMessage,
          providerStatus: providerResponse.response.status,
          refunded,
          reference,
          transactionId: transaction.id,
        },
        {
          status:
            providerResponse.response.status >= 400 &&
            providerResponse.response.status < 500
              ? 400
              : 502,
        }
      );
    }

    // ============================================================
    // 12. PROVIDER BUSINESS FAILURE
    // ============================================================

    const providerData = providerResponse.data;

    if (providerData.success !== true) {
      const providerMessage =
        providerData.message ||
        "NIN verification failed.";

      const refunded = await refundFailedTransaction({
        transactionId: transaction.id,
        userId,
        amount,
      });

      return NextResponse.json(
        {
          success: false,
          message: refunded
            ? `${providerMessage} Your wallet has been refunded.`
            : `${providerMessage} Please contact support with your transaction reference.`,
          error: providerMessage,
          refunded,
          reference,
          transactionId: transaction.id,
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 13. EXTRACT PROVIDER RESULT
    // ============================================================

    const verificationData =
      providerData.data || {};

    const details =
      verificationData.details || {};

    const providerReference =
      verificationData.reference ?? null;

    const providerTransactionId =
      verificationData.transaction_id ?? null;

    const providerAmount =
      toPositiveNumber(
        verificationData.amount
      );

    // ============================================================
    // 14. PDF
    //
    // We ONLY save a PDF if NetworkDataSub actually returns one.
    // We DO NOT automatically call the separate slip endpoint.
    //
    // extractProviderPdf() checks every plausible field name/
    // location so we don't miss a PDF that's just under a
    // different key than we originally assumed.
    // ============================================================

    const pdfBase64 = extractProviderPdf(
      verificationData as Record<string, unknown>,
      details as Record<string, unknown>
    );

    const hasPdf = Boolean(pdfBase64);

    // TEMPORARY DIAGNOSTIC — remove once the PDF issue is confirmed
    // resolved. Shows every key the provider actually returned, so
    // if a PDF is still missing we can see whether it's absent
    // entirely or hiding under a field name we haven't added above.
    console.log("NIN RAW PROVIDER DATA KEYS:", {
      topLevelKeys: Object.keys(verificationData as object),
      detailsKeys: Object.keys(details as object),
    });

    // ============================================================
    // 15. PROVIDER COST / PROFIT
    // ============================================================

    const providerCost =
      providerAmount ?? amount;

    const profit = Number(
      Math.max(
        0,
        amount - providerCost
      ).toFixed(2)
    );

    // ============================================================
    // 16. EXTRACT NIN DETAILS
    // ============================================================

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
        : typeof details.mobile === "string"
        ? details.mobile
        : null;

    const photo =
      typeof details.photo === "string"
        ? details.photo
        : null;

    console.log("NIN PROVIDER RESULT:", {
      providerAmount,
      providerCost,
      customerPrice: amount,
      profit,
      providerReference,
      providerTransactionId,
      providerHasPdf:
        verificationData.has_pdf === true,
      hasPdf,
      pdfLength:
        pdfBase64?.length || 0,
      firstName,
      middleName,
      surname,
      gender,
      birthDate,
      telephone,
      hasPhoto: Boolean(photo),
    });

    // ============================================================
    // 17. FINALIZE SUCCESS
    // ============================================================

    let result;

    try {
      result = await prisma.$transaction(
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

          // ------------------------------------------------------
          // BUSINESS WALLET
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // FRESH USER BALANCE
          // ------------------------------------------------------

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

          const freshBalance =
            Number(
              freshUser.walletBalance
            );

          // ------------------------------------------------------
          // UPDATE TRANSACTION
          // ------------------------------------------------------

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },
            data: {
              status: "SUCCESS",
              cost: providerCost,
              profit,
            },
          });

          // ------------------------------------------------------
          // UPDATE BUSINESS WALLET
          // ------------------------------------------------------

          const updatedBusinessWallet =
            await tx.businessWallet.update({
              where: {
                id: businessWallet.id,
              },
              data: {
                balance: {
                  increment: amount,
                },

                totalRevenue: {
                  increment: amount,
                },

                totalCost: {
                  increment: providerCost,
                },

                totalProfit: {
                  increment: profit,
                },

                availableProfit: {
                  increment: profit,
                },
              },
            });

          // ------------------------------------------------------
          // BUSINESS REVENUE
          // ------------------------------------------------------

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

          // ------------------------------------------------------
          // SAVE NIN VERIFICATION
          // ------------------------------------------------------

          const ninVerification =
            await tx.ninVerification.create({
              data: {
                userId: user.id,

                nin,

                cardType,

                amount,

                status: "SUCCESS",

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
            });

          return {
            ninVerification,

            walletBalance:
              freshBalance,

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
        "STACK:",
        error?.stack
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

          providerReference,

          providerTransactionId,

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
        { status: 500 }
      );
    }

    // ============================================================
    // 18. SUCCESS RESPONSE
    // ============================================================

    console.log(
      "NIN VERIFICATION SUCCESS:",
      {
        verificationId:
          result.ninVerification.id,

        transactionId:
          transaction.id,

        reference,

        cardType,

        amount,

        providerCost,

        profit,

        hasPdf:
          result.ninVerification.hasPdf,

        pdfLength:
          result.ninVerification.pdfBase64?.length ||
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
            result.ninVerification.id,

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
            result.ninVerification.hasPdf,

          pdf_url:
            result.ninVerification.hasPdf
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
      { status: 500 }
    );
  }
}