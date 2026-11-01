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

export function getAgeVerifyPriceKey(service: string, payload: any): string {
  const tier = String(
    payload?.slip_type ?? payload?.slipType ?? "regular",
  ).toLowerCase();

  if (service === "nin") {
    return `nin-${tier}`;
  }

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
  const costVariable = COST_ENV[priceKey];

  if (!priceVariable || !costVariable) {
    throw new Error(
      `AgeVerify pricing configuration is missing for ${priceKey}.`,
    );
  }

  const sellingPrice = Number(process.env[priceVariable]);
  const providerCost = Number(process.env[costVariable]);

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    throw new Error(`Invalid selling price: ${priceVariable}`);
  }

  if (!Number.isFinite(providerCost) || providerCost < 0) {
    throw new Error(`Invalid provider cost: ${costVariable}`);
  }

  if (providerCost > sellingPrice) {
    throw new Error(`Provider cost exceeds selling price for ${priceKey}.`);
  }

  const grossProfit = Number((sellingPrice - providerCost).toFixed(2));

  const percentage = hasReferrer
    ? Math.max(0, Math.min(100, referralPercentage))
    : 0;

  const referralCommission = Number(
    ((grossProfit * percentage) / 100).toFixed(2),
  );

  const profit = Number((grossProfit - referralCommission).toFixed(2));

  return {
    priceKey,
    sellingPrice,
    providerCost,
    grossProfit,
    referralPercentage: percentage,
    referralCommission,
    profit,
  };
}
