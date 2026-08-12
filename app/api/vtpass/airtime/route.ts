
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const IACAFE_BASE_URL =
  process.env.IACAFE_BASE_URL ||
  "https://iacafe.com.ng/devapi/v1";

const IACAFE_API_KEY =
  process.env.IACAFE_API_KEY;

function generateRequestId() {
  return `brainfriend_airtime_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}

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
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // IACAFE CONFIGURATION
    // ==========================================

    if (!IACAFE_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "IACafe API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // REQUEST BODY
    // ==========================================

    const body = await request.json();

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const serviceId =
      typeof body.serviceId === "string"
        ? body.serviceId.trim().toLowerCase()
        : "";

    const amount = Number(body.amount);

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number is required.",
        },
        { status: 400 }
      );
    }

    if (!/^0\d{10}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid Nigerian phone number.",
        },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Network/service ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid airtime amount.",
        },
        { status: 400 }
      );
    }

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
    // CHECK USER WALLET
    // ==========================================

    if (user.walletBalance < amount) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Insufficient wallet balance.",
          balance: user.walletBalance,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // UNIQUE REQUEST ID
    // ==========================================

    const requestId =
      generateRequestId();

    // ==========================================
    // CALL IACAFE
    // ==========================================

    const iacafeResponse =
      await fetch(
        `${IACAFE_BASE_URL}/airtime`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${IACAFE_API_KEY}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            request_id:
              requestId,

            phone,

            service_id:
              serviceId,

            amount,
          }),
        }
      );

    const iacafeData =
      await iacafeResponse.json();

    console.log(
      "IACAFE AIRTIME RESPONSE:",
      iacafeData
    );

    // ==========================================
    // IACAFE FAILURE
    // ==========================================

    if (
      !iacafeResponse.ok ||
      iacafeData?.code !== "success"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            iacafeData?.message ||
            "Airtime purchase failed.",

          providerResponse:
            iacafeData,
        },
        {
          status:
            iacafeResponse.status || 400,
        }
      );
    }

    // ==========================================
    // PROVIDER DATA
    // ==========================================

    const providerData =
      iacafeData.data;

    const providerStatus =
      String(
        providerData?.status || ""
      ).toLowerCase();

    if (
      providerStatus !==
        "completed-api" &&
      providerStatus !==
        "completed"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Airtime transaction is not completed.",

          status:
            providerData?.status ||
            "unknown",

          requestId,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // AMOUNT CHARGED BY IACAFE
    // ==========================================

    const amountCharged =
      Number(
        providerData?.amount_charged
      );

    if (
      !Number.isFinite(
        amountCharged
      ) ||
      amountCharged <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid IACafe charged amount.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // YOUR PROFIT
    // ==========================================
    //
    // Customer pays `amount`.
    // IACafe charges your provider wallet
    // `amountCharged`.
    //
    // Example:
    //
    // Customer pays: ₦100
    // IACafe charges: ₦97.80
    // Your profit:    ₦2.20
    //
    // ==========================================

    const profit =
      amount - amountCharged;

    // ==========================================
    // CREDIT/DEBIT ATOMIC TRANSACTION
    // ==========================================

    await prisma.$transaction(
      async (tx) => {
        // --------------------------------------
        // Re-check wallet inside transaction
        // --------------------------------------

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

        if (
          currentUser.walletBalance <
          amount
        ) {
          throw new Error(
            "Insufficient wallet balance."
          );
        }

        // --------------------------------------
        // Deduct customer wallet
        // --------------------------------------

        await tx.user.update({
          where: {
            id: user.id,
          },

          data: {
            walletBalance: {
              decrement: amount,
            },
          },
        });

        // --------------------------------------
        // Record transaction
        // --------------------------------------

        await tx.transaction.create({
          data: {
            userId: user.id,

            type: "AIRTIME",

            provider: "IACAFE",

            amount,

            profit,

            description:
              `Airtime purchase of ₦${amount.toLocaleString(
                "en-NG",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )} for ${phone}`,

            status: "SUCCESS",

            reference:
              String(
                providerData?.order_id ||
                  requestId
              ),
          },
        });
      }
    );

    // ==========================================
    // SUCCESS
    // ==========================================

    return NextResponse.json({
      success: true,

      message:
        "Airtime purchased successfully.",

      data: {
        phone,

        serviceId,

        amount,

        amountCharged,

        profit,

        requestId,

        orderId:
          providerData?.order_id ||
          null,

        status:
          providerData?.status ||
          "completed-api",
      },
    });
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "IACAFE AIRTIME ERROR:"
    );

    console.error(
      error?.message ||
        error
    );

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Failed to process airtime purchase.",
      },
      { status: 500 }
    );
  }
}

