
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CHEAPDATAHUB_EXAM_PRODUCTS_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/exam-pin/products/";

const CHEAPDATAHUB_EXAM_PURCHASE_URL =
  "https://www.cheapdatahub.ng/api/v1/resellers/exam-pin/purchase/";

const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";
const DEFAULT_SERVICE_FEE_PERCENT = 5;

export async function POST(request: NextRequest) {
  let pendingTransactionId: string | null = null;
  let reservedAmount = 0;
  let userId: string | null = null;

  try {
    // ==========================================================
    // AUTHENTICATION
    // ==========================================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ==========================================================
    // REQUEST BODY
    // ==========================================================

    const body = await request.json();

    const productId = Number(
      body.productId ?? body.product_id
    );

    const quantity = Number(body.quantity);

    const transactionPin = String(
      body.transactionPin ?? ""
    ).trim();

    console.log("========== EXAM PIN PURCHASE ==========");
    console.log("PRODUCT ID:", productId);
    console.log("QUANTITY:", quantity);

    // ==========================================================
    // VALIDATE PRODUCT ID
    // ==========================================================

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid exam PIN product.",
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // VALIDATE QUANTITY
    // ==========================================================

    if (![1, 2, 5].includes(quantity)) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be 1, 2, or 5.",
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // VALIDATE TRANSACTION PIN
    // ==========================================================

    if (!/^\d{4}$/.test(transactionPin)) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid 4-digit transaction PIN is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // API KEY
    // ==========================================================

    const apiKey = process.env.CHEAPDATAHUB_API_KEY;

    if (!apiKey) {
      console.error(
        "CHEAPDATAHUB_API_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          error: "CheapDataHub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ==========================================================
    // FIND USER
    // ==========================================================

    const user = await prisma.user.findUnique({
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

    userId = user.id;

    // ==========================================================
    // TRANSACTION PIN SECURITY
    // ==========================================================

    if (
      !user.transactionPinEnabled ||
      !user.transactionPinHash
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction PIN is not set. Please set your transaction PIN first.",
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // CHECK TRANSACTION PIN LOCK
    // ==========================================================

    if (
      user.transactionPinLockedUntil &&
      user.transactionPinLockedUntil > new Date()
    ) {
      const remainingMs =
        user.transactionPinLockedUntil.getTime() -
        Date.now();

      const remainingMinutes = Math.max(
        1,
        Math.ceil(remainingMs / 60000)
      );

      return NextResponse.json(
        {
          success: false,
          error: `Transaction PIN is temporarily locked. Try again in ${remainingMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    // ==========================================================
    // VERIFY TRANSACTION PIN
    // ==========================================================

    const pinValid = await bcrypt.compare(
      transactionPin,
      user.transactionPinHash
    );

    if (!pinValid) {
      const newAttempts =
        user.transactionPinAttempts + 1;

      const MAX_PIN_ATTEMPTS = 5;

      if (newAttempts >= MAX_PIN_ATTEMPTS) {
        const lockedUntil = new Date(
          Date.now() + 15 * 60 * 1000
        );

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            transactionPinAttempts: 0,
            transactionPinLockedUntil: lockedUntil,
            lastTransactionPinCheck: new Date(),
          },
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Too many incorrect transaction PIN attempts. Your transaction PIN has been locked for 15 minutes.",
          },
          { status: 429 }
        );
      }

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          transactionPinAttempts: newAttempts,
          lastTransactionPinCheck: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Invalid transaction PIN. ${
            MAX_PIN_ATTEMPTS - newAttempts
          } attempt(s) remaining.`,
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // RESET PIN ATTEMPTS AFTER SUCCESS
    // ==========================================================

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        transactionPinAttempts: 0,
        transactionPinLockedUntil: null,
        lastTransactionPinCheck: new Date(),
      },
    });

    // ==========================================================
    // GET CURRENT SERVICE FEE FROM ADMIN SETTING
    // ==========================================================

    const serviceFeeSetting =
      await prisma.systemSetting.findUnique({
        where: {
          key: SERVICE_FEE_SETTING_KEY,
        },
      });

    let serviceFeePercent =
      DEFAULT_SERVICE_FEE_PERCENT;

    if (serviceFeeSetting) {
      const parsedPercentage = Number(
        serviceFeeSetting.value
      );

      if (
        Number.isFinite(parsedPercentage) &&
        parsedPercentage >= 0 &&
        parsedPercentage <= 100
      ) {
        serviceFeePercent =
          parsedPercentage;
      }
    }

    console.log(
      "SERVICE FEE PERCENT:",
      serviceFeePercent
    );

    // ==========================================================
    // GET PRODUCTS FROM CHEAPDATAHUB
    // ==========================================================

    const productsResponse = await fetch(
      CHEAPDATAHUB_EXAM_PRODUCTS_URL,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const productsText =
      await productsResponse.text();

    console.log(
      "CHEAPDATAHUB PRODUCTS STATUS:",
      productsResponse.status
    );

    if (!productsText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub returned an empty products response.",
        },
        { status: 502 }
      );
    }

    let productsResult: any;

    try {
      productsResult =
        JSON.parse(productsText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub returned an invalid products response.",
        },
        { status: 502 }
      );
    }

    if (!productsResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            productsResult?.message ||
            productsResult?.error ||
            "Unable to load exam PIN products.",
        },
        { status: productsResponse.status }
      );
    }

    const providerSuccess =
      productsResult?.success === true ||
      productsResult?.status === true ||
      productsResult?.status === "true";

    if (!providerSuccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            productsResult?.message ||
            productsResult?.error ||
            "CheapDataHub could not return exam PIN products.",
        },
        { status: 502 }
      );
    }

    const products =
      Array.isArray(productsResult?.data)
        ? productsResult.data
        : Array.isArray(
            productsResult?.data?.products
          )
        ? productsResult.data.products
        : [];

    // ==========================================================
    // FIND SELECTED PRODUCT
    // ==========================================================

    const selectedProduct =
      products.find(
        (product: any) =>
          Number(product.id) === productId
      );

    if (!selectedProduct) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected exam PIN product was not found.",
        },
        { status: 400 }
      );
    }

    const examName =
      selectedProduct.exam_name ||
      selectedProduct.examName ||
      selectedProduct.name ||
      "Exam PIN";

    const providerPrice = Number(
      selectedProduct.reseller_price ??
        selectedProduct.api_price ??
        selectedProduct.price ??
        0
    );

    if (
      !Number.isFinite(providerPrice) ||
      providerPrice <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected exam PIN does not have a valid provider price.",
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // PRICE CALCULATION
    // ==========================================================

    const subtotal =
      providerPrice * quantity;

    const serviceFee =
      subtotal *
      (serviceFeePercent / 100);

    const totalAmount =
      subtotal + serviceFee;

    const providerCost =
      subtotal;

    // The entire service fee is the business profit.
    const profit =
      serviceFee;

    console.log("EXAM:", examName);
    console.log(
      "PROVIDER PRICE:",
      providerPrice
    );
    console.log(
      "QUANTITY:",
      quantity
    );
    console.log(
      "SUBTOTAL:",
      subtotal
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
      "TOTAL:",
      totalAmount
    );
    console.log(
      "PROVIDER COST:",
      providerCost
    );
    console.log(
      "PROFIT:",
      profit
    );

    // ==========================================================
    // WALLET CHECK
    // ==========================================================

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

    // ==========================================================
    // CREATE REFERENCE
    // ==========================================================

    const reference =
      `EXAM-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // ==========================================================
    // RESERVE / DEDUCT WALLET FIRST
    // ==========================================================

    const reservation =
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

          const transaction =
            await tx.transaction.create({
              data: {
                userId: user.id,
                type: "EXAM_PIN",
                provider: examName,
                amount: totalAmount,
                cost: providerCost,
                profit,
                reference,
                status: "PENDING",
                description:
                  `${examName} Exam PIN x${quantity}`,
              },
            });

          return {
            transaction,
            walletBalance: newBalance,
          };
        }
      );

    pendingTransactionId =
      reservation.transaction.id;

    reservedAmount =
      totalAmount;

    // ==========================================================
    // CALL CHEAPDATAHUB PURCHASE API
    // ==========================================================

    const providerPayload = {
      product_id: productId,
      quantity,
    };

    console.log(
      "CHEAPDATAHUB EXAM REQUEST:",
      providerPayload
    );

    let providerResponse: Response;

    try {
      providerResponse =
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
    } catch (providerError: any) {
      console.error(
        "CHEAPDATAHUB NETWORK ERROR:",
        providerError
      );

      // ========================================================
      // REFUND RESERVED WALLET
      // ========================================================

      await prisma.$transaction(
        async (tx) => {
          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              walletBalance: {
                increment:
                  reservedAmount,
              },
            },
          });

          if (pendingTransactionId) {
            await tx.transaction.update({
              where: {
                id:
                  pendingTransactionId,
              },
              data: {
                status: "FAILED",
                description:
                  `${examName} Exam PIN purchase failed. Wallet refunded.`,
              },
            });
          }
        }
      );

      reservedAmount = 0;

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to connect to CheapDataHub. Your wallet has been refunded.",
        },
        { status: 502 }
      );
    }

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

    // ==========================================================
    // PARSE PROVIDER RESPONSE
    // ==========================================================

    let providerResult: any;

    try {
      providerResult =
        JSON.parse(responseText);
    } catch {
      await prisma.$transaction(
        async (tx) => {
          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              walletBalance: {
                increment:
                  reservedAmount,
              },
            },
          });

          if (pendingTransactionId) {
            await tx.transaction.update({
              where: {
                id:
                  pendingTransactionId,
              },
              data: {
                status: "FAILED",
                description:
                  `${examName} Exam PIN purchase failed. Provider returned invalid response. Wallet refunded.`,
              },
            });
          }
        }
      );

      reservedAmount = 0;

      return NextResponse.json(
        {
          success: false,
          error:
            "CheapDataHub returned an invalid response. Your wallet has been refunded.",
          providerStatus:
            providerResponse.status,
        },
        { status: 502 }
      );
    }

    // ==========================================================
    // PROVIDER FAILURE
    // ==========================================================

    const purchaseSuccess =
      providerResult?.status === true ||
      providerResult?.status === "true" ||
      providerResult?.success === true;

    if (
      !providerResponse.ok ||
      !purchaseSuccess
    ) {
      await prisma.$transaction(
        async (tx) => {
          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              walletBalance: {
                increment:
                  reservedAmount,
              },
            },
          });

          if (pendingTransactionId) {
            await tx.transaction.update({
              where: {
                id:
                  pendingTransactionId,
              },
              data: {
                status: "FAILED",
                description:
                  `${examName} Exam PIN purchase failed. ${
                    providerResult?.message ||
                    providerResult?.error ||
                    "Wallet refunded."
                  }`,
              },
            });
          }
        }
      );

      reservedAmount = 0;

      return NextResponse.json(
        {
          success: false,
          error:
            providerResult?.message ||
            providerResult?.error ||
            "Exam PIN purchase failed. Your wallet has been refunded.",
          providerStatus:
            providerResponse.status,
          providerResponse:
            providerResult,
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // EXTRACT PINS
    // ==========================================================

    const delivery =
      providerResult?.data?.delivery ||
      providerResult?.delivery ||
      {};

    const rawPins =
      Array.isArray(
        delivery?.pins
      )
        ? delivery.pins
        : [];

    const pins =
      rawPins
        .map((pin: unknown) =>
          String(pin).trim()
        )
        .filter(Boolean);

    console.log(
      "RETURNED EXAM PINS:",
      pins
    );

    // ==========================================================
    // SUCCESS BUT NO PIN
    // ==========================================================

    if (pins.length === 0) {
      await prisma.$transaction(
        async (tx) => {
          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              walletBalance: {
                increment:
                  reservedAmount,
              },
            },
          });

          if (pendingTransactionId) {
            await tx.transaction.update({
              where: {
                id:
                  pendingTransactionId,
              },
              data: {
                status: "FAILED",
                description:
                  `${examName} Provider reported success but returned no PIN. Wallet refunded.`,
              },
            });
          }
        }
      );

      reservedAmount = 0;

      return NextResponse.json(
        {
          success: false,
          error:
            "The provider reported success but returned no PIN. Your wallet has been refunded.",
          providerResponse:
            providerResult,
        },
        { status: 502 }
      );
    }

    // ==========================================================
    // SAVE SUCCESSFUL PURCHASE
    // ==========================================================

    const finalResult =
      await prisma.$transaction(
        async (tx) => {
          // ====================================================
          // UPDATE TRANSACTION
          // ====================================================

          if (!pendingTransactionId) {
            throw new Error(
              "Pending transaction was not created."
            );
          }

          await tx.transaction.update({
            where: {
              id:
                pendingTransactionId,
            },
            data: {
              status: "SUCCESS",
              cost: providerCost,
              profit,
              description:
                `${examName} Exam PIN purchase successful`,
            },
          });

          // ====================================================
          // SAVE EXAM PINS
          // ====================================================

          const savedPins: Array<{
            pin: string;
            serial: string;
            reference: string;
          }> = [];

          for (
            let index = 0;
            index < pins.length;
            index++
          ) {
            const pinValue =
              pins[index];

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
                parts[0]?.trim() ||
                pinValue;

              serial =
                parts[1]?.trim() ||
                "N/A";
            }

            const pinReference =
              `${reference}-${index + 1}`;

            await tx.examPin.create({
              data: {
                userId:
                  user.id,
                provider:
                  examName,
                pin,
                serial,
                amount:
                  providerPrice,
                reference:
                  pinReference,
              },
            });

            savedPins.push({
              pin,
              serial,
              reference:
                pinReference,
            });
          }

          // ====================================================
          // FIND BUSINESS WALLET
          // ====================================================

          let businessWallet =
            await tx.businessWallet.findUnique({
              where: {
                name:
                  "Brainfriend Global Tech",
              },
            });

          if (!businessWallet) {
            businessWallet =
              await tx.businessWallet.create({
                data: {
                  name:
                    "Brainfriend Global Tech",
                },
              });
          }

          // ====================================================
          // UPDATE BUSINESS WALLET
          // ====================================================

          await tx.businessWallet.update({
            where: {
              id:
                businessWallet.id,
            },
            data: {
              totalRevenue: {
                increment:
                  totalAmount,
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
              balance: {
                increment:
                  profit,
              },
            },
          });

          // ====================================================
          // CREATE BUSINESS REVENUE
          // ====================================================

          await tx.businessRevenue.create({
            data: {
              transactionId:
                pendingTransactionId,
              type: "EXAM_PIN",
              provider:
                examName,
              amount:
                totalAmount,
              cost:
                providerCost,
              profit,
              reference,
              description:
                `${examName} Exam PIN x${quantity}`,
              businessWalletId:
                businessWallet.id,
            },
          });

          // ====================================================
          // GET UPDATED USER BALANCE
          // ====================================================

          const updatedUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },
              select: {
                walletBalance: true,
              },
            });

          return {
            walletBalance:
              Number(
                updatedUser?.walletBalance ??
                  0
              ),
            savedPins,
          };
        }
      );

    reservedAmount = 0;

    // ==========================================================
    // SUCCESS RESPONSE
    // ==========================================================

    return NextResponse.json({
      success: true,

      message:
        providerResult?.message ||
        "Exam PIN purchased successfully.",

      examName,

      quantity,

      unitPrice:
        providerPrice,

      subtotal,

      serviceFee,

      serviceFeePercent,

      totalAmount,

      providerCost,

      profit,

      pins:
        finalResult.savedPins,

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
      error?.stack
    );

    // ==========================================================
    // REFUND IF WALLET WAS RESERVED
    // ==========================================================

    if (
      userId &&
      reservedAmount > 0
    ) {
      try {
        await prisma.$transaction(
          async (tx) => {
            await tx.user.update({
              where: {
                id: userId as string,
              },
              data: {
                walletBalance: {
                  increment:
                    reservedAmount,
                },
              },
            });

            if (pendingTransactionId) {
              await tx.transaction.update({
                where: {
                  id:
                    pendingTransactionId,
                },
                data: {
                  status: "FAILED",
                  description:
                    "Exam PIN purchase failed. Wallet refunded.",
                },
              });
            }
          }
        );

        reservedAmount = 0;
      } catch (refundError) {
        console.error(
          "CRITICAL EXAM PIN REFUND ERROR:",
          refundError
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
      { status: 500 }
    );
  }
}

