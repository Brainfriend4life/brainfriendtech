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

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "PAYSTACK_SECRET_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    // =====================================================
    // 3. READ FORM DATA
    // =====================================================

    const body = await request.json();

    const accountName = String(body.accountName || "").trim();
    const accountNumber = String(body.accountNumber || "").trim();
    const bankCode = String(body.bankCode || "").trim();

    if (!accountName) {
      return NextResponse.json(
        {
          success: false,
          message: "Account name is required.",
        },
        { status: 400 }
      );
    }

    if (!accountNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Account number is required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          success: false,
          message: "Nigerian bank account number must be 10 digits.",
        },
        { status: 400 }
      );
    }

    if (!bankCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Bank is required.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 4. FIND BUSINESS WALLET
    // =====================================================

    const businessWallet = await prisma.businessWallet.findUnique({
      where: {
        name: "Brainfriend Tech",
      },
    });

    if (!businessWallet) {
      return NextResponse.json(
        {
          success: false,
          message: "Brainfriend Tech business wallet was not found.",
        },
        { status: 404 }
      );
    }

    // =====================================================
    // 5. CREATE PAYSTACK TRANSFER RECIPIENT
    // =====================================================

    const paystackResponse = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    console.log("PAYSTACK RECIPIENT RESPONSE:", paystackData);

    if (!paystackResponse.ok || !paystackData.status) {
      return NextResponse.json(
        {
          success: false,
          message:
            paystackData.message ||
            "Unable to connect this bank account to Paystack.",
        },
        { status: 400 }
      );
    }

    const recipientCode =
      paystackData.data?.recipient_code || null;

    if (!recipientCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paystack created the recipient but did not return a recipient code.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 6. SAVE RECIPIENT CODE
    // =====================================================

    const updatedWallet = await prisma.businessWallet.update({
      where: {
        id: businessWallet.id,
      },
      data: {
        recipientCode,
      },
    });

    // =====================================================
    // 7. SUCCESS
    // =====================================================

    return NextResponse.json({
      success: true,
      message: "Bank account connected successfully.",
      wallet: {
        id: updatedWallet.id,
        name: updatedWallet.name,
        recipientCode: updatedWallet.recipientCode,
      },
      bank: {
        accountName:
          paystackData.data?.details?.account_name ||
          accountName,

        accountNumber:
          paystackData.data?.details?.account_number ||
          accountNumber,

        bankName:
          paystackData.data?.details?.bank_name ||
          "Bank account",
      },
    });
  } catch (error) {
    console.error("BUSINESS RECIPIENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to connect bank account.",
        error:
          process.env.NODE_ENV === "development"
            ? String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}