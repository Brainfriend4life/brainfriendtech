import type { LucideIcon } from "lucide-react";

export type ServiceIcon =
  | "id"
  | "check"
  | "finger"
  | "edit"
  | "globe"
  | "list"
  | "validation"
  | "shield";

export type Svc = {
  slug: string;
  title: string;
  desc: string;
  label: string;
  icon: ServiceIcon;
  href: string;
  price?: number;
  manual?: boolean;
};

export const SERVICES: Svc[] = [
  {
    slug: "nin",
    title: "NIN Verification",
    desc: "Verify a NIN and retrieve available identity information.",
    label: "NIN",
    icon: "id",
    href: "/dashboard/nin/ageverify",
  },
  {
    slug: "nin-phone",
    title: "NIN Phone Search",
    desc: "Search for NIN information using a registered phone number.",
    label: "Phone number",
    icon: "finger",
    href: "/dashboard/nin/ageverify/phone-search",
  },
  {
    slug: "nin-demo",
    title: "NIN Demographic Search",
    desc: "Search using demographic details.",
    label: "Personal information",
    icon: "check",
    href: "/dashboard/nin/ageverify/demographic",
  },
  {
    slug: "bvn",
    title: "BVN Verification",
    desc: "Verify a Bank Verification Number and retrieve available details.",
    label: "BVN",
    icon: "shield",
    href: "/dashboard/bvn/ageverify",
  },
  {
    slug: "nin-validation",
    title: "NIN Validation",
    desc: "Submit a NIN validation request.",
    label: "NIN",
    icon: "validation",
    href: "/dashboard/nin/ageverify/validation",
    manual: true,
  },
  {
    slug: "nin-validation-v2",
    title: "NIN Validation V2 (Batch)",
    desc: "Submit and track batch NIN validation requests.",
    label: "Batch NIN",
    icon: "list",
    href: "/dashboard/nin/ageverify/validation-v2",
    manual: true,
  },
  {
    slug: "personalization",
    title: "NIN Personalization",
    desc: "Submit and track NIN personalization requests.",
    label: "NIN",
    icon: "edit",
    href: "/dashboard/nin/ageverify/personalization",
    manual: true,
  },
  {
    slug: "ipe-clearance",
    title: "IPE Clearance",
    desc: "Submit IPE clearance requests.",
    label: "Identifier",
    icon: "globe",
    href: "/dashboard/nin/ageverify/ipe-clearance",
    manual: true,
  },
  {
    slug: "bvn-crm",
    title: "BVN CRM",
    desc: "Submit BVN CRM requests with the required enrollment evidence.",
    label: "BVN",
    icon: "shield",
    href: "/dashboard/bvn/ageverify/crm",
    manual: true,
  },
  {
    slug: "modification-ipe",
    title: "Modification IPE",
    desc: "Submit and track IPE modification requests.",
    label: "Modification",
    icon: "edit",
    href: "/dashboard/nin/ageverify/modification-ipe",
    manual: true,
  },
  {
    slug: "bvn-retrieval",
    title: "BVN Retrieval",
    desc: "Submit BVN retrieval requests using the required details.",
    label: "BVN",
    icon: "finger",
    href: "/dashboard/bvn/ageverify/retrieval",
    manual: true,
  },
  {
    slug: "ipe-special",
    title: "IPE Special",
    desc: "Submit special IPE requests and track their status.",
    label: "IPE",
    icon: "globe",
    href: "/dashboard/nin/ageverify/ipe-special",
    manual: true,
  },
  {
    slug: "verification-history",
    title: "Verification History",
    desc: "View previous AgeVerify requests and their statuses.",
    label: "History",
    icon: "list",
    href: "/dashboard/verification/ageverify/history",
  },
];

