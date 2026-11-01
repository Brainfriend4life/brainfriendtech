export type AgeVerifyServiceConfig = {
  title: string;
  endpoint: string;
  manual: boolean;
};

export const AGEVERIFY_SERVICES = {
  nin: {
    title: "NIN Verification",
    endpoint: "api/v1/verify.php",
    manual: false,
  },
  // verify.php returns a PDF slip. nin_phone_verify.php returns raw identity
  // data only (no PDF), which the pages do not display.
  "nin-phone": {
    title: "NIN Phone Search",
    endpoint: "api/v1/verify.php",
    manual: false,
  },
  "nin-demo": {
    title: "NIN Demographic Search",
    endpoint: "api/v1/verify.php",
    manual: false,
  },
  bvn: {
    title: "BVN Verification",
    endpoint: "api/v1/verify.php",
    manual: false,
  },
  "nin-validation": {
    title: "NIN Validation",
    endpoint: "api/v1/nin_validation.php",
    manual: true,
  },
  "nin-validation-v2": {
    title: "NIN Validation V2 (Batch)",
    endpoint: "api/v1/nin_validation_v2.php",
    manual: true,
  },
  personalization: {
    title: "NIN Personalization",
    endpoint: "api/v1/personalization.php",
    manual: true,
  },
  "ipe-clearance": {
    title: "IPE Clearance",
    endpoint: "api/v1/ipe_clearance.php",
    manual: true,
  },
  "bvn-crm": {
    title: "BVN CRM",
    endpoint: "api/v1/bvn_crm.php",
    manual: true,
  },
  "modification-ipe": {
    title: "Modification IPE",
    endpoint: "api/v1/modification_ipe.php",
    manual: true,
  },
  "bvn-retrieval": {
    title: "BVN Retrieval",
    endpoint: "api/v1/bvn_retrieval.php",
    manual: true,
  },
  "ipe-special": {
    title: "IPE Special",
    endpoint: "api/v1/ipe_special.php",
    manual: true,
  },
} as const satisfies Record<string, AgeVerifyServiceConfig>;

export type AgeVerifyServiceSlug = keyof typeof AGEVERIFY_SERVICES;

export function getAgeVerifyService(slug: string) {
  if (!Object.prototype.hasOwnProperty.call(AGEVERIFY_SERVICES, slug)) {
    return null;
  }

  return AGEVERIFY_SERVICES[slug as AgeVerifyServiceSlug];
}
