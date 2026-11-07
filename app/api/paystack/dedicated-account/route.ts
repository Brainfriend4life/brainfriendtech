import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// A request that has been PROCESSING for this long is assumed to have missed
// its webhook, so it is checked with Paystack and may be retried.
const STALE_AFTER_MS = 10 * 60 * 1000;

/**
 * Asks Paystack for the customer's dedicated account and saves it.
 * Covers a missed webhook: the page can still show the account number.
 * Returns true when an assigned account was found and saved.
 */
async function syncFromPaystack(userId: string, email: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) return false;

  try {
    const response = await fetch(
      `https://api.paystack.co/customer/${encodeURIComponent(email)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    const result = await response.json().catch(() => null);
    const customer = result?.data;
    const account = customer?.dedicated_account;

    if (!response.ok || !account?.account_number) return false;

    await prisma.paystackVirtualAccount.update({
      where: { userId },
      data: {
        customerCode: customer.customer_code
          ? String(customer.customer_code)
          : undefined,
        accountId: account.id ? String(account.id) : undefined,
        accountNumber: String(account.account_number),
        accountName: account.account_name ?? null,
        bankName: account.bank?.name ?? null,
        bankSlug: account.bank?.slug ?? null,
        identificationStatus: "SUCCESS",
        assignmentStatus: "SUCCESS",
        status: "ASSIGNED",
        verifiedAt: new Date(),
        assignedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error("PAYSTACK DVA SYNC ERROR:", error);
    return false;
  }
}

// GET: Fetch the logged-in user's virtual account
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 },
      );
    }

    const select = {
      id: true,
      email: true,
      paystackVirtualAccount: {
        select: {
          accountNumber: true,
          accountName: true,
          bankName: true,
          bankSlug: true,
          status: true,
          identificationStatus: true,
          assignmentStatus: true,
          assignedAt: true,
          updatedAt: true,
        },
      },
    } as const;

    let user = await prisma.user.findUnique({ where: { email }, select });

    const account = user?.paystackVirtualAccount;

    // Still waiting on Paystack: check directly instead of relying only on
    // the webhook.
    if (user && account?.status === "PROCESSING") {
      const waitedMs = Date.now() - new Date(account.updatedAt).getTime();

      if (waitedMs > 30 * 1000) {
        const found = await syncFromPaystack(user.id, user.email);

        if (found) {
          user = await prisma.user.findUnique({ where: { email }, select });
        }
      }
    }

    const current = user?.paystackVirtualAccount;

    return NextResponse.json({
      success: true,
      virtualAccount: current
        ? {
            accountNumber: current.accountNumber,
            accountName: current.accountName,
            bankName: current.bankName,
            bankSlug: current.bankSlug,
            status: current.status,
            identificationStatus: current.identificationStatus,
            assignmentStatus: current.assignmentStatus,
            assignedAt: current.assignedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("FETCH PAYSTACK VIRTUAL ACCOUNT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load your virtual account.",
      },
      { status: 500 },
    );
  }
}

// POST: Request a new Paystack virtual account
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 },
      );
    }

    let body;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 },
      );
    }

    const { bvn, accountNumber, bankCode, consent } = body;

    // Require explicit customer consent
    if (consent !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "You must consent to identity verification.",
        },
        { status: 400 },
      );
    }

    // Validate submitted bank details
    if (
      typeof bvn !== "string" ||
      !/^\d{11}$/.test(bvn) ||
      typeof accountNumber !== "string" ||
      !/^\d{10}$/.test(accountNumber) ||
      typeof bankCode !== "string" ||
      !/^\d+$/.test(bankCode)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid BVN, account number and bank code.",
        },
        { status: 400 },
      );
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    const preferredBank = process.env.PAYSTACK_DVA_BANK;

    if (!secret || !preferredBank) {
      return NextResponse.json(
        {
          success: false,
          message: "Virtual account service is not configured.",
        },
        { status: 500 },
      );
    }

    // Get customer information
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        paystackVirtualAccount: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    let existing = user.paystackVirtualAccount;

    // Prevent duplicate account assignment
    if (existing?.status === "ASSIGNED" && existing.accountNumber) {
      return NextResponse.json({
        success: true,
        message: "Your virtual account already exists.",
        virtualAccount: {
          accountNumber: existing.accountNumber,
          accountName: existing.accountName,
          bankName: existing.bankName,
          bankSlug: existing.bankSlug,
          status: existing.status,
        },
      });
    }

    // A request that is still processing is not submitted twice, unless it
    // has been waiting long enough to have missed its webhook.
    if (existing?.status === "PROCESSING") {
      const waitedMs = Date.now() - new Date(existing.updatedAt).getTime();

      if (waitedMs < STALE_AFTER_MS) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Your previous request is still processing. Please check again shortly.",
          },
          { status: 409 },
        );
      }

      // Maybe Paystack already created it and only the webhook was lost.
      const found = await syncFromPaystack(user.id, user.email);

      if (found) {
        const synced = await prisma.paystackVirtualAccount.findUnique({
          where: { userId: user.id },
        });

        return NextResponse.json({
          success: true,
          message: "Your virtual account is ready.",
          virtualAccount: synced
            ? {
                accountNumber: synced.accountNumber,
                accountName: synced.accountName,
                bankName: synced.bankName,
                bankSlug: synced.bankSlug,
                status: synced.status,
              }
            : null,
        });
      }
    }

    // Validate profile name
    const fullName = user.fullName?.trim();

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "Please add your full name to your profile.",
        },
        { status: 400 },
      );
    }

    const nameParts = fullName.split(/\s+/);

    if (nameParts.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Please update your profile with your first and last names.",
        },
        { status: 400 },
      );
    }

    // Validate phone number
    if (!user.phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Please add your phone number to your profile.",
        },
        { status: 400 },
      );
    }

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    const cleanedPhone = user.phone.replace(/[\s()-]/g, "");

    const phone = cleanedPhone.startsWith("0")
      ? `+234${cleanedPhone.slice(1)}`
      : cleanedPhone.startsWith("+")
        ? cleanedPhone
        : `+234${cleanedPhone}`;

    if (!/^\+\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid phone number in your profile.",
        },
        { status: 400 },
      );
    }

    const assignmentReference = `DVA_${crypto.randomUUID()}`;

    // Save the request before contacting Paystack
    await prisma.paystackVirtualAccount.upsert({
      where: { userId: user.id },

      create: {
        userId: user.id,
        status: "PROCESSING",
        identificationStatus: "PROCESSING",
        assignmentStatus: "PROCESSING",
        consentGivenAt: new Date(),
        assignmentReference,
      },

      update: {
        status: "PROCESSING",
        identificationStatus: "PROCESSING",
        assignmentStatus: "PROCESSING",
        consentGivenAt: new Date(),
        assignmentReference,
        customerCode: null,
        accountId: null,
        accountNumber: null,
        accountName: null,
        bankName: null,
        bankSlug: null,
        verifiedAt: null,
        assignedAt: null,
      },
    });

    // Submit assignment request to Paystack
    let response: Response;

    try {
      response = await fetch(
        "https://api.paystack.co/dedicated_account/assign",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            phone,
            preferred_bank: preferredBank,
            country: "NG",
            account_number: accountNumber,
            bvn,
            bank_code: bankCode,
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
    } catch (error) {
      // The request may have reached Paystack even if our connection timed out.
      // Keep PROCESSING so a duplicate assignment is not submitted.
      console.error("PAYSTACK DVA CONNECTION ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message:
            "We could not confirm your request status. Please check again shortly before trying again.",
        },
        { status: 503 },
      );
    }

    let result;

    try {
      result = await response.json();
    } catch {
      // Do not assume the request failed if Paystack's response is unreadable.
      return NextResponse.json(
        {
          success: false,
          message:
            "Your request was submitted but its status could not be confirmed. Please check again shortly.",
        },
        { status: 503 },
      );
    }

    if (!response.ok || result.status !== true) {
      // Paystack explicitly rejected the request.
      await prisma.paystackVirtualAccount.update({
        where: { userId: user.id },
        data: {
          status: "FAILED",
          identificationStatus: "FAILED",
          assignmentStatus: "FAILED",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            result.message ||
            "Paystack could not process your virtual account request.",
        },
        { status: 400 },
      );
    }

    // Paystack processes identity verification and account assignment
    // asynchronously. The webhook (or the sync above) saves the final account.
    return NextResponse.json({
      success: true,
      message:
        result.message ||
        "Your request has been submitted. Your virtual account will appear after Paystack completes verification.",
      status: "PROCESSING",
    });
  } catch (error) {
    console.error("PAYSTACK DVA REQUEST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again later.",
      },
      { status: 500 },
    );
  }
}
