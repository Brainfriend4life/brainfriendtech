import { prisma } from "@/lib/prisma";

const DEFAULT_SERVICE_FEE_PERCENTAGE = 5;
const SERVICE_FEE_SETTING_KEY = "SERVICE_FEE_PERCENT";

export async function getServiceFeePercentage(): Promise<number> {
  try {
    const setting =
      await prisma.systemSetting.findUnique({
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
    console.error(
      "SERVICE FEE SETTINGS ERROR:",
      error
    );

    return DEFAULT_SERVICE_FEE_PERCENTAGE;
  }
}

export function calculateServiceFee(
  amount: number,
  percentage: number
): number {
  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return 0;
  }

  if (
    !Number.isFinite(percentage) ||
    percentage < 0
  ) {
    return 0;
  }

  return Number(
    (
      amount *
      (percentage / 100)
    ).toFixed(2)
  );
}

export async function calculateServiceFeeWithSettings(
  amount: number
) {
  const percentage =
    await getServiceFeePercentage();

  const serviceFee =
    calculateServiceFee(
      amount,
      percentage
    );

  const total = Number(
    (amount + serviceFee).toFixed(2)
  );

  return {
    baseAmount: amount,
    serviceFee,
    serviceFeePercentage:
      percentage,
    total,
  };
}