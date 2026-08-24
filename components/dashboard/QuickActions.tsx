import Link from "next/link";

import {
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  CreditCard,
  Users,
} from "lucide-react";

const actions = [
  {
    title: "Airtime",
    icon: Smartphone,
    href: "/dashboard/airtime",
  },

  {
    title: "Data",
    icon: Wifi,
    href: "/dashboard/data",
  },

  {
    title: "Electricity",
    icon: Zap,
    href: "/dashboard/electricity",
  },

  {
    title: "Cable TV",
    icon: Tv,
    href: "/dashboard/cable",
  },

  {
    title: "Exam Pins",
    icon: GraduationCap,
    href: "/dashboard/exams",
  },

  {
    title: "NIN Verification",
    icon: CreditCard,
    href: "/dashboard/nin",
  },

  {
    title: "Refer & Earn",
    icon: Users,
    href: "/dashboard/referral",
  },
];

export default function QuickActions() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            key={action.title}
            href={action.href}
            className="rounded-xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
          >
            <Icon
              className="mb-4 text-indigo-600"
              size={32}
            />

            <h3 className="font-semibold">
              {action.title}
            </h3>
          </Link>
        );
      })}
    </div>
  );
}