
import { prisma } from "@/lib/prisma";

const DEFAULT_SERVICE_FEE_PERCENT = 5;

const SERVICE_FEE_KEYS = [
  "SERVICE_FEE_PERCENT",
  "DATA_SERVICE_FEE_PERCENTAGE",
  "SERVICE_FEE_PERCENTAGE",
  "SERVICE_FEE",
];

export async function getServiceFeePercent(): Promise<number> {
  try {
    const setting =
      await prisma.systemSetting.findFirst({
        where: {
          key: {
            in: SERVICE_FEE_KEYS,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

    if (setting) {
      const value = Number(
        setting.value
      );

      if (
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
      ) {
        return value;
      }
    }
  } catch (error) {
    console.error(
      "SERVICE FEE SETTING ERROR:",
      error
    );
  }

  return DEFAULT_SERVICE_FEE_PERCENT;
}

export function calculateServiceFee(
  providerCost: number,
  serviceFeePercent: number
) {
  const cleanProviderCost =
    Number(
      providerCost.toFixed(2)
    );

  const cleanServiceFeePercent =
    Number(
      serviceFeePercent.toFixed(2)
    );

  const serviceFee =
    Number(
      (
        cleanProviderCost *
        (cleanServiceFeePercent / 100)
      ).toFixed(2)
    );

  const totalAmount =
    Number(
      (
        cleanProviderCost +
        serviceFee
      ).toFixed(2)
    );

  const profit =
    Number(
      (
        totalAmount -
        cleanProviderCost
      ).toFixed(2)
    );

  return {
    providerCost:
      cleanProviderCost,

    serviceFee,

    totalAmount,

    profit,

    serviceFeePercent:
      cleanServiceFeePercent,
  };
}

