
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
    // 2. PAYSTACK SECRET KEY
    // =====================================================

    const paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY is missing");

      return NextResponse.json(
        {
          success: false,
          message: "Paystack is not configured correctly.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 3. READ BANK DETAILS
    // =====================================================

    const body = await request.json();

    const accountName =
      String(body.accountName || "").trim();

    const accountNumber =
      String(body.accountNumber || "").trim();

    const bankCode =
      String(body.bankCode || "").trim();

    if (!accountName) {
      return NextResponse.json(
        {
          success: false,
          message: "Account name is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          success: false,
          message: "Account number must contain exactly 10 digits.",
        },
        { status: 400 }
      );
    }

    if (!bankCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select your bank.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 4. VERIFY BANK ACCOUNT WITH PAYSTACK
    // =====================================================

    const resolveResponse = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
        accountNumber
      )}&bank_code=${encodeURIComponent(bankCode)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const resolveData = await resolveResponse.json();

    console.log(
      "PAYSTACK ACCOUNT RESOLUTION:",
      resolveData
    );

    if (!resolveResponse.ok || !resolveData.status) {
      return NextResponse.json(
        {
          success: false,
          message:
            resolveData.message ||
            "Unable to verify this bank account.",
        },
        { status: 400 }
      );
    }

    const resolvedAccountName =
      String(
        resolveData.data?.account_name || ""
      ).trim();

    if (!resolvedAccountName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paystack could not verify the bank account.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 5. CREATE PAYSTACK TRANSFER RECIPIENT
    // =====================================================

    const recipientResponse = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          type: "nuban",
          name: resolvedAccountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        }),
      }
    );

    const recipientData =
      await recipientResponse.json();

    console.log(
      "PAYSTACK RECIPIENT RESPONSE:",
      recipientData
    );

    if (
      !recipientResponse.ok ||
      !recipientData.status
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            recipientData.message ||
            "Unable to create Paystack recipient.",
        },
        { status: 400 }
      );
    }

    const recipientCode =
      recipientData.data?.recipient_code;

    if (!recipientCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paystack did not return a recipient code.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 6. SAVE RECIPIENT CODE
    // =====================================================

    const businessWallet =
      await prisma.businessWallet.upsert({
        where: {
          name: "Brainfriend Tech",
        },

        create: {
          name: "Brainfriend Tech",
          recipientCode,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          withdrawnProfit: 0,
          availableProfit: 0,
          balance: 0,
        },

        update: {
          recipientCode,
        },
      });

    console.log(
      "BUSINESS WALLET RECIPIENT SAVED:",
      recipientCode
    );

    // =====================================================
    // 7. RETURN SUCCESS
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        "Business bank account connected successfully.",

      wallet: {
        id: businessWallet.id,
        name: businessWallet.name,
        recipientCode:
          businessWallet.recipientCode,
      },

      account: {
        accountName: resolvedAccountName,
        accountNumber,
        bankCode,
      },
    });
  } catch (error) {
    console.error(
      "=========================================="
    );

    console.error(
      "BUSINESS BANK CONNECTION ERROR:",
      error
    );

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to connect business bank account.",

        error:
          process.env.NODE_ENV === "development"
            ? String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

