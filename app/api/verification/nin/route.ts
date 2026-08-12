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
    has_pdf?: boolean;
  };
};

/* ============================================================
   HELPERS
============================================================ */

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
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
    standard: process.env.NIN_STANDARD_PRICE || "120",
    regular: process.env.NIN_REGULAR_PRICE || "120",
    premium: process.env.NIN_PREMIUM_PRICE || "120",
    vnin_slip: process.env.NIN_VNIN_SLIP_PRICE || "120",
  };

  return toPositiveNumber(prices[cardType]);
}

/* ============================================================
   REFUND ONLY WHEN PROVIDER REQUEST FAILED
============================================================ */

async function refundFailedTransaction(params: {
  transactionId: string;
  userId: string;
  amount: number;
}) {
  const { transactionId, userId, amount } = params;

  try {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });

    if (!transaction) {
      console.error(
        "NIN REFUND: Transaction not found:",
        transactionId
      );

      return false;
    }

    /*
     * Never refund an already processed transaction.
     */
    if (transaction.status !== "PENDING") {
      console.log(
        "NIN REFUND SKIPPED: Transaction already processed:",
        {
          transactionId,
          status: transaction.status,
        }
      );

      return false;
    }

    /*
     * Refund wallet.
     */
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        walletBalance: {
          increment: amount,
        },
      },
    });

    /*
     * Mark transaction FAILED.
     */
    await prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        status: "FAILED",
      },
    });

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

/* ============================================================
   POST
============================================================ */

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;
  let transactionReference: string | null = null;

  try {
    /* ========================================================
       1. AUTHENTICATION
    ======================================================== */

    const session = await getServerSession(authOptions);

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

    /* ========================================================
       2. REQUEST BODY
    ======================================================== */

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

    const nin = String(body?.nin || "").replace(/\s+/g, "");

    const cardType = String(body?.cardType || "")
      .trim()
      .toLowerCase() as NinCardType;

    /* ========================================================
       3. VALIDATE NIN
    ======================================================== */

    if (!/^\d{11}$/.test(nin)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid 11-digit NIN.",
        },
        {
          status: 400,
        }
      );
    }

    /* ========================================================
       4. VALIDATE CARD TYPE
    ======================================================== */

    if (!ALLOWED_CARD_TYPES.includes(cardType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid NIN card type.",
          allowedCardTypes: ALLOWED_CARD_TYPES,
        },
        {
          status: 400,
        }
      );
    }

    /* ========================================================
       5. FIND USER
    ======================================================== */

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

    /* ========================================================
       6. ACCOUNT STATUS
    ======================================================== */

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is not active.",
        },
        {
          status: 403,
        }
      );
    }

    /* ========================================================
       7. CUSTOMER PRICE
    ======================================================== */

    const amount = getNinPrice(cardType);

    if (amount === null) {
      return NextResponse.json(
        {
          success: false,
          error: `NIN price is not configured for ${cardType}.`,
        },
        {
          status: 500,
        }
      );
    }

    console.log("NIN CUSTOMER PRICE:", {
      cardType,
      amount,
    });

    /* ========================================================
       8. INTERNAL REFERENCE
    ======================================================== */

    const reference = createReference();

    transactionReference = reference;

    /* ========================================================
       9. DEBIT WALLET + CREATE PENDING TRANSACTION
    ======================================================== */

    let transaction;

    try {
      transaction = await prisma.$transaction(
        async (tx) => {
          /*
           * Atomic wallet debit.
           */
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

          /*
           * Create pending transaction.
           */
          return await tx.transaction.create({
            data: {
              userId,

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
          timeout: 15000,
        }
      );

      transactionId = transaction.id;

      console.log("NIN WALLET DEBIT SUCCESS:", {
        transactionId,
        reference,
        amount,
        cardType,
      });
    } catch (error: any) {
      console.error(
        "NIN WALLET RESERVATION FAILED:",
        error
      );

      const insufficient =
        error?.message === "Insufficient wallet balance.";

      return NextResponse.json(
        {
          success: false,
          error: insufficient
            ? "Insufficient wallet balance."
            : "Unable to reserve wallet funds. Please try again.",
        },
        {
          status: insufficient ? 400 : 500,
        }
      );
    }

    /* ========================================================
       10. CALL NETWORKDATASUB
       
       THIS IS THE ONLY PROVIDER CALL.
    ======================================================== */

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
  force_new: true,
  use_real_api: true,
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

          error: "NetworkDataSub request failed.",

          refunded,

          reference,

          transactionId: transaction.id,
        },
        {
          status: 502,
        }
      );
    }

    console.log(
      "NETWORKDATASUB NIN STATUS:",
      providerResponse.response.status
    );

    console.log(
      "NETWORKDATASUB NIN RESPONSE:",
      providerResponse.data
    );

    /* ========================================================
       11. PROVIDER HTTP FAILURE
    ======================================================== */

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

          providerStatus:
            providerResponse.response.status,

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

    /* ========================================================
       12. PROVIDER BUSINESS FAILURE
    ======================================================== */

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
        {
          status: 400,
        }
      );
    }

    /* ========================================================
       13. PROVIDER SUCCESS
    ======================================================== */

    const verificationData = providerData.data || {};

    const details = verificationData.details || {};

    /*
     * NetworkDataSub reference.
     */
    const providerReference =
      verificationData.reference ?? null;

    /*
     * NetworkDataSub transaction ID.
     */
    const providerTransactionId =
      verificationData.transaction_id ?? null;

    /*
     * Provider cost.
     */
    const providerAmount =
      toPositiveNumber(
        verificationData.amount
      );

    const providerCost =
      providerAmount ?? amount;

    const profit = Math.max(
      0,
      amount - providerCost
    );

    const pdfBase64 =
      typeof verificationData.pdf_base64 ===
      "string"
        ? verificationData.pdf_base64
        : null;

    const hasPdf =
      Boolean(pdfBase64);

    /* ========================================================
       14. DETAILS
    ======================================================== */

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

    console.log(
      "========== NETWORKDATASUB SUCCESS =========="
    );

    console.log({
      internalReference: reference,
      providerReference,
      providerTransactionId,
      providerAmount,
      customerAmount: amount,
      profit,
      hasPdf,
    });

    /* ========================================================
       15. GET BUSINESS WALLET BEFORE FINAL TRANSACTION
       
       IMPORTANT:
       We do this OUTSIDE the final transaction.

       This reduces the time spent inside Prisma's
       interactive transaction and prevents the old P2028
       timeout problem.
    ======================================================== */

    let businessWallet;

    try {
      businessWallet =
        await prisma.businessWallet.upsert({
          where: {
            name: "Brainfriend Tech",
          },

          update: {},

          create: {
            name: "Brainfriend Tech",

            balance: 0,

            totalRevenue: 0,

            totalCost: 0,

            totalProfit: 0,

            withdrawnProfit: 0,

            availableProfit: 0,
          },
        });
    } catch (walletError) {
      console.error(
        "BUSINESS WALLET ERROR:",
        walletError
      );

      /*
       * Provider already succeeded.
       *
       * DO NOT refund.
       */
      return NextResponse.json(
        {
          success: false,

          message:
            "NIN verification was successful, but local transaction finalization failed. Please contact support with your reference.",

          error:
            "Business wallet could not be prepared.",

          reference,

          providerReference,

          providerTransactionId,

          transactionId: transaction.id,

          status: "PENDING_REVIEW",
        },
        {
          status: 500,
        }
      );
    }

    /* ========================================================
       16. FINALIZE EVERYTHING
       
       IMPORTANT FIX:
       
       We use Prisma's array transaction instead of a long
       interactive callback.

       This removes the previous:
       
       P2028
       Transaction already closed
       timeout was 5000 ms
       
       problem.
    ======================================================== */

    let result;

    try {
      const operations = [
        prisma.transaction.update({
          where: {
            id: transaction.id,
          },

          data: {
            status: "SUCCESS",

            cost: providerCost,

            profit,
          },
        }),

        prisma.businessWallet.update({
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
        }),

        prisma.businessRevenue.create({
          data: {
            transactionId: transaction.id,

            type: "NIN",

            provider: "NetworkDataSub",

            amount,

            cost: providerCost,

            profit,

            /*
             * Use NetworkDataSub reference when available.
             * Otherwise use our internal reference.
             */
            reference:
              providerReference || reference,

            description:
              `NIN verification (${cardType})`,

            businessWalletId:
              businessWallet.id,
          },
        }),

        prisma.ninVerification.create({
          data: {
            userId,

            nin,

            cardType,

            amount,

            status: "SUCCESS",

            reference,

            transactionId: transaction.id,

            firstName,

            middleName,

            surname,

            gender,

            birthDate,

            telephone,

            photo,

            hasPdf,
          },
        }),
      ];

      const [
        updatedTransaction,
        updatedBusinessWallet,
        createdRevenue,
        ninVerification,
      ] = await prisma.$transaction(
        operations,
        {
          isolationLevel:
            "ReadCommitted",
        }
      );

      result = {
        updatedTransaction,
        updatedBusinessWallet,
        createdRevenue,
        ninVerification,
      };
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
        "INTERNAL REFERENCE:",
        reference
      );

      console.error(
        "NETWORKDATASUB REFERENCE:",
        providerReference
      );

      console.error(
        "NETWORKDATASUB TRANSACTION ID:",
        providerTransactionId
      );

      console.error(
        "LOCAL TRANSACTION ID:",
        transaction.id
      );

      console.error(
        "============================================"
      );

      /*
       * VERY IMPORTANT:
       *
       * NetworkDataSub already succeeded.
       *
       * Therefore:
       *
       * ❌ DO NOT refund
       * ❌ DO NOT call NetworkDataSub again
       *
       * Leave local transaction PENDING so it can be
       * safely reconciled.
       */

      return NextResponse.json(
        {
          success: false,

          message:
            "NIN verification was successful, but local transaction finalization failed. Your money has not been refunded. Please contact support with the reference.",

          error:
            "Local transaction finalization failed.",

          reference,

          providerReference,

          providerTransactionId,

          transactionId: transaction.id,

          status: "PENDING_REVIEW",
        },
        {
          status: 500,
        }
      );
    }

    /* ========================================================
       17. SUCCESS
    ======================================================== */

    console.log(
      "========== NIN FINALIZATION SUCCESS =========="
    );

    console.log({
      localTransactionId:
        transaction.id,

      internalReference:
        reference,

      networkDataSubReference:
        providerReference,

      networkDataSubTransactionId:
        providerTransactionId,

      cardType,

      amount,

      providerCost,

      profit,

      ninVerificationId:
        result.ninVerification.id,
    });

    console.log(
      "=============================================="
    );

    /*
     * Get the customer's current balance AFTER debit.
     */
    const updatedUser =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          walletBalance: true,
        },
      });

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

          /*
           * NetworkDataSub identifiers.
           */
          provider_transaction_id:
            providerTransactionId,

          provider_reference:
            providerReference,

          /*
           * Brainfriend internal reference.
           */
          reference,

          amount,

          provider_cost:
            providerCost,

          profit,

          card_type:
            cardType,

          status: "SUCCESS",

          details: {
            firstName,

            middleName,

            lastName:
              surname,

            gender,

            dateOfBirth:
              birthDate,

            telephone,

            photo,
          },

          pdf_base64:
            hasPdf
              ? pdfBase64
              : null,

          has_pdf:
            hasPdf,

          wallet_balance:
            updatedUser
              ? Number(
                  updatedUser.walletBalance
                )
              : null,

          business_revenue:
            amount,

          business_cost:
            providerCost,

          business_profit:
            profit,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    /* ========================================================
       GLOBAL ERROR
    ======================================================== */

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
      "TRANSACTION ID:",
      transactionId
    );

    console.error(
      "REFERENCE:",
      transactionReference
    );

    console.error(
      "=================================================="
    );

    /*
     * DO NOT automatically refund here.
     *
     * We cannot know from the global catch whether the
     * NetworkDataSub request already succeeded.
     */
    return NextResponse.json(
      {
        success: false,

        message:
          "NIN verification could not be completed. Please contact support with your transaction reference.",

        error:
          error?.message ||
          "NIN verification could not be completed.",

        transactionId,

        reference:
          transactionReference,

        status:
          transactionId
            ? "PENDING_REVIEW"
            : "FAILED",
      },
      {
        status: 500,
      }
    );
  }
}