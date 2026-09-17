import Link from "next/link";

import {
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  CreditCard,
  Users,
  ArrowUpRight,
} from "lucide-react";

const actions = [
  {
    title: "Airtime",
    description: "Buy airtime instantly",
    icon: Smartphone,
    href: "/dashboard/airtime",
    cardBg: "bg-blue-50/80 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
  },
  {
    title: "Data",
    description: "Affordable data bundles",
    icon: Wifi,
    href: "/dashboard/data",
    cardBg: "bg-cyan-50/80 dark:bg-cyan-950/20",
    border: "border-cyan-100 dark:border-cyan-900/40",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    accent: "bg-cyan-500",
  },
  {
    title: "Electricity",
    description: "Pay electricity bills",
    icon: Zap,
    href: "/dashboard/electricity",
    cardBg: "bg-amber-50/80 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500",
  },
  {
    title: "Cable TV",
    description: "Renew your subscription",
    icon: Tv,
    href: "/dashboard/cable",
    cardBg: "bg-purple-50/80 dark:bg-purple-950/20",
    border: "border-purple-100 dark:border-purple-900/40",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    accent: "bg-purple-500",
  },
  {
    title: "Exam Pins",
    description: "Get exam PINs easily",
    icon: GraduationCap,
    href: "/dashboard/exams",
    cardBg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },
  {
    title: "NIN Verification",
    description: "Verify your NIN securely",
    icon: CreditCard,
    href: "/dashboard/nin",
    cardBg: "bg-rose-50/80 dark:bg-rose-950/20",
    border: "border-rose-100 dark:border-rose-900/40",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    accent: "bg-rose-500",
  },
  {
    title: "Refer & Earn",
    description: "Earn from referrals",
    icon: Users,
    href: "/dashboard/referral",
    cardBg: "bg-indigo-50/80 dark:bg-indigo-950/20",
    border: "border-indigo-100 dark:border-indigo-900/40",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accent: "bg-indigo-500",
  },
] as const;

export default function QuickActions() {
  return (
    <section className="w-full">
      {/* HEADER */}
      <div className="mb-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
          Quick access
        </p>

        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Our Services
        </h2>

        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Everything you need, all in one place.
        </p>
      </div>

      {/* SERVICES */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className={`
                group relative overflow-hidden
                rounded-xl
                border
                ${action.border}
                ${action.cardBg}
                p-3.5
                shadow-[0_1px_2px_rgba(0,0,0,0.03)]
                transition-all duration-200
                hover:-translate-y-0.5
                hover:shadow-md
                active:scale-[0.98]
                sm:rounded-2xl
                sm:p-4
              `}
            >
              {/* DECORATIVE BACKGROUND */}
              <div
                className="
                  pointer-events-none
                  absolute -right-8 -top-8
                  h-20 w-20
                  rounded-full
                  bg-white/40
                  blur-2xl
                  dark:bg-white/5
                "
              />

              {/* ARROW */}
              <div
                className="
                  absolute right-2.5 top-2.5
                  flex h-6 w-6
                  items-center justify-center
                  rounded-full
                  bg-white/60
                  text-muted-foreground
                  opacity-0
                  shadow-sm
                  transition-all duration-200
                  group-hover:opacity-100
                  dark:bg-black/20
                  sm:right-3 sm:top-3
                "
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>

              {/* ICON */}
              <div
                className={`
                  relative
                  flex h-11 w-11
                  items-center justify-center
                  rounded-xl
                  ${action.iconBg}
                  transition-transform duration-200
                  group-hover:scale-105
                  sm:h-12 sm:w-12
                  sm:rounded-[14px]
                `}
              >
                <Icon
                  className={action.iconColor}
                  size={22}
                  strokeWidth={2.2}
                />
              </div>

              {/* TEXT */}
              <div className="relative mt-3">
                <h3 className="text-sm font-bold leading-tight text-card-foreground sm:text-[15px]">
                  {action.title}
                </h3>

                <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-muted-foreground sm:text-[11px]">
                  {action.description}
                </p>
              </div>

              {/* BOTTOM ACCENT */}
              <div
                className={`
                  absolute bottom-0 left-0
                  h-[2px] w-0
                  ${action.accent}
                  transition-all duration-300
                  group-hover:w-full
                `}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
