import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

type RecordBusinessRevenueParams = {
  transactionId: string;
  type: TransactionType;
  provider: string;
  amount: number;
  cost: number;
  reference: string;
  description?: string;
};

export async function getBusinessWallet() {
  let wallet = await prisma.businessWallet.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!wallet) {
    wallet = await prisma.businessWallet.create({
      data: {
        name: "Brainfriend Global Tech",
        balance: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        withdrawnProfit: 0,
        availableProfit: 0,
      },
    });
  }

  return wallet;
}

export async function recordBusinessRevenue({
  transactionId,
  type,
  provider,
  amount,
  cost,
  reference,
  description,
}: RecordBusinessRevenueParams) {
  const profit = Number(amount) - Number(cost);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid revenue amount.");
  }

  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error("Invalid provider cost.");
  }

  if (!Number.isFinite(profit) || profit < 0) {
    throw new Error(
      "Business profit cannot be negative."
    );
  }

  return prisma.$transaction(async (tx) => {
    let wallet = await tx.businessWallet.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!wallet) {
      wallet = await tx.businessWallet.create({
        data: {
          name: "Brainfriend Global Tech",
          balance: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          withdrawnProfit: 0,
          availableProfit: 0,
        },
      });
    }

    // Prevent duplicate revenue records
    const existingRevenue =
      await tx.businessRevenue.findUnique({
        where: {
          transactionId,
        },
      });

    if (existingRevenue) {
      return {
        wallet,
        revenue: existingRevenue,
        duplicate: true,
      };
    }

    const revenue =
      await tx.businessRevenue.create({
        data: {
          transactionId,
          type,
          provider,
          amount,
          cost,
          profit,
          reference,
          description,
          businessWalletId: wallet.id,
        },
      });

    const updatedWallet =
      await tx.businessWallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: {
            increment: profit,
          },

          totalRevenue: {
            increment: amount,
          },

          totalCost: {
            increment: cost,
          },

          totalProfit: {
            increment: profit,
          },

          availableProfit: {
            increment: profit,
          },
        },
      });

    return {
      wallet: updatedWallet,
      revenue,
      duplicate: false,
    };
  });
}