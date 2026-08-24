import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request
) {
  try {
    /*
     * ============================================================
     * 1. ADMIN AUTHENTICATION
     * ============================================================
     */

    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 403 }
      );
    }

    /*
     * ============================================================
     * 2. PAYSTACK CONFIGURATION
     * ============================================================
     */

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

    /*
     * ============================================================
     * 3. READ REQUEST
     * ============================================================
     */

    const body =
      await request.json();

    const amount =
      Number(body.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid withdrawal amount.",
        },
        { status: 400 }
      );
    }

    /*
     * Minimum withdrawal
     */

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

    /*
     * Only allow two decimal places.
     */

    const roundedAmount =
      Math.round(amount * 100) / 100;

    /*
     * ============================================================
     * 4. FIND BRAINFRIEND GLOBAL TECH WALLET
     * ============================================================
     */

    const businessWallet =
      await prisma.businessWallet.findUnique(
        {
          where: {
            name:
              "Brainfriend Global Tech",
          },
        }
      );

    if (!businessWallet) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Brainfriend Global Tech business wallet was not found.",
        },
        { status: 404 }
      );
    }

    /*
     * ============================================================
     * 5. CHECK PAYSTACK RECIPIENT
     * ============================================================
     */

    if (
      !businessWallet.recipientCode
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No Paystack bank recipient is connected to Brainfriend Global Tech.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * 6. CALCULATE REAL PROFIT
     * ============================================================
     *
     * IMPORTANT:
     *
     * We DO NOT use:
     *
     * businessWallet.availableProfit
     *
     * as the source of truth.
     *
     * We calculate the real amount directly from Transaction.
     */

    const transactionTotals =
      await prisma.transaction.aggregate({
        where: {
          status: "SUCCESS",
          isTest: false,

          type: {
            notIn: [
              "FUND_WALLET",
              "WITHDRAWAL",
            ],
          },
        },

        _sum: {
          amount: true,
          cost: true,
          profit: true,
        },
      });

    const totalRevenue =
      Number(
        transactionTotals._sum.amount ??
          0
      );

    const totalCost =
      Number(
        transactionTotals._sum.cost ??
          0
      );

    const totalProfit =
      Number(
        transactionTotals._sum.profit ??
          0
      );

    /*
     * ============================================================
     * 7. CALCULATE EXISTING WITHDRAWALS
     * ============================================================
     *
     * Pending and processing withdrawals reserve money.
     *
     * Successful withdrawals have already been paid.
     *
     * Failed and reversed withdrawals do not reduce availability.
     */

    const withdrawalTotals =
      await prisma.businessWithdrawal.aggregate(
        {
          where: {
            status: {
              in: [
                "PENDING",
                "PROCESSING",
                "SUCCESS",
              ],
            },
          },

          _sum: {
            amount: true,
          },
        }
      );

    const reservedWithdrawals =
      Number(
        withdrawalTotals._sum.amount ??
          0
      );

    /*
     * ============================================================
     * 8. CALCULATE REAL AVAILABLE PROFIT
     * ============================================================
     */

    const availableProfit =
      Math.max(
        0,
        totalProfit -
          reservedWithdrawals
      );

    /*
     * ============================================================
     * 9. CHECK WITHDRAWAL AMOUNT
     * ============================================================
     */

    if (
      roundedAmount >
      availableProfit
    ) {
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

    /*
     * ============================================================
     * 10. UPDATE WALLET CACHE
     * ============================================================
     */

    await prisma.businessWallet.update({
      where: {
        id: businessWallet.id,
      },

      data: {
        totalRevenue,

        totalCost,

        totalProfit,

        withdrawnProfit:
          reservedWithdrawals,

        availableProfit,

        balance:
          availableProfit,
      },
    });

    /*
     * ============================================================
     * 11. CREATE UNIQUE REFERENCE
     * ============================================================
     */

    const reference =
      `brainfriend-withdrawal-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    /*
     * Paystack uses kobo.
     */

    const amountInKobo =
      Math.round(
        roundedAmount * 100
      );

    /*
     * ============================================================
     * 12. CREATE PENDING WITHDRAWAL
     * ============================================================
     */

    const withdrawal =
      await prisma.businessWithdrawal.create(
        {
          data: {
            amount:
              roundedAmount,

            accountName:
              "Brainfriend Global Tech",

            accountNumber:
              "PAYSTACK_RECIPIENT",

            bankName:
              "Paystack Recipient",

            recipientCode:
              businessWallet.recipientCode,

            reference,

            status:
              "PENDING",

            method:
              "PAYSTACK",

            adminNote:
              "Paystack business profit withdrawal.",
          },
        }
      );

    /*
     * ============================================================
     * 13. SEND TRANSFER TO PAYSTACK
     * ============================================================
     */

    let paystackResponse: Response;

    let paystackData: any;

    try {
      paystackResponse =
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

              amount:
                amountInKobo,

              recipient:
                businessWallet.recipientCode,

              reference,

              reason:
                "Brainfriend Global Tech business profit withdrawal",

              currency: "NGN",
            }),
          }
        );

      paystackData =
        await paystackResponse.json();
    } catch (paystackError) {
      console.error(
        "PAYSTACK REQUEST ERROR:",
        paystackError
      );

      /*
       * Mark as failed because the transfer request
       * could not be completed.
       */

      await prisma.businessWithdrawal.update(
        {
          where: {
            id: withdrawal.id,
          },

          data: {
            status:
              "FAILED",

            adminNote:
              "Unable to communicate with Paystack.",

            processedAt:
              new Date(),
          },
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to communicate with Paystack.",
          reference,
        },
        { status: 502 }
      );
    }

    console.log(
      "PAYSTACK TRANSFER RESPONSE:",
      paystackData
    );

    /*
     * ============================================================
     * 14. PAYSTACK FAILURE
     * ============================================================
     */

    if (
      !paystackResponse.ok ||
      !paystackData.status
    ) {
      await prisma.businessWithdrawal.update(
        {
          where: {
            id: withdrawal.id,
          },

          data: {
            status:
              "FAILED",

            adminNote:
              paystackData.message ||
              "Paystack transfer failed.",

            processedAt:
              new Date(),
          },
        }
      );

      /*
       * Recalculate wallet because the failed withdrawal
       * should NOT reserve money.
       */

      await prisma.businessWallet.update({
        where: {
          id: businessWallet.id,
        },

        data: {
          totalRevenue,

          totalCost,

          totalProfit,

          withdrawnProfit:
            reservedWithdrawals,

          availableProfit,

          balance:
            availableProfit,
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

    /*
     * ============================================================
     * 15. DETERMINE PAYSTACK TRANSFER STATUS
     * ============================================================
     */

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
      paystackStatus ===
      "success"
    ) {
      withdrawalStatus =
        "SUCCESS";
    } else if (
      paystackStatus ===
        "failed" ||
      paystackStatus ===
        "reversed"
    ) {
      withdrawalStatus =
        "FAILED";
    } else {
      withdrawalStatus =
        "PROCESSING";
    }

    /*
     * ============================================================
     * 16. UPDATE WITHDRAWAL
     * ============================================================
     */

    const transferCode =
      transfer?.transfer_code ||
      null;

    const updatedWithdrawal =
      await prisma.businessWithdrawal.update(
        {
          where: {
            id: withdrawal.id,
          },

          data: {
            status:
              withdrawalStatus,

            transferCode,

            adminNote:
              paystackData.message ||
              "Paystack transfer initiated.",

            processedAt:
              withdrawalStatus ===
                "SUCCESS" ||
              withdrawalStatus ===
                "FAILED"
                ? new Date()
                : null,
          },
        }
      );

    /*
     * ============================================================
     * 17. RE-CALCULATE WALLET
     * ============================================================
     *
     * This is important.
     *
     * We calculate withdrawals AGAIN after creating/updating
     * the withdrawal record.
     *
     * That means:
     *
     * SUCCESS     -> deducted
     * PROCESSING  -> reserved
     * PENDING     -> reserved
     * FAILED      -> not deducted
     */

    const latestWithdrawalTotals =
      await prisma.businessWithdrawal.aggregate(
        {
          where: {
            status: {
              in: [
                "PENDING",
                "PROCESSING",
                "SUCCESS",
              ],
            },
          },

          _sum: {
            amount: true,
          },
        }
      );

    const latestReservedWithdrawals =
      Number(
        latestWithdrawalTotals
          ._sum.amount ?? 0
      );

    const latestAvailableProfit =
      Math.max(
        0,
        totalProfit -
          latestReservedWithdrawals
      );

    /*
     * ============================================================
     * 18. SYNCHRONIZE BUSINESS WALLET
     * ============================================================
     */

    await prisma.businessWallet.update({
      where: {
        id: businessWallet.id,
      },

      data: {
        totalRevenue,

        totalCost,

        totalProfit,

        withdrawnProfit:
          latestReservedWithdrawals,

        availableProfit:
          latestAvailableProfit,

        balance:
          latestAvailableProfit,
      },
    });

    /*
     * ============================================================
     * 19. RETURN RESULT
     * ============================================================
     */

    return NextResponse.json({
      success: true,

      message:
        withdrawalStatus ===
        "SUCCESS"
          ? "Withdrawal completed successfully."
          : "Withdrawal has been sent to Paystack for processing.",

      withdrawal: {
        id:
          updatedWithdrawal.id,

        amount:
          Number(
            updatedWithdrawal.amount
          ),

        status:
          updatedWithdrawal.status,

        reference:
          updatedWithdrawal.reference,

        transferCode:
          updatedWithdrawal.transferCode,

        createdAt:
          updatedWithdrawal.createdAt,
      },

      wallet: {
        totalRevenue,

        totalCost,

        totalProfit,

        withdrawnProfit:
          latestReservedWithdrawals,

        availableProfit:
          latestAvailableProfit,

        balance:
          latestAvailableProfit,
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