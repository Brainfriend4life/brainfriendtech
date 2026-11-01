import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const BUSINESS_NAME = "Brainfriend Global Tech";
const REFERRAL_SETTING_KEY = "REFERRAL_COMMISSION_AGEVERIFY";

async function getReferralPercentage(
  tx: Prisma.TransactionClient,
): Promise<number> {
  const setting = await tx.systemSetting.findUnique({
    where: { key: REFERRAL_SETTING_KEY },
  });

  const percentage = Number(setting?.value ?? 1);

  if (!Number.isFinite(percentage)) return 1;

  return Math.max(0, Math.min(100, percentage));
}

export async function finalizeAgeVerifySuccess(verificationId: string) {
  return prisma.$transaction(
    async (tx) => {
      const verification = await tx.identityVerification.findUnique({
        where: { id: verificationId },
        include: {
          user: {
            include: {
              referredBy: true,
            },
          },
        },
      });

      if (!verification) {
        throw new Error("Verification record not found.");
      }

      if (verification.status !== "COMPLETED") {
        throw new Error("Cannot record revenue before completion.");
      }

      const charge = await tx.transaction.findUnique({
        where: {
          reference: `CHARGE-${verification.reference}`,
        },
      });

      if (!charge || charge.provider !== "AGEVERIFY") {
        throw new Error("Verification customer charge not found.");
      }

      const existingRevenue = await tx.businessRevenue.findUnique({
        where: { transactionId: charge.id },
      });

      if (existingRevenue) {
        await tx.transaction.update({
          where: { id: charge.id },
          data: { status: "SUCCESS" },
        });

        return {
          alreadyRecorded: true,
          revenueId: existingRevenue.id,
        };
      }

      const amount = Number(verification.amount);
      const providerCost = Number(charge.cost);

      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isFinite(providerCost) ||
        providerCost <= 0
      ) {
        throw new Error(
          `Valid selling price or provider cost is missing for ${verification.reference}.`,
        );
      }

      const grossProfit = Number((amount - providerCost).toFixed(2));
      const referralPercentage = await getReferralPercentage(tx);

      const referralCommission =
        verification.user.referredBy && grossProfit > 0
          ? Number(((grossProfit * referralPercentage) / 100).toFixed(2))
          : 0;

      const netProfit = Number((grossProfit - referralCommission).toFixed(2));

      let wallet = await tx.businessWallet.findUnique({
        where: { name: BUSINESS_NAME },
      });

      if (!wallet) {
        wallet = await tx.businessWallet.create({
          data: {
            name: BUSINESS_NAME,
            balance: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            withdrawnProfit: 0,
            availableProfit: 0,
          },
        });
      }

      // Atomic increments: two verifications finishing at the same moment
      // can no longer overwrite each other's wallet balance.
      const updatedWallet = await tx.businessWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: netProfit },
          totalRevenue: { increment: amount },
          totalCost: { increment: providerCost },
          totalProfit: { increment: netProfit },
          availableProfit: { increment: netProfit },
        },
      });

      const revenue = await tx.businessRevenue.create({
        data: {
          transactionId: charge.id,
          type: "NIN",
          provider: "AGEVERIFY",
          amount,
          cost: providerCost,
          profit: netProfit,
          reference: verification.reference,
          description: `${verification.service} verification (${verification.reference})`,
          businessWalletId: wallet.id,
        },
      });

      if (verification.user.referredBy && referralCommission > 0) {
        const referrerId = verification.user.referredBy.id;

        await tx.user.update({
          where: { id: referrerId },
          data: {
            referralBalance: { increment: referralCommission },
          },
        });

        await tx.referralEarning.create({
          data: {
            referrerId,
            referredUserId: verification.userId,
            transactionId: charge.id,
            amount: referralCommission,
            percentage: referralPercentage,
            transactionAmount: amount,
            type: "NIN",
            status: "SUCCESS",
            description: `Referral earning from ${verification.service} verification`,
            reference: `REF-${verification.reference}`,
          },
        });
      }

      await tx.transaction.update({
        where: { id: charge.id },
        data: {
          status: "SUCCESS",
          cost: providerCost,
          profit: netProfit,
        },
      });

      return {
        alreadyRecorded: false,
        revenueId: revenue.id,
        amount,
        providerCost,
        grossProfit,
        referralPercentage,
        referralCommission,
        netProfit,
        businessBalance: Number(updatedWallet.balance),
      };
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );
}

export async function refundAgeVerify(verificationId: string) {
  return prisma.$transaction(async (tx) => {
    const verification = await tx.identityVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification || verification.refunded) {
      return { refunded: false };
    }

    if (verification.status !== "FAILED") {
      return { refunded: false };
    }

    const claimed = await tx.identityVerification.updateMany({
      where: {
        id: verificationId,
        refunded: false,
        status: "FAILED",
      },
      data: { refunded: true },
    });

    if (claimed.count === 0) {
      return { refunded: false };
    }

    await tx.user.update({
      where: { id: verification.userId },
      data: {
        walletBalance: { increment: verification.amount },
      },
    });

    await tx.transaction.create({
      data: {
        userId: verification.userId,
        type: "NIN",
        amount: verification.amount,
        description: `Refund for request (${verification.reference})`,
        status: "SUCCESS",
        reference: `REFUND-${verification.reference}`,
        provider: "AGEVERIFY",
        cost: 0,
        profit: 0,
      },
    });

    await tx.transaction.updateMany({
      where: {
        reference: `CHARGE-${verification.reference}`,
        provider: "AGEVERIFY",
        status: "PENDING",
      },
      data: {
        status: "FAILED",
        cost: 0,
        profit: 0,
      },
    });

    return { refunded: true };
  });
}
