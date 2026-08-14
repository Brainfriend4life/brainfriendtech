import { prisma } from "@/lib/prisma";

export const SERVICE_FEE_SETTING_KEY =
  "SERVICE_FEE_PERCENT";

export const DEFAULT_SERVICE_FEE_PERCENT = 5;

export async function getServiceFeePercent(): Promise<number> {
  const setting =
    await prisma.systemSetting.findUnique({
      where: {
        key: SERVICE_FEE_SETTING_KEY,
      },
    });

  if (!setting) {
    return DEFAULT_SERVICE_FEE_PERCENT;
  }

  const value = Number(setting.value);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    return DEFAULT_SERVICE_FEE_PERCENT;
  }

  return value;
}

export function calculateServiceFee(
  providerCost: number,
  feePercent: number
) {
  const cost = Number(providerCost);
  const percent = Number(feePercent);

  if (
    !Number.isFinite(cost) ||
    cost < 0
  ) {
    throw new Error(
      "Invalid provider cost."
    );
  }

  if (
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100
  ) {
    throw new Error(
      "Invalid service fee percentage."
    );
  }

  const serviceFee =
    cost * (percent / 100);

  const totalAmount =
    cost + serviceFee;

  return {
    providerCost: Number(
      cost.toFixed(2)
    ),

    serviceFee: Number(
      serviceFee.toFixed(2)
    ),

    totalAmount: Number(
      totalAmount.toFixed(2)
    ),

    profit: Number(
      serviceFee.toFixed(2)
    ),
  };
}