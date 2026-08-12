
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // =====================================================
    // 1. ADMIN AUTHENTICATION
    // =====================================================

    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    // =====================================================
    // 2. CHECK PAYSTACK SECRET KEY
    // =====================================================

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Paystack is not configured correctly.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 3. READ REQUEST
    // =====================================================

    const body = await request.json();

    const amount = Number(body.amount);

    if (!Number.isFinite(amount)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    if (amount < 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Minimum withdrawal amount is ₦100.",
        },
        { status: 400 }
      );
    }

    // Only allow 2 decimal places.
    const roundedAmount =
      Math.round(amount * 100) / 100;

    // =====================================================
    // 4. FIND BUSINESS WALLET
    // =====================================================

    const businessWallet =
      await prisma.businessWallet.findUnique({
        where: {
          name: "Brainfriend Tech",
        },
      });

    if (!businessWallet) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Brainfriend Tech business wallet was not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 5. CHECK RECIPIENT
    // =====================================================

    if (!businessWallet.recipientCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No Paystack bank recipient is connected to the business wallet.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 6. CHECK AVAILABLE PROFIT
    // =====================================================

    const availableProfit =
      Number(
        businessWallet.availableProfit || 0
      );

    if (roundedAmount > availableProfit) {
      return NextResponse.json(
        {
          success: false,
          message: `You can only withdraw up to ₦${availableProfit.toLocaleString(
            "en-NG",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}.`,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 7. CREATE UNIQUE REFERENCE
    // =====================================================

    const reference =
      `brainfriend-withdrawal-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    // Paystack NGN transfers use kobo.
    const amountInKobo =
      Math.round(roundedAmount * 100);

    // =====================================================
    // 8. CREATE PENDING WITHDRAWAL
    // =====================================================

    const withdrawal =
      await prisma.businessWithdrawal.create({
        data: {
          amount: roundedAmount,

          accountName:
            "Brainfriend Tech",

          accountNumber:
            "PAYSTACK_RECIPIENT",

          bankName:
            "Paystack Recipient",

          recipientCode:
            businessWallet.recipientCode,

          reference,

          status: "PENDING",

          method: "PAYSTACK",

          adminNote:
            "Paystack business profit withdrawal.",
        },
      });

    // =====================================================
    // 9. SEND TRANSFER TO PAYSTACK
    // =====================================================

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/transfer",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${paystackSecretKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            source: "balance",

            amount: amountInKobo,

            recipient:
              businessWallet.recipientCode,

            reference,

            reason:
              "Brainfriend Tech business profit withdrawal",

            currency: "NGN",
          }),
        }
      );

    const paystackData =
      await paystackResponse.json();

    console.log(
      "PAYSTACK TRANSFER RESPONSE:",
      paystackData
    );

    // =====================================================
    // 10. HANDLE PAYSTACK FAILURE
    // =====================================================

    if (
      !paystackResponse.ok ||
      !paystackData.status
    ) {
      await prisma.businessWithdrawal.update({
        where: {
          id: withdrawal.id,
        },

        data: {
          status: "FAILED",

          adminNote:
            paystackData.message ||
            "Paystack transfer failed.",

          processedAt:
            new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,

          message:
            paystackData.message ||
            "Paystack withdrawal failed.",

          reference,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 11. DETERMINE PAYSTACK STATUS
    // =====================================================

    const transfer =
      paystackData.data;

    const paystackStatus =
      String(
        transfer?.status || ""
      ).toLowerCase();

    let withdrawalStatus:
      | "PENDING"
      | "PROCESSING"
      | "SUCCESS"
      | "FAILED" =
      "PROCESSING";

    if (
      paystackStatus === "success"
    ) {
      withdrawalStatus = "SUCCESS";
    } else if (
      paystackStatus === "failed"
    ) {
      withdrawalStatus = "FAILED";
    } else {
      withdrawalStatus = "PROCESSING";
    }

    // =====================================================
    // 12. UPDATE WITHDRAWAL RECORD
    // =====================================================

    const transferCode =
      transfer?.transfer_code || null;

    const updatedWithdrawal =
      await prisma.businessWithdrawal.update({
        where: {
          id: withdrawal.id,
        },

        data: {
          status: withdrawalStatus,

          transferCode,

          adminNote:
            paystackData.message ||
            "Paystack transfer initiated.",

          processedAt:
            withdrawalStatus === "SUCCESS" ||
            withdrawalStatus === "FAILED"
              ? new Date()
              : null,
        },
      });

    // =====================================================
    // 13. ONLY DEDUCT PROFIT WHEN PAYSTACK
    //     CONFIRMS SUCCESS
    // =====================================================

    if (
      withdrawalStatus === "SUCCESS"
    ) {
      const newAvailableProfit =
        Math.max(
          availableProfit -
            roundedAmount,
          0
        );

      const newWithdrawnProfit =
        Number(
          businessWallet.withdrawnProfit ||
            0
        ) + roundedAmount;

      await prisma.businessWallet.update({
        where: {
          id: businessWallet.id,
        },

        data: {
          withdrawnProfit:
            newWithdrawnProfit,

          availableProfit:
            newAvailableProfit,

          balance:
            newAvailableProfit,
        },
      });
    }

    // =====================================================
    // 14. RETURN RESULT
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        withdrawalStatus === "SUCCESS"
          ? "Withdrawal completed successfully."
          : "Withdrawal has been sent to Paystack for processing.",

      withdrawal: {
        id:
          updatedWithdrawal.id,

        amount:
          updatedWithdrawal.amount,

        status:
          updatedWithdrawal.status,

        reference:
          updatedWithdrawal.reference,

        transferCode:
          updatedWithdrawal.transferCode,

        createdAt:
          updatedWithdrawal.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "BUSINESS WITHDRAWAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to process business withdrawal.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

