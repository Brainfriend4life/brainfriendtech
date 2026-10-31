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
    cardBg: "bg-blue-50/80 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-900/50",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Data",
    icon: Wifi,
    href: "/dashboard/data",
    cardBg: "bg-cyan-50/80 dark:bg-cyan-950/20",
    border: "border-cyan-200 dark:border-cyan-900/50",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
  {
    title: "Electricity",
    icon: Zap,
    href: "/dashboard/electricity",
    cardBg: "bg-amber-50/80 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "Cable TV",
    icon: Tv,
    href: "/dashboard/cable",
    cardBg: "bg-purple-50/80 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-900/50",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    title: "Exam Pins",
    icon: GraduationCap,
    href: "/dashboard/exams",
    cardBg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-900/50",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "NIN Verification",
    icon: CreditCard,
    href: "/dashboard/nin",
    cardBg: "bg-rose-50/80 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-900/50",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    title: "Refer & Earn",
    icon: Users,
    href: "/dashboard/referral",
    cardBg: "bg-indigo-50/80 dark:bg-indigo-950/20",
    border: "border-indigo-200 dark:border-indigo-900/50",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
] as const;

export default function QuickActions() {
  return (
    <section className="w-full space-y-4">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
          Quick access
        </p>

        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Our Services
        </h2>
      </div>

      <div className="grid w-full grid-cols-3 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className={`
                group relative flex min-w-0 min-h-[125px]
                flex-col items-center justify-center
                overflow-hidden rounded-2xl border
                ${action.border}
                ${action.cardBg}
                p-3 text-center
                shadow-sm transition-all duration-200
                hover:-translate-y-0.5 hover:shadow-md
                active:scale-[0.97]
                sm:min-h-[140px] sm:p-4
              `}
            >
              <span
                className={`
                  flex h-10 w-10 shrink-0 items-center justify-center
                  rounded-xl ${action.iconBg}
                  transition-transform duration-200
                  group-hover:scale-105
                  sm:h-11 sm:w-11
                `}
              >
                <Icon
                  className={action.iconColor}
                  size={21}
                  strokeWidth={2}
                />
              </span>

              <h3 className="mt-3 w-full break-words text-[11px] font-bold leading-4 text-foreground sm:text-sm">
                {action.title}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
