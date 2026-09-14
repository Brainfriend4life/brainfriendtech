import { prisma } from "@/lib/prisma";

const DEFAULT_SERVICE_FEE_PERCENT = 5;

const SERVICE_FEE_KEYS = [
  "SERVICE_FEE_PERCENT",
  "DATA_SERVICE_FEE_PERCENTAGE",
  "SERVICE_FEE_PERCENTAGE",
  "SERVICE_FEE",
];

/**
 * Get the current service fee percentage from system settings.
 *
 * Falls back to 5% when:
 * - the setting does not exist
 * - the stored value is invalid
 * - the database query fails
 */
export async function getServiceFeePercent(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findFirst({
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
      const value = Number(setting.value);

      if (
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
      ) {
        return Number(value.toFixed(2));
      }
    }
  } catch (error) {
    console.error("SERVICE FEE SETTING ERROR:", error);
  }

  return DEFAULT_SERVICE_FEE_PERCENT;
}

/**
 * Calculate service fee, total amount and profit.
 *
 * Example:
 * providerCost = ₦1,000
 * serviceFeePercent = 5
 *
 * serviceFee = ₦50
 * totalAmount = ₦1,050
 * profit = ₦50
 */
export function calculateServiceFee(
  providerCost: number,
  serviceFeePercent: number
) {
  const cleanProviderCost =
    Number.isFinite(providerCost) && providerCost > 0
      ? Number(providerCost.toFixed(2))
      : 0;

  const cleanServiceFeePercent =
    Number.isFinite(serviceFeePercent) &&
    serviceFeePercent >= 0 &&
    serviceFeePercent <= 100
      ? Number(serviceFeePercent.toFixed(2))
      : 0;

  const serviceFee = Number(
    (
      cleanProviderCost *
      (cleanServiceFeePercent / 100)
    ).toFixed(2)
  );

  const totalAmount = Number(
    (
      cleanProviderCost +
      serviceFee
    ).toFixed(2)
  );

  const profit = Number(
    (
      totalAmount -
      cleanProviderCost
    ).toFixed(2)
  );

  return {
    providerCost: cleanProviderCost,
    serviceFee,
    totalAmount,
    profit,
    serviceFeePercent: cleanServiceFeePercent,
  };
}