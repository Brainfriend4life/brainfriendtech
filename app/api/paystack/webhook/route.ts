import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { handleTransferEvent } from "@/lib/transfer-webhook";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const naira = (value: number) =>
  value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

async function verifyPaystackTransaction(reference: string) {
  if (!PAYSTACK_SECRET) {
    throw new Error("PAYSTACK_SECRET_KEY is missing.");
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
      },
      cache: "no-store",
    },
  );

  const result = await response.json();

  if (!response.ok || result.status !== true) {
    throw new Error("Unable to verify Paystack transaction.");
  }

  return result.data;
}

export async function POST(req: NextRequest) {
  try {
    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { success: false, message: "Paystack is not configured." },
        { status: 500 },
      );
    }

    // Verify the raw webhook signature.
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) {
      return NextResponse.json(
        { success: false, message: "Invalid signature." },
        { status: 401 },
      );
    }

    const expectedSignature = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(rawBody)
      .digest("hex");

    const supplied = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      supplied.length !== expected.length ||
      !crypto.timingSafeEqual(supplied, expected)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid Paystack signature." },
        { status: 401 },
      );
    }

    const event = JSON.parse(rawBody);
    const data = event.data;
    if (
      typeof event.event === "string" &&
      event.event.startsWith("transfer.")
    ) {
      return handleTransferEvent(event);
    }

    // ==========================================
    // DVA IDENTITY / ASSIGNMENT EVENTS
    // ==========================================

    const customerCode = data?.customer?.customer_code || data?.customer_code;

    if (
      [
        "customeridentification.success",
        "customeridentification.failed",
        "dedicatedaccount.assign.success",
        "dedicatedaccount.assign.failed",
        "dedicatedaccount.assign.error",
        "assigndedicatedaccount.success",
        "assigndedicatedaccount.failed",
      ].includes(event.event)
    ) {
      const eventEmail = String(
        data?.customer?.email || data?.email || "",
      ).trim();

      if (!customerCode && !eventEmail) {
        console.error("Paystack DVA event missing customer details.");
        return NextResponse.json({ received: true });
      }

      // The account request is saved before Paystack answers, so it has no
      // customer code yet: match by code first, then by the customer's email.
      let account = customerCode
        ? await prisma.paystackVirtualAccount.findFirst({
            where: { customerCode },
          })
        : null;

      if (!account && eventEmail) {
        const owner = await prisma.user.findFirst({
          where: { email: { equals: eventEmail, mode: "insensitive" } },
          select: { id: true },
        });

        if (owner) {
          account = await prisma.paystackVirtualAccount.findUnique({
            where: { userId: owner.id },
          });
        }
      }

      if (!account) {
        console.error("DVA event: customer record not found.");
        return NextResponse.json({ received: true });
      }

      // Remember the customer code so later events and payments match it.
      if (customerCode && !account.customerCode) {
        await prisma.paystackVirtualAccount
          .update({
            where: { userId: account.userId },
            data: { customerCode: String(customerCode) },
          })
          .catch((error) =>
            console.error("DVA event: could not save customer code.", error),
          );
      }

      if (event.event === "customeridentification.success") {
        await prisma.paystackVirtualAccount.update({
          where: { userId: account.userId },
          data: {
            identificationStatus: "SUCCESS",
            verifiedAt: new Date(),
          },
        });
      }

      if (event.event === "customeridentification.failed") {
        await prisma.paystackVirtualAccount.update({
          where: { userId: account.userId },
          data: {
            identificationStatus: "FAILED",
            status: "FAILED",
          },
        });
      }

      if (
        [
          "dedicatedaccount.assign.success",
          "assigndedicatedaccount.success",
        ].includes(event.event)
      ) {
        const accountNumber = String(
          data?.dedicated_account?.account_number || data?.account_number || "",
        );

        const accountName =
          data?.dedicated_account?.account_name || data?.account_name || null;

        const bankName =
          data?.dedicated_account?.bank?.name || data?.bank?.name || null;

        const bankSlug =
          data?.dedicated_account?.bank?.slug || data?.bank?.slug || null;

        const accountId = data?.dedicated_account?.id || data?.account_id;

        if (!accountNumber || !accountId) {
          console.error("DVA assignment event missing account details.");
          return NextResponse.json({ received: true });
        }

        await prisma.paystackVirtualAccount.update({
          where: { userId: account.userId },
          data: {
            accountId: String(accountId),
            accountNumber,
            accountName,
            bankName,
            bankSlug,
            identificationStatus: "SUCCESS",
            assignmentStatus: "SUCCESS",
            status: "ASSIGNED",
            assignedAt: new Date(),
          },
        });
      }

      if (
        [
          "dedicatedaccount.assign.failed",
          "dedicatedaccount.assign.error",
          "assigndedicatedaccount.failed",
        ].includes(event.event)
      ) {
        await prisma.paystackVirtualAccount.update({
          where: { userId: account.userId },
          data: {
            assignmentStatus: "FAILED",
            status: "FAILED",
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    // ==========================================
    // ONLY HANDLE SUCCESSFUL CHARGES
    // ==========================================

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    if (!data?.reference || data.status !== "success") {
      return NextResponse.json({ received: true });
    }

    const reference = String(data.reference).trim();

    if (!reference) {
      return NextResponse.json({ received: true });
    }

    // Verify the transaction directly with Paystack.
    const payment = await verifyPaystackTransaction(reference);

    if (
      payment.status !== "success" ||
      String(payment.currency).toUpperCase() !== "NGN"
    ) {
      return NextResponse.json({ received: true });
    }

    // Test payments must never credit a live wallet.
    if (payment.domain === "test" && !PAYSTACK_SECRET.startsWith("sk_test")) {
      return NextResponse.json({ received: true });
    }

    const amountKobo = Number(payment.amount);
    const amount = amountKobo / 100;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid payment amount." },
        { status: 400 },
      );
    }

    // Ignore payments that are not wallet funding.
    const metadata = payment.metadata || {};

    const channel = payment.authorization?.channel;

    const isDedicatedNuban = channel === "dedicated_nuban";

    if (!isDedicatedNuban && metadata.purpose !== "wallet_funding") {
      return NextResponse.json({ received: true });
    }

    // ==========================================
    // WORK OUT WHAT THE CUSTOMER IS CREDITED
    // ==========================================
    //
    // Virtual account transfers: the customer is credited the amount they
    // sent minus Paystack's fee. Card funding is credited in full, as before.

    let creditAmount = amount;
    let feeAmount = 0;

    if (isDedicatedNuban) {
      const reportedFee = Number(payment.fees);

      // Paystack's reported fee; fall back to 1% capped at N300.
      const feeKobo =
        Number.isFinite(reportedFee) && reportedFee >= 0
          ? reportedFee
          : Math.min(Math.round(amountKobo * 0.01), 30000);

      feeAmount = feeKobo / 100;
      creditAmount = Math.round(amountKobo - feeKobo) / 100;

      if (creditAmount <= 0) {
        console.error("DVA payment is not larger than the fee.", {
          reference,
          amount,
          feeAmount,
        });
        return NextResponse.json({ received: true });
      }
    }

    // ==========================================
    // FIND THE CUSTOMER
    // ==========================================

    let userId: string | null = null;

    if (isDedicatedNuban) {
      // Paystack reports the receiving account inside "authorization".
      const accountNumber = String(
        payment.authorization?.receiver_bank_account_number ||
          data.authorization?.receiver_bank_account_number ||
          payment.receiver?.account_number ||
          payment.dedicated_account?.account_number ||
          "",
      );

      const paymentCustomerCode = String(
        payment.customer?.customer_code || data.customer?.customer_code || "",
      );

      let virtualAccount = accountNumber
        ? await prisma.paystackVirtualAccount.findFirst({
            where: { accountNumber, status: "ASSIGNED" },
          })
        : null;

      if (!virtualAccount && paymentCustomerCode) {
        virtualAccount = await prisma.paystackVirtualAccount.findFirst({
          where: { customerCode: paymentCustomerCode, status: "ASSIGNED" },
        });
      }

      if (virtualAccount) {
        userId = virtualAccount.userId;
      } else {
        // Last resort: the account was created for the user's own email.
        const email = String(payment.customer?.email || "")
          .trim()
          .toLowerCase();

        if (email) {
          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });

          userId = user?.id || null;
        }

        console.error("DVA payment matched by email or not found.", {
          reference,
          accountNumber,
          matched: Boolean(userId),
        });
      }
    } else {
      const email = String(payment.customer?.email || "")
        .trim()
        .toLowerCase();

      if (!email) {
        return NextResponse.json({ received: true });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      userId = user?.id || null;
    }

    if (!userId) {
      console.error("Paystack payment customer not found.", { reference });
      return NextResponse.json({ received: true });
    }

    // ==========================================
    // CREDIT WALLET ONCE
    // ==========================================

    try {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId: userId!,
            type: "FUND_WALLET",
            provider: "PAYSTACK",
            amount: creditAmount,
            description: isDedicatedNuban
              ? `Wallet funding through virtual account: ₦${naira(amount)} sent, ₦${naira(feeAmount)} fee`
              : `Wallet funding of ₦${naira(amount)}`,
            status: "SUCCESS",
            reference,
            isTest: payment.domain === "test",
          },
        });

        await tx.user.update({
          where: { id: userId! },
          data: {
            walletBalance: { increment: creditAmount },
          },
        });
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        return NextResponse.json({ received: true });
      }

      throw error;
    }

    console.log("PAYSTACK WALLET CREDIT SUCCESS", {
      userId,
      amount,
      credited: creditAmount,
      fee: feeAmount,
      reference,
      channel,
    });

    return NextResponse.json({
      success: true,
      message: "Wallet credited successfully.",
    });
  } catch (error) {
    console.error("PAYSTACK WEBHOOK ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
