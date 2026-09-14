import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  getServiceFeePercent,
  calculateServiceFee,
} from "@/lib/service-fee";

import { verifyTransactionPin } from "@/lib/security/verifyTransactionPin";

const NAIJARESULTPINS_API_URL =
  "https://www.naijaresultpins.com/api/v1";

const NAIJARESULTPINS_PURCHASE_URL =
  "https://www.naijaresultpins.com/api/v1/exam-card/buy";

const PROVIDER_TIMEOUT = 15000;

function generateReference() {
  return `EXAMPIN-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

function isProviderSuccessful(result: any) {
  return (
    result?.status === true ||
    result?.status === "true" ||
    result?.code === "000" ||
    result?.success === true
  );
}

function extractCards(result: any) {
  if (!Array.isArray(result?.cards)) {
    return [];
  }

  return result.cards
    .map((card: any) => ({
      pin: String(card?.pin || "").trim(),
      serial: String(card?.serial_no || "").trim(),
    }))
    .filter(
      (card: { pin: string; serial: string }) =>
        card.pin.length > 0
    );
}

async function fetchProviderResponse(
  url: string,
  options: RequestInit
) {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT),
      cache: "no-store",
    });
  } catch (error: any) {
    console.error(
      "NaijaResultPins connection error:",
      error
    );

    if (
      error?.name === "TimeoutError" ||
      error?.code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      throw new Error(
        "Exam PIN provider connection timed out. Please try again."
      );
    }

    throw new Error(
      "Unable to connect to Exam PIN provider."
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  const text = await response.text();

  let data: any = null;

  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      // Provider returned non-JSON data.
    }
  }

  return {
    response,
    contentType,
    text,
    data,
  };
}

function getProviderErrorMessage(
  status: number,
  contentType: string,
  data: any,
  text: string
) {
  if (status === 401) {
    return "Exam PIN provider authorization failed. Please check the API configuration.";
  }

  if (status === 403) {
    return "Exam PIN provider denied the API request. Please contact NaijaResultPins support to enable server-to-server API access.";
  }

  if (
    !contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    return "Exam PIN provider returned an invalid response.";
  }

  return (
    data?.message ||
    data?.error ||
    text ||
    "Unable to communicate with Exam PIN provider."
  );
}

export async function POST(req: NextRequest) {
  let localTransactionId: string | null = null;

  /*
   * These flags help us handle an important situation:
   *
   * If NaijaResultPins has already processed the purchase,
   * but our own database fails afterward, we must NOT mark
   * the transaction as FAILED automatically.
   *
   * The transaction should remain PENDING for reconciliation.
   */
 
  let providerPurchaseSucceeded = false;

  try {
    // -------------------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------------------

    const session =
      await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login to continue.",
        },
        { status: 401 }
      );
    }

    // -------------------------------------------------------
    // REQUEST BODY
    // -------------------------------------------------------

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request data.",
        },
        { status: 400 }
      );
    }

    const productId = Number(body?.productId);
    const quantity = Number(body?.quantity);

    const transactionPin = String(
      body?.transactionPin || ""
    ).trim();

    // -------------------------------------------------------
    // VALIDATE PRODUCT
    // -------------------------------------------------------

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Exam PIN product.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATE QUANTITY
    // -------------------------------------------------------

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be between 1 and 100.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATE TRANSACTION PIN
    // -------------------------------------------------------

    if (!transactionPin) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction PIN is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // API KEY
    // -------------------------------------------------------

    const apiKey =
      process.env.NAIJARESULTPINS_API_KEY;

    if (!apiKey) {
      console.error(
        "NAIJARESULTPINS_API_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Exam PIN provider is not configured.",
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------
    // GET CURRENT PROVIDER PRODUCTS
    // -------------------------------------------------------

    const productsResult =
      await fetchProviderResponse(
        NAIJARESULTPINS_API_URL,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

    const {
      response: productsResponse,
      contentType: productsContentType,
      text: productsText,
      data: productsData,
    } = productsResult;

    if (
      !productsResponse.ok ||
      !Array.isArray(productsData)
    ) {
      console.error(
        "NaijaResultPins product request failed:",
        {
          status: productsResponse.status,
          contentType: productsContentType,
          response:
            productsData || productsText,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message: getProviderErrorMessage(
            productsResponse.status,
            productsContentType,
            productsData,
            productsText
          ),
        },
        { status: 502 }
      );
    }

    // -------------------------------------------------------
    // FIND SELECTED PRODUCT
    // -------------------------------------------------------

    const providerProduct =
      productsData.find(
        (product: any) =>
          Number(product?.card_type_id) ===
          productId
      );

    if (!providerProduct) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected Exam PIN product was not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // CHECK AVAILABILITY
    // -------------------------------------------------------

    const availability = String(
      providerProduct?.availability || ""
    ).trim();

    const availabilityLower =
      availability.toLowerCase();

    const isAvailable =
      availabilityLower === "in stock" ||
      availabilityLower === "available" ||
      availabilityLower === "true";

    if (!isAvailable) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected Exam PIN is currently out of stock.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // PROVIDER PRICE
    // -------------------------------------------------------

    const unitPrice = Number(
      providerProduct?.unit_amount
    );

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Exam PIN price received from provider.",
        },
        { status: 502 }
      );
    }

    const baseAmount = Number(
      (unitPrice * quantity).toFixed(2)
    );

    // -------------------------------------------------------
    // SERVICE FEE
    // -------------------------------------------------------

    const serviceFeePercent =
      await getServiceFeePercent();

    const {
      serviceFee,
      totalAmount,
      profit,
    } = calculateServiceFee(
      baseAmount,
      serviceFeePercent
    );

    // -------------------------------------------------------
    // GET USER
    // -------------------------------------------------------

    const user =
      await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // ACCOUNT STATUS
    // -------------------------------------------------------

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // -------------------------------------------------------
    // TRANSACTION PIN
    // -------------------------------------------------------

    const pinResult = await verifyTransactionPin(
  user.id,
  transactionPin
);

if (!pinResult.success) {
  return NextResponse.json(
    {
      success: false,
      message:
        pinResult.message ||
        "Invalid transaction PIN.",
    },
    { status: 403 }
  );
}

    // -------------------------------------------------------
    // CHECK WALLET
    // -------------------------------------------------------

    if (
      Number(user.walletBalance) <
      totalAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient wallet balance.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // LOCAL REFERENCE
    // -------------------------------------------------------

    const reference =
      generateReference();

    // -------------------------------------------------------
    // CREATE PENDING TRANSACTION
    // -------------------------------------------------------

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXAM_PIN",
          amount: totalAmount,
          description:
            `Exam PIN purchase - ${providerProduct.card_name} x${quantity}`,
          status: "PENDING",
          reference,
          provider: "NaijaResultPins",
          cost: baseAmount,
          profit,
          isTest: false,
        },
      });

    localTransactionId =
      transaction.id;

    // -------------------------------------------------------
    // BUY FROM NAIJARESULTPINS
    // -------------------------------------------------------

    

    let purchaseResult;

    try {
      purchaseResult =
        await fetchProviderResponse(
          NAIJARESULTPINS_PURCHASE_URL,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              card_type_id: String(productId),
              quantity: String(quantity),
            }),
          }
        );
    } catch (error: any) {
      /*
       * We cannot know whether the provider processed
       * the purchase when the request times out.
       *
       * Therefore, keep the transaction PENDING.
       */

      console.error(
        "NaijaResultPins purchase connection error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error?.message ||
            "Unable to confirm Exam PIN purchase with provider.",
          reference,
          status: "PENDING",
        },
        { status: 502 }
      );
    }

    const {
      response: providerResponse,
      contentType: providerContentType,
      text: providerText,
      data: providerResult,
    } = purchaseResult;

    // -------------------------------------------------------
    // LOG PROVIDER RESPONSE
    // -------------------------------------------------------

    console.log(
      "NaijaResultPins purchase response:",
      {
        httpStatus:
          providerResponse.status,
        contentType:
          providerContentType,
        status:
          providerResult?.status,
        code:
          providerResult?.code,
        message:
          providerResult?.message,
        reference:
          providerResult?.reference,
        quantity:
          providerResult?.quantity,
        amount:
          providerResult?.amount,
      }
    );

    // -------------------------------------------------------
    // PROVIDER NON-JSON RESPONSE
    // -------------------------------------------------------

    if (
      !providerResult ||
      typeof providerResult !== "object" ||
      Array.isArray(providerResult)
    ) {
      /*
       * A non-JSON response does not prove that the provider
       * failed to process the purchase.
       *
       * Keep the transaction PENDING.
       */

      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: "PENDING",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: getProviderErrorMessage(
            providerResponse.status,
            providerContentType,
            providerResult,
            providerText
          ),
          reference,
          status: "PENDING",
        },
        { status: 502 }
      );
    }

    // -------------------------------------------------------
    // PROVIDER PURCHASE FAILURE
    // -------------------------------------------------------

    if (
      !providerResponse.ok ||
      !isProviderSuccessful(providerResult)
    ) {
      const providerMessage =
        providerResult?.message ||
        providerResult?.error ||
        "NaijaResultPins purchase failed.";

      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: "FAILED",
        },
      });

      localTransactionId = null;

      return NextResponse.json(
        {
          success: false,
          message: providerMessage,
          reference,
          providerReference:
            providerResult?.reference ||
            null,
          status: "FAILED",
        },
        {
          status:
            providerResponse.status >= 400
              ? 400
              : 502,
        }
      );
    }

    // -------------------------------------------------------
    // PROVIDER PURCHASE SUCCESS
    // -------------------------------------------------------

    providerPurchaseSucceeded = true;

    // -------------------------------------------------------
    // EXTRACT CARDS
    // -------------------------------------------------------

    const cards =
      extractCards(providerResult);

    if (cards.length < quantity) {
      /*
       * Provider says the transaction succeeded, but did not
       * return all requested PINs.
       *
       * Do NOT deduct the user's wallet yet.
       * Keep transaction PENDING for reconciliation.
       */

      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: "PENDING",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Provider confirmed the purchase, but did not return all requested Exam PINs. Please contact support with the transaction reference.",
          reference,
          providerReference:
            providerResult?.reference ||
            null,
          quantity,
          receivedCards:
            cards.length,
          status: "PENDING",
        },
        { status: 502 }
      );
    }

    // -------------------------------------------------------
    // PROVIDER AMOUNT
    // -------------------------------------------------------

    const providerAmount = Number(
      providerResult?.amount
    );

    /*
     * Normally provider amount should equal:
     *
     * unitPrice × quantity
     *
     * We keep our calculated amount as the accounting cost
     * because it was used to calculate the customer's charge.
     */

    if (
      Number.isFinite(providerAmount) &&
      providerAmount > 0 &&
      Math.abs(
        providerAmount - baseAmount
      ) > 0.01
    ) {
      console.warn(
        "NaijaResultPins amount differs from calculated cost:",
        {
          calculatedAmount: baseAmount,
          providerAmount,
          reference,
        }
      );
    }

    // -------------------------------------------------------
    // FINAL DATABASE TRANSACTION
    // -------------------------------------------------------

    const completed =
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
              "User account no longer exists."
            );
          }

          // -------------------------------------------------
          // RE-CHECK WALLET
          // -------------------------------------------------

          if (
            Number(
              freshUser.walletBalance
            ) < totalAmount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // -------------------------------------------------
          // BUSINESS WALLET
          // -------------------------------------------------

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
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                availableProfit: 0,
              },
            });

          // -------------------------------------------------
          // DEDUCT USER WALLET
          // -------------------------------------------------

          await tx.user.update({
            where: {
              id: freshUser.id,
            },
            data: {
              walletBalance: {
                decrement:
                  totalAmount,
              },
            },
          });

          // -------------------------------------------------
          // COMPLETE TRANSACTION
          // -------------------------------------------------

          const updatedTransaction =
            await tx.transaction.update({
              where: {
                id: transaction.id,
              },
              data: {
                status: "SUCCESS",
                cost: baseAmount,
                profit,
              },
            });

          // -------------------------------------------------
          // UPDATE BUSINESS WALLET
          // -------------------------------------------------

          await tx.businessWallet.update({
            where: {
              id: businessWallet.id,
            },
            data: {
              totalRevenue: {
                increment:
                  totalAmount,
              },
              totalCost: {
                increment:
                  baseAmount,
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

          // -------------------------------------------------
          // BUSINESS REVENUE
          // -------------------------------------------------

          await tx.businessRevenue.create({
            data: {
              type: "EXAM_PIN",
              provider:
                "NaijaResultPins",
              amount:
                totalAmount,
              cost:
                baseAmount,
              profit,
              reference,
              description:
                `Exam PIN purchase - ${providerProduct.card_name} x${quantity}`,
              walletId:
                businessWallet.id,
            },
          });

          // -------------------------------------------------
          // SAVE EXAM PINS
          // -------------------------------------------------

          for (const card of cards) {
            await tx.examPin.create({
              data: {
                userId:
                  freshUser.id,
                examName:
                  providerProduct.card_name,
                provider:
                  "NaijaResultPins",
                pin:
                  card.pin,
                serial:
                  card.serial,
                amount:
                  unitPrice,
                reference,
              },
            });
          }

          return {
            transaction:
              updatedTransaction,

            walletBalance:
              Number(
                freshUser.walletBalance
              ) - totalAmount,
          };
        }
      );

    // -------------------------------------------------------
    // SUCCESS RESPONSE
    // -------------------------------------------------------

    localTransactionId = null;

    return NextResponse.json({
      success: true,

      message:
        providerResult?.message ||
        "Exam PIN purchase successful.",

      examName:
        providerProduct.card_name,

      quantity,

      unitPrice,

      baseAmount,

      serviceFee,

      serviceFeePercent,

      totalAmount,

      profit,

      reference,

      provider:
        "NaijaResultPins",

      providerReference:
        providerResult?.reference ||
        null,

      walletBalance:
        completed.walletBalance,

      cards,

      pins: cards.map(
        (card) => card.pin
      ),

      status: "SUCCESS",
    });
  } catch (error: any) {
    console.error(
      "Exam PIN purchase error:",
      error
    );

    // -------------------------------------------------------
    // HANDLE LOCAL TRANSACTION AFTER PROVIDER RESPONSE
    // -------------------------------------------------------

    if (localTransactionId) {
      try {
        /*
         * If NaijaResultPins already confirmed the purchase,
         * we cannot safely mark our transaction as FAILED if
         * our database operation fails afterward.
         *
         * Keep it PENDING so it can be reconciled.
         */
        await prisma.transaction.update({
          where: {
            id: localTransactionId,
          },
          data: {
            status:
              providerPurchaseSucceeded
                ? "PENDING"
                : "FAILED",
          },
        });
      } catch (updateError) {
        console.error(
          "Failed to update Exam PIN transaction status:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          providerPurchaseSucceeded
            ? "Exam PIN provider confirmed the purchase, but we could not finish recording it. Please contact support with the transaction reference."
            : error?.message ||
              "Unable to complete Exam PIN purchase.",
        status:
          providerPurchaseSucceeded
            ? "PENDING"
            : "FAILED",
      },
      {
        status:
          providerPurchaseSucceeded
            ? 502
            : 500,
      }
    );
  }
}