import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CHEAPDATAHUB_EXAM_PURCHASE_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/exam-pin/purchase/";

const EXAM_PRODUCTS: Record<
  number,
  {
    examName: string;
    price: number;
  }
> = {
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

export async function POST(
  request: NextRequest
) {
  try {
    // ==========================================
    // AUTHENTICATION
    // ==========================================

    const session =
      await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // REQUEST BODY
    // ==========================================

    const body = await request.json();

    const productId = Number(
      body.productId ??
        body.product_id
    );

    const quantity = Number(
      body.quantity
    );

    console.log(
      "========== EXAM PIN PURCHASE =========="
    );

    console.log(
      "PRODUCT ID:",
      productId
    );

    console.log(
      "QUANTITY:",
      quantity
    );

    // ==========================================
    // VALIDATE PRODUCT
    // ==========================================

    const product =
      EXAM_PRODUCTS[productId];

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid exam PIN product.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATE QUANTITY
    // ==========================================

    if (
      ![1, 2, 5].includes(quantity)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Quantity must be 1, 2, or 5.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // API KEY
    // ==========================================

    const apiKey =
      process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      console.error(
        "CHEAPDATAHUB_API_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // CALCULATE PRICE
    // ==========================================

    const unitPrice =
      product.price;

    const totalAmount =
      unitPrice * quantity;

    console.log(
      "EXAM:",
      product.examName
    );

    console.log(
      "UNIT PRICE:",
      unitPrice
    );

    console.log(
      "TOTAL:",
      totalAmount
    );

    // ==========================================
    // FIND USER
    // ==========================================

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
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // WALLET CHECK
    // ==========================================

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
        },
        { status: 400 }
      );
    }

    // ==========================================
    // CREATE REFERENCE
    // ==========================================

    const reference =
      `EXAM-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // ==========================================
    // CREATE PENDING TRANSACTION
    // ==========================================

    const pendingTransaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,

          type: "EXAM_PIN",

          provider:
            product.examName,

          amount:
            totalAmount,

          reference,

          status: "PENDING",

          description:
            `${product.examName} Exam PIN x${quantity}`,
        },
      });

    // ==========================================
    // CHEAPDATAHUB REQUEST
    // ==========================================

    const providerPayload = {
      product_id: productId,
      quantity,
    };

    console.log(
      "CHEAPDATAHUB EXAM REQUEST:"
    );

    console.log(
      providerPayload
    );

    // ==========================================
    // CALL CHEAPDATAHUB
    // ==========================================

    const providerResponse =
      await fetch(
        CHEAPDATAHUB_EXAM_PURCHASE_URL,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            providerPayload
          ),
        }
      );

    const responseText =
      await providerResponse.text();

    console.log(
      "CHEAPDATAHUB EXAM STATUS:",
      providerResponse.status
    );

    console.log(
      "CHEAPDATAHUB EXAM RESPONSE:",
      responseText
    );

    // ==========================================
    // PARSE RESPONSE
    // ==========================================

    let providerResult: any;

    try {
      providerResult =
        JSON.parse(responseText);
    } catch {
      await prisma.transaction.update({
        where: {
          id: pendingTransaction.id,
        },

        data: {
          status: "FAILED",
          description:
            "CheapDataHub returned an invalid response.",
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

    // ==========================================
    // CHECK PROVIDER RESPONSE
    // ==========================================

    const providerSuccess =
      providerResult?.status === true ||
      providerResult?.status === "true" ||
      providerResult?.success === true;

    if (
      !providerResponse.ok ||
      !providerSuccess
    ) {
      await prisma.transaction.update({
        where: {
          id: pendingTransaction.id,
        },

        data: {
          status: "FAILED",

          description:
            providerResult?.message ||
            providerResult?.error ||
            "Exam PIN purchase failed.",
        },
      });

      return NextResponse.json(
        {
          success: false,

          error:
            providerResult?.message ||
            providerResult?.error ||
            "Exam PIN purchase failed.",

          providerStatus:
            providerResponse.status,

          providerResponse:
            providerResult,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // EXTRACT PINS
    // ==========================================

    const delivery =
      providerResult?.data?.delivery ||
      providerResult?.delivery ||
      {};

    const rawPins =
      Array.isArray(delivery?.pins)
        ? delivery.pins
        : [];

    const pins =
      rawPins.map(
        (pin: unknown) =>
          String(pin)
      );

    console.log(
      "RETURNED EXAM PINS:",
      pins
    );

    // ==========================================
    // PROVIDER SUCCESS BUT NO PIN
    // ==========================================

    if (
      pins.length === 0
    ) {
      await prisma.transaction.update({
        where: {
          id: pendingTransaction.id,
        },

        data: {
          status: "FAILED",

          description:
            "Provider reported success but returned no PIN.",
        },
      });

      return NextResponse.json(
        {
          success: false,

          error:
            "The provider completed the transaction but did not return the PIN.",
          
          providerResponse:
            providerResult,
        },
        { status: 502 }
      );
    }

    // ==========================================
    // FINAL DATABASE TRANSACTION
    // ==========================================

    const finalResult =
      await prisma.$transaction(
        async (tx) => {
          const currentUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
            });

          if (!currentUser) {
            throw new Error(
              "User not found."
            );
          }

          const currentBalance =
            Number(
              currentUser.walletBalance
            );

          if (
            !Number.isFinite(
              currentBalance
            ) ||
            currentBalance <
              totalAmount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          // --------------------------------------
          // DEDUCT WALLET
          // --------------------------------------

          const newBalance =
            currentBalance -
            totalAmount;

          await tx.user.update({
            where: {
              id: user.id,
            },

            data: {
              walletBalance:
                newBalance,
            },
          });

          // --------------------------------------
          // UPDATE TRANSACTION
          // --------------------------------------

          await tx.transaction.update({
            where: {
              id:
                pendingTransaction.id,
            },

            data: {
              status: "SUCCESS",

              description:
                `${product.examName} Exam PIN purchase successful`,
            },
          });

          // --------------------------------------
          // SAVE PINS
          // --------------------------------------

          for (
            let index = 0;
            index < pins.length;
            index++
          ) {
            const pinValue =
              pins[index];

            if (!pinValue) {
              continue;
            }

            /*
             * CheapDataHub returns pins
             * like:
             *
             * 0293837272133<=>WRN102838374
             *
             * We keep the complete value
             * because both the PIN and
             * serial are useful to the customer.
             */

            let pin =
              pinValue;

            let serial =
              "N/A";

            if (
              pinValue.includes(
                "<=>"
              )
            ) {
              const parts =
                pinValue.split(
                  "<=>"
                );

              pin =
                parts[0] || pinValue;

              serial =
                parts[1] || "N/A";
            }

            await tx.examPin.create({
              data: {
                userId:
                  user.id,

                provider:
                  product.examName,

                pin,

                serial,

                amount:
                  unitPrice,

                reference:
                  `${reference}-${index + 1}`,
              },
            });
          }

          return {
            walletBalance:
              newBalance,
          };
        }
      );

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      message:
        providerResult?.message ||
        "Exam PIN purchased successfully.",

      examName:
        product.examName,

      quantity,

      unitPrice,

      totalAmount,

      pins,

      reference,

      walletBalance:
        finalResult.walletBalance,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    console.error(
      "========== EXAM PURCHASE ERROR =========="
    );

    console.error(
      error?.message
    );

    console.error(
      error?.response?.data
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Exam PIN purchase failed.",
      },
      { status: 500 }
    );
  }
}