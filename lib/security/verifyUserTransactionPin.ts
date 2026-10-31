import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function verifyUserTransactionPin(
  userId: string,
  pin: string,
): Promise<{ valid: boolean; error?: string; status?: number }> {
  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, error: "Enter your 4-digit transaction PIN.", status: 400 };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { valid: false, error: "User not found.", status: 404 };
  }

  if (!user.transactionPinEnabled || !user.transactionPinHash) {
    return { valid: false, error: "Please set up your transaction PIN first.", status: 400 };
  }

  if (
    user.transactionPinLockedUntil &&
    user.transactionPinLockedUntil > new Date()
  ) {
    return {
      valid: false,
      error: "Transaction PIN temporarily locked. Try again later.",
      status: 403,
    };
  }

  const correct = await bcrypt.compare(pin, user.transactionPinHash);

  if (!correct) {
    const attempts = user.transactionPinAttempts + 1;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        transactionPinAttempts: attempts,
        transactionPinLockedUntil:
          attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });

    return {
      valid: false,
      error: "Incorrect transaction PIN.",
      status: 401,
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      transactionPinAttempts: 0,
      transactionPinLockedUntil: null,
      lastTransactionPinCheck: new Date(),
    },
  });

  return { valid: true };
}
