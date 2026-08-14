
import { prisma } from "@/lib/prisma";

const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;
const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";

export async function getServiceFeePercent(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: SERVICE_FEE_SETTING_KEY,
      },
    });

    if (!setting) {
      return DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    const value = Number(setting.value);

    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 100
    ) {
      return DEFAULT_SERVICE_FEE_PERCENTAGE;
    }

    return value;
  } catch (error) {
    console.error("SERVICE FEE ERROR:", error);

    return DEFAULT_SERVICE_FEE_PERCENTAGE;
  }
}

export function calculateServiceFee(
  amount: number,
  percentage: number
): {
  providerCost: number;
  serviceFee: number;
  totalAmount: number;
  profit: number;
} {
  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return {
      providerCost: 0,
      serviceFee: 0,
      totalAmount: 0,
      profit: 0,
    };
  }

  if (
    !Number.isFinite(percentage) ||
    percentage < 0
  ) {
    return {
      providerCost: Number(amount.toFixed(2)),
      serviceFee: 0,
      totalAmount: Number(amount.toFixed(2)),
      profit: 0,
    };
  }

  const providerCost = Number(
    amount.toFixed(2)
  );

  const serviceFee = Number(
    (
      providerCost *
      (percentage / 100)
    ).toFixed(2)
  );

  const totalAmount = Number(
    (
      providerCost +
      serviceFee
    ).toFixed(2)
  );

  const profit = Number(
    (
      totalAmount -
      providerCost
    ).toFixed(2)
  );

  return {
    providerCost,
    serviceFee,
    totalAmount,
    profit,
  };
}

export async function calculateServiceFeeWithSettings(
  amount: number
) {
  const percentage =
    await getServiceFeePercent();

  const pricing =
    calculateServiceFee(
      amount,
      percentage
    );

  return {
    baseAmount:
      pricing.providerCost,

    serviceFee:
      pricing.serviceFee,

    serviceFeePercentage:
      percentage,

    total:
      pricing.totalAmount,

    providerCost:
      pricing.providerCost,

    profit:
      pricing.profit,
  };
}

