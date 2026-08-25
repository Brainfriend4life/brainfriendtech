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
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Our Services
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Quick access to our most popular services
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className="group relative flex min-h-[145px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-3 py-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg active:scale-[0.98]"
            >
              {/* ICON */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 transition-all duration-200 group-hover:scale-105 group-hover:bg-indigo-500/20">
                <Icon
                  className="text-indigo-500"
                  size={27}
                  strokeWidth={2}
                />
              </div>

              {/* TITLE */}
              <h3 className="mt-4 text-sm font-bold leading-tight text-card-foreground sm:text-base">
                {action.title}
              </h3>

              {/* QUICK ACCESS */}
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                Quick access
              </p>

              {/* HOVER INDICATOR */}
              <div className="absolute bottom-0 left-1/2 h-1 w-0 -translate-x-1/2 rounded-full bg-indigo-500 transition-all duration-200 group-hover:w-10" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}