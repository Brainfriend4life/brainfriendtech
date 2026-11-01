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
        throw new Error("AgeVerify record not found.");
      }

      if (verification.status !== "COMPLETED") {
        throw new Error("Cannot record business revenue before completion.");
      }

      const chargeTransaction = await tx.transaction.findUnique({
        where: {
          reference: `CHARGE-${verification.reference}`,
        },
      });

      if (!chargeTransaction) {
        throw new Error("AgeVerify charge transaction not found.");
      }

      // Unique transactionId makes this finalization idempotent.
      const existingRevenue = await tx.businessRevenue.findUnique({
        where: {
          transactionId: chargeTransaction.id,
        },
      });

      if (existingRevenue) {
        return { alreadyRecorded: true };
      }

      const setting = await getReferralPercentage(tx);

      const providerCost = Number(chargeTransaction.cost);

      const amount = Number(verification.amount);
      const grossProfit = Number((amount - providerCost).toFixed(2));

      if (
        !Number.isFinite(amount) ||
        !Number.isFinite(providerCost) ||
        providerCost < 0 ||
        providerCost > amount
      ) {
        throw new Error("Invalid saved AgeVerify pricing.");
      }

      const referralCommission = verification.user.referredBy
        ? Number(((grossProfit * setting) / 100).toFixed(2))
        : 0;

      const profit = Number((grossProfit - referralCommission).toFixed(2));

      let businessWallet = await tx.businessWallet.findUnique({
        where: { name: BUSINESS_NAME },
      });

      if (!businessWallet) {
        businessWallet = await tx.businessWallet.create({
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

      const newBusinessBalance = Number(
        (Number(businessWallet.balance) + profit).toFixed(2),
      );

      await tx.businessWallet.update({
        where: { id: businessWallet.id },
        data: {
          balance: newBusinessBalance,
          totalRevenue: {
            increment: amount,
          },
          totalCost: {
            increment: providerCost,
          },
          totalProfit: {
            increment: profit,
          },
          availableProfit: {
            increment: profit,
          },
        },
      });

      await tx.businessRevenue.create({
        data: {
          transactionId: chargeTransaction.id,
          type: "NIN",
          provider: "AGEVERIFY",
          amount,
          cost: providerCost,
          profit,
          reference: verification.reference,
          description: `AgeVerify ${verification.service} verification (${verification.reference})`,
          businessWalletId: businessWallet.id,
        },
      });

      if (verification.user.referredBy && referralCommission > 0) {
        await tx.user.update({
          where: {
            id: verification.user.referredBy.id,
          },
          data: {
            referralBalance: {
              increment: referralCommission,
            },
          },
        });

        await tx.referralEarning.create({
          data: {
            referrerId: verification.user.referredBy.id,
            referredUserId: verification.userId,
            transactionId: chargeTransaction.id,
            amount: referralCommission,
            percentage: setting,
            transactionAmount: amount,
            type: "NIN",
            status: "SUCCESS",
            description: `Referral earning from ${verification.user.fullName}'s AgeVerify ${verification.service} verification of ₦${amount}`,
            reference: `REF-${verification.reference}`,
          },
        });
      }

      await tx.transaction.update({
        where: { id: chargeTransaction.id },
        data: {
          status: "SUCCESS",
          cost: providerCost,
          profit,
        },
      });

      return {
        alreadyRecorded: false,
        amount,
        providerCost,
        grossProfit,
        referralPercentage: setting,
        referralCommission,
        profit,
        businessBalance: newBusinessBalance,
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
      data: {
        refunded: true,
      },
    });

    if (claimed.count === 0) {
      return { refunded: false };
    }

    await tx.user.update({
      where: { id: verification.userId },
      data: {
        walletBalance: {
          increment: verification.amount,
        },
      },
    });

    await tx.transaction.create({
      data: {
        userId: verification.userId,
        type: "NIN",
        amount: verification.amount,
        description: `Refund for AgeVerify request (${verification.reference})`,
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
