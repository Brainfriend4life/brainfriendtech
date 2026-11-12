import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs"; // use the same library your login/PIN code uses
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PaystackError,
  createRecipient,
  initiateTransfer,
  resolveAccount,
} from "@/lib/paystack";
import { failWithdrawal } from "@/lib/withdrawals";
import { USER_PAYS_FEE, transferFee } from "@/lib/transfer-fee";

const MIN_WITHDRAWAL = 100;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const email = session.user.email;

    const body = await request.json();
    const amount = Number(body?.amount);
    const accountNumber =
      typeof body?.accountNumber === "string" ? body.accountNumber.trim() : "";
    const bankCode =
      typeof body?.bankCode === "string" ? body.bankCode.trim() : "";
    const bankName =
      typeof body?.bankName === "string" ? body.bankName.trim() : "";
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

    if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL}.` },
        { status: 400 },
      );
    }

    if (!bankCode || !bankName || !accountNumber) {
      return NextResponse.json(
        { error: "Bank and account number are required." },
        { status: 400 },
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must contain 10 digits." },
        { status: 400 },
      );
    }

    // Transaction PIN check (before anything touches money)
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: "Enter your transaction PIN." },
        { status: 400 },
      );
    }

    const pinUser = await prisma.user.findUnique({
      where: { email },
      select: { transactionPinHash: true },
    });

    if (!pinUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!pinUser.transactionPinHash) {
      return NextResponse.json(
        { error: "Set your transaction PIN before withdrawing." },
        { status: 400 },
      );
    }

    const pinMatches = await bcrypt.compare(pin, pinUser.transactionPinHash);

    if (!pinMatches) {
      return NextResponse.json(
        { error: "Incorrect transaction PIN." },
        { status: 403 },
      );
    }

    // Verify the account with Paystack. Never trust the name sent by the browser.
    let accountName: string;
    try {
      accountName = (await resolveAccount(accountNumber, bankCode))
        .account_name;
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not verify this account. Check the bank and account number.",
        },
        { status: 400 },
      );
    }

    const fee = USER_PAYS_FEE ? transferFee(amount) : 0;
    const payout = amount - fee;

    // Lowercase letters, numbers, "_" and "-" only: required by Paystack references
    const reference = `wd_${Date.now()}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;

    // 1) Debit the wallet and record the withdrawal (atomic)
    const walletBalance = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true, status: true },
      });

      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.status !== "ACTIVE") throw new Error("ACCOUNT_SUSPENDED");

      // Only debits if the balance is still enough: blocks double-spend races
      const debited = await tx.user.updateMany({
        where: { id: user.id, walletBalance: { gte: amount } },
        data: { walletBalance: { decrement: amount } },
      });
      if (debited.count === 0) throw new Error("INSUFFICIENT_BALANCE");

      await tx.withdrawal.create({
        data: {
          userId: user.id,
          amount,
          accountName,
          accountNumber,
          bankName,
          status: "PENDING",
          reference,
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "WITHDRAWAL",
          amount,
          description: `Withdrawal to ${bankName} ${accountNumber}`,
          status: "pending",
          reference,
          provider: "INTERNAL",
        },
      });

      const fresh = await tx.user.findUnique({
        where: { id: user.id },
        select: { walletBalance: true },
      });
      return fresh?.walletBalance ?? 0;
    });

    // 2) Send the money through Paystack
    try {
      const recipient = await createRecipient({
        name: accountName,
        accountNumber,
        bankCode,
      });

      const transfer = await initiateTransfer({
        amountNaira: payout,
        recipient: recipient.recipient_code,
        reference,
        reason: "Wallet withdrawal",
      });

      if (transfer.status === "otp") {
        throw new PaystackError("Transfer OTP is still enabled on Paystack.");
      }

      // Mark as sent to Paystack (skipped if the webhook already settled it)
      await prisma.withdrawal.updateMany({
        where: { reference, status: "PENDING" },
        data: { status: "APPROVED", adminNote: "Sent to Paystack" },
      });
    } catch (err) {
      console.error("PAYSTACK TRANSFER ERROR:", err);

      if (err instanceof PaystackError) {
        // Paystack refused it, so nothing was sent: return the money
        await failWithdrawal(reference);
        return NextResponse.json(
          {
            error:
              "We could not process your withdrawal right now. Your money is back in your wallet. Please try again later.",
          },
          { status: 502 },
        );
      }

      // Network/timeout: Paystack may or may not have received it.
      // Leave it PENDING (no refund) so you can never pay twice. Check it in
      // your Paystack dashboard; the webhook will settle it if it went through.
    }

    return NextResponse.json({
      success: true,
      message:
        "Withdrawal submitted. Your money is on its way to your bank account.",
      walletBalance,
    });
  } catch (error) {
    console.error("WITHDRAWAL REQUEST ERROR:", error);

    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      if (error.message === "ACCOUNT_SUSPENDED") {
        return NextResponse.json(
          { error: "Your account is suspended." },
          { status: 403 },
        );
      }
      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: "Insufficient wallet balance." },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to submit withdrawal request." },
      { status: 500 },
    );
  }
}
