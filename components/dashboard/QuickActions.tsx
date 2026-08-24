
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            key={action.title}
            href={action.href}
            className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">
              <Icon
                className="text-indigo-600"
                size={25}
                strokeWidth={2}
              />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                {action.title}
              </h3>

              <p className="mt-1 text-xs text-gray-400">
                Quick access
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

