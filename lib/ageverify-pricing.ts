export type AgeVerifyPricing = {
  priceKey: string;
  sellingPrice: number;
  providerCost: number;
  grossProfit: number;
  referralPercentage: number;
  referralCommission: number;
  profit: number;
};

const PRICE_ENV: Record<string, string> = {
  "nin-regular": "AGEVERIFY_NIN_REGULAR_SLIP_PRICE",
  "nin-standard": "AGEVERIFY_NIN_STANDARD_SLIP_PRICE",
  "nin-premium": "AGEVERIFY_NIN_PREMIUM_SLIP_PRICE",

  "nin-phone-regular": "AGEVERIFY_NIN_PHONE_REGULAR_PRICE",
  "nin-phone-standard": "AGEVERIFY_NIN_PHONE_STANDARD_PRICE",
  "nin-phone-premium": "AGEVERIFY_NIN_PHONE_PREMIUM_PRICE",

  "nin-demo": "AGEVERIFY_NIN_DEMO_PRICE",
  bvn: "AGEVERIFY_BVN_VERIFY_PRICE",
  "nin-validation": "AGEVERIFY_NIN_VALIDATION_PRICE",
  "nin-validation-v2": "AGEVERIFY_NIN_VALIDATION_V2_PRICE",
  personalization: "AGEVERIFY_PERSONALIZATION_PRICE",
  "ipe-clearance": "AGEVERIFY_IPE_CLEARANCE_PRICE",
  "bvn-crm": "AGEVERIFY_BVN_CRM_PRICE",
  "modification-ipe": "AGEVERIFY_MODIFICATION_IPE_PRICE",
  "bvn-retrieval": "AGEVERIFY_BVN_RETRIEVAL_PRICE",
  "ipe-special": "AGEVERIFY_IPE_SPECIAL_PRICE",
};

const COST_ENV: Record<string, string> = {
  "nin-regular": "AGEVERIFY_NIN_REGULAR_SLIP_COST",
  "nin-standard": "AGEVERIFY_NIN_STANDARD_SLIP_COST",
  "nin-premium": "AGEVERIFY_NIN_PREMIUM_SLIP_COST",

  "nin-phone-regular": "AGEVERIFY_NIN_PHONE_REGULAR_COST",
  "nin-phone-standard": "AGEVERIFY_NIN_PHONE_STANDARD_COST",
  "nin-phone-premium": "AGEVERIFY_NIN_PHONE_PREMIUM_COST",

  "nin-demo": "AGEVERIFY_NIN_DEMO_COST",
  bvn: "AGEVERIFY_BVN_VERIFY_COST",
  "nin-validation": "AGEVERIFY_NIN_VALIDATION_COST",
  "nin-validation-v2": "AGEVERIFY_NIN_VALIDATION_V2_COST",
  personalization: "AGEVERIFY_PERSONALIZATION_COST",
  "ipe-clearance": "AGEVERIFY_IPE_CLEARANCE_COST",
  "bvn-crm": "AGEVERIFY_BVN_CRM_COST",
  "modification-ipe": "AGEVERIFY_MODIFICATION_IPE_COST",
  "bvn-retrieval": "AGEVERIFY_BVN_RETRIEVAL_COST",
  "ipe-special": "AGEVERIFY_IPE_SPECIAL_COST",
};

/**
 * Default provider tariffs in naira.
 * Environment variables in COST_ENV override these values.
 */
const DEFAULT_PROVIDER_COST: Record<string, number> = {
  "nin-regular": 100,
  "nin-standard": 100,
  "nin-premium": 100,

  "nin-phone-regular": 100,
  "nin-phone-standard": 100,
  "nin-phone-premium": 100,

  "nin-demo": 100,
  bvn: 100,

  // Validation tariff supplied: ₦750 per call.
  "nin-validation": 750,
  "nin-validation-v2": 750,

  personalization: 170,
  "ipe-clearance": 350,
  "bvn-crm": 1000,
  "modification-ipe": 1500,
  "bvn-retrieval": 1100,

  // IPE blocked/hit/ready ABIS tariff supplied: ₦500.
  "ipe-special": 500,
};

function readProviderCost(priceKey: string): number {
  const costVariable = COST_ENV[priceKey];

  if (!costVariable) {
    throw new Error(`Provider cost configuration is missing for ${priceKey}.`);
  }

  const envValue = process.env[costVariable];

  const providerCost =
    envValue !== undefined && envValue.trim() !== ""
      ? Number(envValue)
      : DEFAULT_PROVIDER_COST[priceKey];

  if (
    providerCost === undefined ||
    !Number.isFinite(providerCost) ||
    providerCost < 0
  ) {
    throw new Error(`Invalid provider cost: ${costVariable}`);
  }

  return Number(providerCost.toFixed(2));
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function getAgeVerifyPriceKey(service: string, payload: any): string {
  const tier = String(
    payload?.slip_type ??
      payload?.slipType ??
      (service === "nin-phone" ? "standard" : "regular"),
  ).toLowerCase();

  // NIN slip tiers.
  if (service === "nin") {
    return `nin-${tier}`;
  }

  // BVN has its own price and cost configuration.
  if (service === "bvn") {
    return "bvn";
  }

  // NIN phone tiers.
  if (service === "nin-phone") {
    return `nin-phone-${tier}`;
  }

  return service;
}

export function getAgeVerifyPricing(
  service: string,
  payload: any,
  referralPercentage: number,
  hasReferrer: boolean,
): AgeVerifyPricing {
  const priceKey = getAgeVerifyPriceKey(service, payload);

  const priceVariable = PRICE_ENV[priceKey];

  if (!priceVariable) {
    throw new Error(
      `AgeVerify selling-price configuration is missing for ${priceKey}.`,
    );
  }

  const sellingPrice = Number(process.env[priceVariable]);

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    throw new Error(`Invalid selling price: ${priceVariable}`);
  }

  const providerCost = readProviderCost(priceKey);

  // A negative gross profit is permitted and recorded as a business loss.
  const grossProfit = roundMoney(sellingPrice - providerCost);

  const percentage = hasReferrer
    ? Math.max(0, Math.min(100, Number(referralPercentage) || 0))
    : 0;

  const referralCommission =
    grossProfit > 0 ? roundMoney((grossProfit * percentage) / 100) : 0;

  const profit = roundMoney(grossProfit - referralCommission);

  return {
    priceKey,
    sellingPrice: roundMoney(sellingPrice),
    providerCost,
    grossProfit,
    referralPercentage: percentage,
    referralCommission,
    profit,
  };
}

export function getAgeVerifyProviderCost(
  service: string,
  payload: any,
): number {
  const priceKey = getAgeVerifyPriceKey(service, payload);
  return readProviderCost(priceKey);
}
