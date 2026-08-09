
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import axios from "axios";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vtpassConfig } from "@/lib/vtpass";
import { generateRequestId } from "@/lib/requestId";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const {
      serviceID,
      variation_code,
      quantity,
      phone,
      billersCode,
    } = await req.json();

    const normalizedServiceID = String(
      serviceID || ""
    ).toLowerCase();

    /*
     * ==========================================
     * BASIC VALIDATION
     * ==========================================
     */

    if (
      !serviceID ||
      !variation_code ||
      !quantity ||
      !phone
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    /*
     * JAMB requires billersCode
     */
    if (
      normalizedServiceID === "jamb" &&
      !String(billersCode || "").trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "JAMB Profile ID is required",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================
     * FIND LOGGED-IN USER
     * ==========================================
     */

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    /*
     * ==========================================
     * GET CURRENT PRICE FROM VTPASS
     * ==========================================
     */

    const variationResponse =
      await axios.get(
        `${vtpassConfig.baseUrl}/service-variations?serviceID=${encodeURIComponent(
          serviceID
        )}`,
        {
          headers: {
            "api-key": vtpassConfig.apiKey,
            "secret-key": vtpassConfig.secretKey,
            "Content-Type": "application/json",
          },
        }
      );

    const plans =
      variationResponse.data?.content
        ?.variations || [];

    const selectedPlan = plans.find(
      (plan: any) =>
        plan.variation_code ===
        variation_code
    );

    if (!selectedPlan) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid exam plan selected",
        },
        { status: 400 }
      );
    }

    const unitPrice = Number(
      selectedPlan.variation_amount
    );

    const requestedQuantity =
      Number(quantity);

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid exam plan price",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(
        requestedQuantity
      ) ||
      requestedQuantity < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid quantity",
        },
        { status: 400 }
      );
    }

    const totalAmount =
      unitPrice * requestedQuantity;

    /*
     * ==========================================
     * INITIAL WALLET CHECK
     * ==========================================
     *
     * This is only a quick check.
     *
     * We will perform the REAL balance check
     * again inside the Prisma transaction below.
     */

    if (
      user.walletBalance <
      totalAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insufficient wallet balance",
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================
     * GENERATE UNIQUE VTPASS REQUEST ID
     * ==========================================
     */

    const requestId =
      generateRequestId();

    /*
     * ==========================================
     * BUILD VTPASS PAYLOAD
     * ==========================================
     */

    const payload: any = {
      request_id: requestId,
      serviceID,
      variation_code,
      quantity: requestedQuantity,
      phone: String(phone).trim(),
    };

    /*
     * JAMB requires billersCode
     */
    if (
      normalizedServiceID === "jamb"
    ) {
      payload.billersCode =
        String(
          billersCode
        ).trim();
    }

    console.log(
      "Exam Payload:",
      payload
    );

    /*
     * ==========================================
     * SEND PURCHASE REQUEST TO VTPASS
     * ==========================================
     */

    const response =
      await axios.post(
        `${vtpassConfig.baseUrl}/pay`,
        payload,
        {
          headers: {
            "api-key":
              vtpassConfig.apiKey,
            "secret-key":
              vtpassConfig.secretKey,
            "Content-Type":
              "application/json",
          },
        }
      );

    const vtpass =
      response.data;

    console.log(
      "Exam Response:",
      vtpass
    );

    /*
     * ==========================================
     * CHECK VTPASS TRANSACTION STATUS
     * ==========================================
     */

    const successful =
      vtpass.code === "000" &&
      vtpass.content
        ?.transactions
        ?.status === "delivered";

    /*
     * ==========================================
     * VTPASS PURCHASE FAILED
     * ==========================================
     */

    if (!successful) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: "EXAM_PIN",
            provider:
              serviceID.toUpperCase(),
            amount: totalAmount,
            reference: requestId,
            status: "FAILED",
            description:
              vtpass.response_description ||
              vtpass.content?.errors?.join?.(
                ", "
              ) ||
              "Exam purchase failed",
          },
        });
      } catch (transactionError: any) {
        console.error(
          "FAILED TRANSACTION LOG ERROR:",
          transactionError.message
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            vtpass.response_description ||
            vtpass.content?.errors?.join?.(
              ", "
            ) ||
            "Exam PIN purchase failed",
          data: vtpass,
        },
        { status: 400 }
      );
    }

    /*
     * ==========================================
     * EXTRACT RETURNED PIN(S)
     * ==========================================
     */

    const cards: {
      Pin: string;
      Serial: string;
    }[] = [];

    /*
     * WAEC / CARD-BASED SERVICES
     */

    if (
      Array.isArray(vtpass.cards)
    ) {
      for (const card of vtpass.cards) {
        if (
          card?.Pin &&
          card?.Serial
        ) {
          cards.push({
            Pin: String(card.Pin),
            Serial: String(
              card.Serial
            ),
          });
        }
      }
    }

    /*
     * JAMB
     *
     * VTpass returns:
     *
     * Pin: "Pin : 3678251321392432"
     */

    if (
      normalizedServiceID ===
        "jamb" &&
      vtpass.Pin
    ) {
      let jambPin = String(
        vtpass.Pin
      ).trim();

      jambPin =
        jambPin.replace(
          /^Pin\s*:\s*/i,
          ""
        ).trim();

      if (jambPin) {
        cards.push({
          Pin: jambPin,
          Serial: "JAMB",
        });
      }
    }

    /*
     * FALLBACK:
     * Some VTpass responses use purchased_code
     */

    if (
      cards.length === 0 &&
      normalizedServiceID ===
        "jamb" &&
      vtpass.purchased_code
    ) {
      let purchasedCode =
        String(
          vtpass.purchased_code
        ).trim();

      purchasedCode =
        purchasedCode.replace(
          /^Pin\s*:\s*/i,
          ""
        ).trim();

      if (purchasedCode) {
        cards.push({
          Pin: purchasedCode,
          Serial: "JAMB",
        });
      }
    }

    /*
     * ==========================================
     * MAKE SURE A PIN WAS RETURNED
     * ==========================================
     */

    if (cards.length === 0) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: "EXAM_PIN",
            provider:
              serviceID.toUpperCase(),
            amount: totalAmount,
            reference: requestId,
            status: "FAILED",
            description:
              "Transaction successful but no PIN was returned",
          },
        });
      } catch (transactionError: any) {
        console.error(
          "FAILED PIN LOG ERROR:",
          transactionError.message
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Transaction completed but no exam PIN was returned.",
          data: vtpass,
        },
        { status: 500 }
      );
    }

    /*
     * ==========================================
     * ATOMIC DATABASE TRANSACTION
     * ==========================================
     *
     * Everything below succeeds together
     * or everything is rolled back.
     */

    await prisma.$transaction(
      async (tx) => {
        /*
         * --------------------------------------
         * RE-CHECK WALLET BALANCE
         * --------------------------------------
         *
         * We deliberately fetch the latest
         * database value instead of relying on
         * the earlier user object.
         */

        const currentUser =
          await tx.user.findUnique({
            where: {
              id: user.id,
            },
            select: {
              id: true,
              walletBalance: true,
            },
          });

        if (!currentUser) {
          throw new Error(
            "User not found"
          );
        }

        /*
         * IMPORTANT:
         *
         * This is the final wallet protection.
         */

        if (
          currentUser.walletBalance <
          totalAmount
        ) {
          throw new Error(
            "Insufficient wallet balance"
          );
        }

        /*
         * --------------------------------------
         * CHECK FOR DUPLICATE REQUEST
         * --------------------------------------
         *
         * Transaction.reference is unique.
         */

        const existingTransaction =
          await tx.transaction.findUnique({
            where: {
              reference: requestId,
            },
            select: {
              id: true,
            },
          });

        if (existingTransaction) {
          throw new Error(
            "This purchase request has already been processed"
          );
        }

        /*
         * --------------------------------------
         * SAVE SUCCESS TRANSACTION
         * --------------------------------------
         */

        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "EXAM_PIN",
            provider:
              serviceID.toUpperCase(),
            amount: totalAmount,
            reference: requestId,
            status: "SUCCESS",
            description:
              vtpass.response_description ||
              "TRANSACTION SUCCESSFUL",
          },
        });

        /*
         * --------------------------------------
         * DEDUCT WALLET
         * --------------------------------------
         *
         * Because this happens inside the
         * Prisma transaction, it will roll back
         * if a later operation fails.
         */

        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            walletBalance: {
              decrement:
                totalAmount,
            },
          },
        });

        /*
         * --------------------------------------
         * SAVE ALL RETURNED PINS
         * --------------------------------------
         */

        for (const card of cards) {
          if (
            !card.Pin ||
            !card.Serial
          ) {
            continue;
          }

          await tx.examPin.create({
            data: {
              userId: user.id,
              provider:
                serviceID.toUpperCase(),
              pin: card.Pin,
              serial: card.Serial,
              amount: unitPrice,
              reference: `${requestId}-${card.Serial}`,
            },
          });
        }
      }
    );

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    return NextResponse.json({
      success: true,
      message:
        "Exam PIN purchased successfully",
      data: vtpass,
    });
  } catch (error: any) {
    console.error(
      "EXAM PURCHASE ERROR:",
      error.response?.data ||
        error.message
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data
            ?.response_description ||
          error.message ||
          "Exam PIN purchase failed",
      },
      { status: 500 }
    );
  }
}

