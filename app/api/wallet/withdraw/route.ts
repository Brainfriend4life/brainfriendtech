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

// Most one user can withdraw in any rolling 24 hours (in naira)
const DAILY_WITHDRAWAL_LIMIT = 10000;

// Wrong PIN tries allowed before withdrawals lock
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 60;

class DailyLimitError extends Error {
  remaining: number;
  constructor(remaining: number) {
    super("DAILY_LIMIT_EXCEEDED");
    this.remaining = remaining;
  }
}

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

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
        { error: `Minimum withdrawal is ${naira(MIN_WITHDRAWAL)}.` },
        { status: 400 },
      );
    }

    if (amount > DAILY_WITHDRAWAL_LIMIT) {
      return NextResponse.json(
        {
          error: `The maximum you can withdraw in 24 hours is ${naira(DAILY_WITHDRAWAL_LIMIT)}.`,
        },
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

    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        { error: "Enter your transaction PIN." },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // Transaction PIN check with lockout
    // ---------------------------------------------------------
    const pinUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        transactionPinHash: true,
        transactionPinLockedUntil: true,
      },
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

    const now = new Date();

    // Currently locked: refuse without even looking at the PIN
    if (
      pinUser.transactionPinLockedUntil &&
      pinUser.transactionPinLockedUntil > now
    ) {
      const mins = Math.ceil(
        (pinUser.transactionPinLockedUntil.getTime() - now.getTime()) / 60000,
      );
      return NextResponse.json(
        {
          error: `Too many wrong PIN attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
        },
        { status: 429 },
      );
    }

    // An old lock has expired: start fresh
    if (pinUser.transactionPinLockedUntil) {
      await prisma.user.update({
        where: { id: pinUser.id },
        data: { transactionPinAttempts: 0, transactionPinLockedUntil: null },
      });
    }

    // Count this attempt BEFORE checking the PIN. The increment is atomic, so
    // many guesses fired at once cannot slip past the limit.
    const counted = await prisma.user.update({
      where: { id: pinUser.id },
      data: { transactionPinAttempts: { increment: 1 } },
      select: { transactionPinAttempts: true },
    });
    const attempts = counted.transactionPinAttempts;

    if (attempts > MAX_PIN_ATTEMPTS) {
      await prisma.user.updateMany({
        where: { id: pinUser.id, transactionPinLockedUntil: null },
        data: {
          transactionPinLockedUntil: new Date(
            Date.now() + PIN_LOCK_MINUTES * 60000,
          ),
        },
      });
      return NextResponse.json(
        {
          error: `Too many wrong PIN attempts. Withdrawals are locked for ${PIN_LOCK_MINUTES} minutes.`,
        },
        { status: 429 },
      );
    }

    const pinMatches = await bcrypt.compare(pin, pinUser.transactionPinHash);

    if (!pinMatches) {
      if (attempts >= MAX_PIN_ATTEMPTS) {
        await prisma.user.update({
          where: { id: pinUser.id },
          data: {
            transactionPinLockedUntil: new Date(
              Date.now() + PIN_LOCK_MINUTES * 60000,
            ),
          },
        });
        return NextResponse.json(
          {
            error: `Too many wrong PIN attempts. Withdrawals are locked for ${PIN_LOCK_MINUTES} minutes.`,
          },
          { status: 429 },
        );
      }

      const left = MAX_PIN_ATTEMPTS - attempts;
      return NextResponse.json(
        {
          error: `Incorrect transaction PIN. ${left} attempt${left === 1 ? "" : "s"} left.`,
        },
        { status: 403 },
      );
    }

    // Correct PIN: clear the failed-attempt counter
    await prisma.user.update({
      where: { id: pinUser.id },
      data: {
        transactionPinAttempts: 0,
        transactionPinLockedUntil: null,
        lastTransactionPinCheck: new Date(),
      },
    });

    // ---------------------------------------------------------
    // Verify the destination account with Paystack
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 1) Debit the wallet and record the withdrawal (atomic)
    // ---------------------------------------------------------
    const walletBalance = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true, status: true },
      });

      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.status !== "ACTIVE") throw new Error("ACCOUNT_SUSPENDED");

      // Only debits if the balance is still enough. This also locks the user's
      // row until the transaction ends, so two withdrawals started at the same
      // time are handled one after the other (the cap check below stays accurate).
      const debited = await tx.user.updateMany({
        where: { id: user.id, walletBalance: { gte: amount } },
        data: { walletBalance: { decrement: amount } },
      });
      if (debited.count === 0) throw new Error("INSUFFICIENT_BALANCE");

      // Daily cap: everything this user withdrew in the last 24 hours
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await tx.withdrawal.aggregate({
        _sum: { amount: true },
        where: {
          userId: user.id,
          createdAt: { gte: since },
          status: { in: ["PENDING", "APPROVED", "PAID"] },
        },
      });
      const usedToday = recent._sum.amount ?? 0;

      if (usedToday + amount > DAILY_WITHDRAWAL_LIMIT) {
        // Throwing rolls back the debit above
        throw new DailyLimitError(
          Math.max(DAILY_WITHDRAWAL_LIMIT - usedToday, 0),
        );
      }

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

    // ---------------------------------------------------------
    // 2) Send the money through Paystack
    // ---------------------------------------------------------
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

    if (error instanceof DailyLimitError) {
      const left = error.remaining;
      return NextResponse.json(
        {
          error:
            left > 0
              ? `Daily withdrawal limit reached. You can withdraw up to ${naira(left)} more in the next 24 hours.`
              : `Daily withdrawal limit of ${naira(DAILY_WITHDRAWAL_LIMIT)} reached. Try again later.`,
        },
        { status: 400 },
      );
    }

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
