
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { networkDataSubRequest } from "@/lib/networkdatasub";

const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;
const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";

const ALLOWED_CARD_TYPES = [
  "standard",
  "regular",
  "premium",
  "vnin_slip",
] as const;

type CardType = (typeof ALLOWED_CARD_TYPES)[number];

type PricingItem = {
  card_type?: string;
  price?: string | number | null;
  is_active?: boolean | number | string;
};

const FALLBACK_PROVIDER_PRICES: Record<CardType, number> = {
  standard: 100,
  regular: 150,
  premium: 200,
  vnin_slip: 150,
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeCardType(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function toPositiveNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/₦/g, "")
      .trim()
  );

  if (
    !Number.isFinite(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

function isActive(item: PricingItem): boolean {
  if (item.is_active === undefined) {
    return true;
  }

  if (item.is_active === true) {
    return true;
  }

  if (item.is_active === 1) {
    return true;
  }

  return [
    "true",
    "1",
    "active",
    "enabled",
  ].includes(
    String(item.is_active)
      .trim()
      .toLowerCase()
  );
}

/*
|--------------------------------------------------------------------------
| NORMALIZE PHONE
|--------------------------------------------------------------------------
*/

function normalizePhone(value: unknown): string {
  let phone = String(value || "").trim();

  phone = phone.replace(
    /[\s\-()]/g,
    ""
  );

  if (phone.startsWith("+234")) {
    phone = "0" + phone.substring(4);
  } else if (
    phone.startsWith("234") &&
    phone.length === 13
  ) {
    phone = "0" + phone.substring(3);
  }

  return phone;
}

/*
|--------------------------------------------------------------------------
| SERVICE FEE
|--------------------------------------------------------------------------
*/

async function getServiceFeePercentage(): Promise<number> {
  try {
    const setting =
      await prisma.systemSetting.findUnique({
        where: {
          key: SERVICE_FEE_SETTING_KEY,
        },
      });

    if (!setting) {
      return DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    const value = Number(setting.value);

    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 100
    ) {
      return DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    return value;
  } catch (error) {
    console.error(
      "PHONE SERVICE FEE ERROR:",
      error
    );

    return DEFAULT_SERVICE_FEE_PERCENTAGE;
  }
}

/*
|--------------------------------------------------------------------------
| PROVIDER PRICES
|--------------------------------------------------------------------------
*/

async function getProviderPrices(): Promise<
  Record<CardType, number>
> {
  try {
    const response =
      await networkDataSubRequest<any>(
        "/verification/nin/pricing"
      );

    console.log(
      "NETWORKDATASUB NIN PRICING STATUS:",
      response?.response?.status
    );

    console.log(
      "NETWORKDATASUB NIN PRICING RESPONSE:",
      JSON.stringify(
        response?.data || {},
        null,
        2
      )
    );

    const providerData =
      response?.data;

    const items: PricingItem[] =
      Array.isArray(providerData?.data)
        ? providerData.data
        : Array.isArray(
            providerData?.data?.data
          )
        ? providerData.data.data
        : [];

    const prices: Record<CardType, number> = {
      ...FALLBACK_PROVIDER_PRICES,
    };

    for (const item of items) {
      if (!item || !isActive(item)) {
        continue;
      }

      const normalized =
        normalizeCardType(
          item.card_type
        );

      /*
       * NetworkDataSub may return
       * "slip" instead of "vnin_slip".
       */
      const cardType =
        normalized === "slip"
          ? "vnin_slip"
          : normalized;

      if (
        !ALLOWED_CARD_TYPES.includes(
          cardType as CardType
        )
      ) {
        continue;
      }

      const price =
        toPositiveNumber(
          item.price
        );

      if (price !== null) {
        prices[
          cardType as CardType
        ] = price;
      }
    }

    return prices;
  } catch (error) {
    console.error(
      "NETWORKDATASUB PRICING ERROR:",
      error
    );

    return {
      ...FALLBACK_PROVIDER_PRICES,
    };
  }
}

/*
|--------------------------------------------------------------------------
| BUILD SELLING PRICING
|--------------------------------------------------------------------------
*/

function buildPricing(
  providerPrices: Record<CardType, number>,
  feePercentage: number
) {
  const result: Record<
    CardType,
    {
      basePrice: number;
      serviceFee: number;
      price: number;
      serviceFeePercentage: number;
      apiPrice: number;
    }
  > = {} as any;

  for (const cardType of ALLOWED_CARD_TYPES) {
    const basePrice =
      providerPrices[cardType];

    const serviceFee = Number(
      (
        basePrice *
        (feePercentage / 100)
      ).toFixed(2)
    );

    const price = Number(
      (
        basePrice +
        serviceFee
      ).toFixed(2)
    );

    result[cardType] = {
      basePrice,
      serviceFee,
      price,
      serviceFeePercentage:
        feePercentage,
      apiPrice: basePrice,
    };
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| GET PRICING
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const feePercentage =
      await getServiceFeePercentage();

    const providerPrices =
      await getProviderPrices();

    const pricing =
      buildPricing(
        providerPrices,
        feePercentage
      );

    return NextResponse.json({
      success: true,
      data: pricing,
      serviceFeePercentage:
        feePercentage,
    });
  } catch (error) {
    console.error(
      "PHONE PRICING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load phone verification pricing.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST PHONE VERIFICATION
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  let transactionId: string | null = null;
  let currentUserId: string | null = null;
  let chargedAmount = 0;

  try {
    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATION
    |--------------------------------------------------------------------------
    */

    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        { status: 401 }
      );
    }

    currentUserId =
      session.user.id;

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
          message:
            "Invalid request body.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PHONE
    |--------------------------------------------------------------------------
    */

    const phone =
      normalizePhone(body?.phone);

    /*
    |--------------------------------------------------------------------------
    | CARD TYPE
    |--------------------------------------------------------------------------
    */

    const normalizedCardType =
      normalizeCardType(
        body?.cardType ||
          body?.card_type
      );

    const cardType =
      normalizedCardType === "slip"
        ? "vnin_slip"
        : (normalizedCardType as CardType);

    /*
    |--------------------------------------------------------------------------
    | VALIDATE PHONE
    |--------------------------------------------------------------------------
    */

    if (!/^0\d{10}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid Nigerian 11-digit phone number.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE CARD TYPE
    |--------------------------------------------------------------------------
    */

    if (
      !ALLOWED_CARD_TYPES.includes(
        cardType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid verification type.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | USER
    |--------------------------------------------------------------------------
    */

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User not found.",
        },
        { status: 404 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is not active.",
        },
        { status: 403 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PRICING
    |--------------------------------------------------------------------------
    */

    const feePercentage =
      await getServiceFeePercentage();

    const providerPrices =
      await getProviderPrices();

    const pricing =
      buildPricing(
        providerPrices,
        feePercentage
      );

    const selectedPricing =
      pricing[cardType];

    if (!selectedPricing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pricing unavailable for this verification type.",
        },
        { status: 400 }
      );
    }

    const amount =
      selectedPricing.price;

    const providerCost =
      selectedPricing.apiPrice;

    const profit = Number(
      (
        amount -
        providerCost
      ).toFixed(2)
    );

    chargedAmount =
      amount;

    /*
    |--------------------------------------------------------------------------
    | WALLET CHECK
    |--------------------------------------------------------------------------
    */

    const walletBalance =
      Number(user.walletBalance);

    if (
      !Number.isFinite(walletBalance) ||
      walletBalance < amount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insufficient wallet balance.",
          balance:
            walletBalance,
          required:
            amount,
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | REFERENCE
    |--------------------------------------------------------------------------
    */

    const reference =
      `PHONE-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    /*
    |--------------------------------------------------------------------------
    | DEBIT USER + CREATE PENDING TRANSACTION
    |--------------------------------------------------------------------------
    */

    const transaction =
      await prisma.$transaction(
        async (tx) => {
          const debit =
            await tx.user.updateMany({
              where: {
                id: user.id,
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

          if (debit.count !== 1) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          return tx.transaction.create({
            data: {
              userId: user.id,
              type: "NIN",
              amount,
              description:
                `NIN phone verification (${cardType}) - ${phone}`,
              status: "PENDING",
              reference,
              provider:
                "NetworkDataSub",
              cost: providerCost,
              profit,
            },
          });
        }
      );

    transactionId =
      transaction.id;

    /*
    |--------------------------------------------------------------------------
    | CALL NETWORKDATASUB
    |--------------------------------------------------------------------------
    */

    let providerResponse: any;

    try {
      providerResponse =
        await networkDataSubRequest<any>(
          "/verification/nin/phone-search",
          {
            method: "POST",
            body: {
              phone,
              card_type:
                cardType,
            },
          }
        );
    } catch (providerError) {
      console.error(
        "NETWORKDATASUB PHONE REQUEST ERROR:",
        providerError
      );

      await refundTransaction({
        transactionId,
        userId: user.id,
        amount,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "NetworkDataSub could not be reached.",
          reference,
          refunded: true,
        },
        { status: 502 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LOG PROVIDER RESPONSE
    |--------------------------------------------------------------------------
    */

    const providerData =
      providerResponse?.data;

    console.log(
      "NETWORKDATASUB PHONE HTTP STATUS:",
      providerResponse?.response?.status
    );

    console.log(
      "NETWORKDATASUB PHONE HTTP OK:",
      providerResponse?.response?.ok
    );

    console.log(
      "NETWORKDATASUB PHONE RESPONSE:",
      JSON.stringify(
        providerData || {},
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
      !providerResponse?.response?.ok ||
      !providerData
    ) {
      await refundTransaction({
        transactionId,
        userId: user.id,
        amount,
      });

      let providerMessage =
        "NetworkDataSub rejected the phone verification request.";

      if (
        typeof providerData?.message ===
        "string"
      ) {
        providerMessage =
          providerData.message;
      } else if (
        typeof providerData?.error ===
        "string"
      ) {
        providerMessage =
          providerData.error;
      } else if (
        providerData?.errors
      ) {
        providerMessage =
          JSON.stringify(
            providerData.errors
          );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            providerMessage,
          providerStatus:
            providerResponse?.response
              ?.status || null,
          providerResponse:
            providerData || null,
          reference,
          refunded: true,
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PROVIDER APPLICATION ERROR
    |--------------------------------------------------------------------------
    */

    if (
      providerData.success !== true
    ) {
      await refundTransaction({
        transactionId,
        userId: user.id,
        amount,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            providerData.message ||
            providerData.error ||
            "NetworkDataSub rejected the phone verification request.",
          providerErrors:
            providerData.errors ||
            null,
          providerData:
            providerData.data ||
            null,
          reference,
          refunded: true,
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PROVIDER DATA
    |--------------------------------------------------------------------------
    */

    const providerDetails =
      providerData?.data
        ?.details ||
      providerData?.data ||
      {};

    /*
    |--------------------------------------------------------------------------
    | EXTRACT DETAILS
    |--------------------------------------------------------------------------
    */

    const firstName =
      typeof providerDetails.firstName ===
      "string"
        ? providerDetails.firstName
        : typeof providerDetails.first_name ===
          "string"
        ? providerDetails.first_name
        : null;

    const middleName =
      typeof providerDetails.middleName ===
      "string"
        ? providerDetails.middleName
        : typeof providerDetails.middle_name ===
          "string"
        ? providerDetails.middle_name
        : null;

    const surname =
      typeof providerDetails.surname ===
      "string"
        ? providerDetails.surname
        : typeof providerDetails.lastName ===
          "string"
        ? providerDetails.lastName
        : typeof providerDetails.last_name ===
          "string"
        ? providerDetails.last_name
        : null;

    const gender =
      typeof providerDetails.gender ===
      "string"
        ? providerDetails.gender
        : null;

    const birthDate =
      typeof providerDetails.birthDate ===
      "string"
        ? providerDetails.birthDate
        : typeof providerDetails.dateOfBirth ===
          "string"
        ? providerDetails.dateOfBirth
        : typeof providerDetails.date_of_birth ===
          "string"
        ? providerDetails.date_of_birth
        : null;

    const telephone =
      typeof providerDetails.telephoneNo ===
      "string"
        ? providerDetails.telephoneNo
        : typeof providerDetails.phoneNumber ===
          "string"
        ? providerDetails.phoneNumber
        : typeof providerDetails.telephone ===
          "string"
        ? providerDetails.telephone
        : typeof providerDetails.phone ===
          "string"
        ? providerDetails.phone
        : phone;

    const nin =
      typeof providerDetails.nin ===
      "string"
        ? providerDetails.nin
        : typeof providerDetails.ninNumber ===
          "string"
        ? providerDetails.ninNumber
        : null;

    const photo =
      typeof providerDetails.photo ===
      "string"
        ? providerDetails.photo
        : typeof providerDetails.image ===
          "string"
        ? providerDetails.image
        : typeof providerDetails.photoUrl ===
          "string"
        ? providerDetails.photoUrl
        : null;

    const pdfBase64 =
      typeof providerData?.data
        ?.pdf_base64 === "string"
        ? providerData.data.pdf_base64
        : null;

    const hasPdf =
      providerData?.data
        ?.has_pdf === true ||
      Boolean(pdfBase64);

    /*
    |--------------------------------------------------------------------------
    | FINALIZE DATABASE
    |--------------------------------------------------------------------------
    */

    const result =
      await prisma.$transaction(
        async (tx) => {
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

          const updatedWallet =
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
                `NIN phone verification (${cardType}) - ${phone}`,
              businessWalletId:
                businessWallet.id,
            },
          });

          const verification =
            await tx.phoneVerification.create({
              data: {
                userId: user.id,
                phone,
                cardType,
                amount,
                cost:
                  providerCost,
                profit,
                reference,
                transactionId:
                  transaction.id,
                status:
                  "SUCCESS",
                firstName,
                middleName,
                surname,
                gender,
                birthDate,
                telephone,
                nin,
                photo,
              },
            });

          const freshUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
              select: {
                walletBalance: true,
              },
            });

          return {
            verification,
            walletBalance:
              Number(
                freshUser?.walletBalance ||
                  0
              ),
            businessBalance:
              Number(
                updatedWallet.balance
              ),
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | SUCCESS RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,
      message:
        providerData.message ||
        "Phone number verification completed successfully.",
      data: {
        verification_id:
          result.verification.id,

        transaction_id:
          transaction.id,

        reference,

        phone,

        card_type:
          cardType,

        basePrice:
          selectedPricing.basePrice,

        serviceFeePercentage:
          feePercentage,

        serviceFee:
          selectedPricing.serviceFee,

        amount,

        providerCost,

        profit,

        details: {
          firstName,
          middleName,
          surname,
          gender,
          birthDate,
          telephone,
          nin,
          photo,
        },

        pdf_base64:
          pdfBase64,

        has_pdf:
          hasPdf,

        wallet_balance:
          result.walletBalance,

        business_revenue:
          amount,

        business_cost:
          providerCost,

        business_profit:
          profit,
      },
    });
  } catch (error: any) {
    console.error(
      "PHONE VERIFICATION FATAL ERROR:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | REFUND IF ALREADY DEBITED
    |--------------------------------------------------------------------------
    */

    if (
      transactionId &&
      currentUserId &&
      chargedAmount > 0
    ) {
      await refundTransaction({
        transactionId,
        userId: currentUserId,
        amount: chargedAmount,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Phone verification failed.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| REFUND FAILED TRANSACTION
|--------------------------------------------------------------------------
*/

async function refundTransaction(params: {
  transactionId: string;
  userId: string;
  amount: number;
}) {
  const {
    transactionId,
    userId,
    amount,
  } = params;

  if (
    !transactionId ||
    !userId ||
    amount <= 0
  ) {
    return;
  }

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
          return;
        }

        /*
         * Only pending transactions
         * can be refunded.
         */
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
              increment:
                amount,
            },
          },
        });

        await tx.transaction.update({
          where: {
            id: transactionId,
          },
          data: {
            status:
              "FAILED",
          },
        });
      }
    );
  } catch (error) {
    console.error(
      "PHONE VERIFICATION REFUND ERROR:",
      error
    );
  }
}

