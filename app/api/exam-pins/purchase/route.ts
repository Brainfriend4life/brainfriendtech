import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const CHEAPDATAHUB_EXAM_PIN_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/exam-pin/purchase/";

export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // AUTHENTICATION
    // ==========================================

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

    // ==========================================
    // REQUEST BODY
    // ==========================================

    const body = await request.json();

    const { productId, quantity } = body;

    if (!productId || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "productId and quantity are required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATE PRODUCT ID
    // ==========================================

    const numericProductId = Number(productId);

    if (
      !Number.isInteger(numericProductId) ||
      numericProductId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid exam PIN product.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATE QUANTITY
    // ==========================================

    const numericQuantity = Number(quantity);

    if (![1, 2, 5].includes(numericQuantity)) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be 1, 2, or 5.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // EXAM PRODUCTS
    // ==========================================

    const examProducts: Record<
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

    const product =
      examProducts[numericProductId];

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Exam PIN product not found.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // CALCULATE AMOUNT
    // ==========================================

    const unitPrice = Number(product.price);

    const totalAmount =
      unitPrice * numericQuantity;

    // ==========================================
    // FIND USER
    // ==========================================

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

    // ==========================================
    // CHECK ACCOUNT STATUS
    // ==========================================

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // ==========================================
    // CHECK WALLET
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
          error: "Insufficient wallet balance.",
          balance: walletBalance,
          required: totalAmount,
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
    // TRANSACTION REFERENCE
    // ==========================================

    const reference =
      `EXAMPIN-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // ==========================================
    // CREATE PENDING TRANSACTION
    // ==========================================

    const transaction =
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXAM_PIN",
          amount: totalAmount,
          description:
            `${product.examName} Exam PIN x${numericQuantity}`,
          status: "PENDING",
          reference,
          provider: "CheapDataHub",
          cost: totalAmount,
          profit: 0,
        },
      });

    // ==========================================
    // SEND REQUEST TO CHEAPDATAHUB
    // ==========================================

    const requestBody = {
      product_id: numericProductId,
      quantity: numericQuantity,
    };

    console.log(
      "========== EXAM PIN PURCHASE =========="
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
      "API KEY EXISTS:",
      !!apiKey
    );

    console.log(
      "========================================"
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

          body: JSON.stringify(
            requestBody
          ),
        }
      );

    // ==========================================
    // READ RESPONSE
    // ==========================================

    const responseText =
      await providerResponse.text();

    console.log(
      "EXAM PIN STATUS:",
      providerResponse.status
    );

    console.log(
      "EXAM PIN RESPONSE:",
      responseText
    );

    let providerResult: any = null;

    if (responseText.trim()) {
      try {
        providerResult =
          JSON.parse(responseText);
      } catch {
        providerResult = null;
      }
    }

    // ==========================================
    // INVALID PROVIDER RESPONSE
    // ==========================================

    if (!providerResult) {
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          status: "FAILED",
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
    // CHECK PROVIDER SUCCESS
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
          id: transaction.id,
        },

        data: {
          status: "FAILED",
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
      providerResult?.data?.delivery || {};

    const pins =
      Array.isArray(delivery?.pins)
        ? delivery.pins
        : [];

    // ==========================================
    // DEDUCT WALLET
    // ==========================================

    const finalResult =
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
              "User not found."
            );
          }

          const freshBalance =
            Number(
              freshUser.walletBalance
            );

          if (
            freshBalance <
            totalAmount
          ) {
            throw new Error(
              "Insufficient wallet balance."
            );
          }

          const newBalance =
            freshBalance -
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

          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status: "SUCCESS",
            },
          });

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
        "Exam PIN purchase successful.",

      reference,

      examName:
        delivery?.exam_name ||
        product.examName,

      quantity:
        delivery?.quantity ||
        numericQuantity,

      unitPrice,

      totalAmount,

      pins,

      walletBalance:
        finalResult.walletBalance,

      providerResponse:
        providerResult,
    });
  } catch (error: any) {
    console.error(
      "EXAM PIN PURCHASE ERROR:",
      error
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