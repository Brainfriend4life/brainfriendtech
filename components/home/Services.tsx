import Link from "next/link";

import {
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  BookOpen,
  Fingerprint,
  ArrowUpRight,
} from "lucide-react";

const services = [
  {
    title: "Airtime Recharge",
    description:
      "Buy airtime instantly for MTN, Airtel, Glo and 9mobile networks across Nigeria.",
    icon: Smartphone,
    href: "/dashboard/airtime",
    cardBg: "bg-blue-50/80 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
  },
  {
    title: "Data Bundles",
    description:
      "Buy affordable MTN, Airtel, Glo and 9mobile data bundles with fast and reliable delivery.",
    icon: Wifi,
    href: "/dashboard/data",
    cardBg: "bg-cyan-50/80 dark:bg-cyan-950/20",
    border: "border-cyan-100 dark:border-cyan-900/40",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    accent: "bg-cyan-500",
  },
  {
    title: "Electricity Bill Payment",
    description:
      "Pay electricity bills and receive your token quickly and securely from anywhere in Nigeria.",
    icon: Zap,
    href: "/dashboard/electricity",
    cardBg: "bg-amber-50/80 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500",
  },
  {
    title: "Cable TV Subscription",
    description:
      "Renew your DStv, GOtv and StarTimes subscriptions quickly and conveniently.",
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
    description:
      "Purchase WAEC, JAMB, NECO and other examination PINs securely and conveniently.",
    icon: GraduationCap,
    href: "/dashboard/exams",
    cardBg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },
  {
    title: "Online CBT Examination",
    description:
      "Practice and take CBT examinations online with instant results and performance feedback.",
    icon: BookOpen,
    href: "/dashboard/education/cbt",
    cardBg: "bg-orange-50/80 dark:bg-orange-950/20",
    border: "border-orange-100 dark:border-orange-900/40",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    iconColor: "text-orange-600 dark:text-orange-400",
    accent: "bg-orange-500",
  },
  {
    title: "NIN Verification",
    description:
      "Verify NIN details quickly and securely using our reliable NIN verification service.",
    icon: Fingerprint,
    href: "/dashboard/nin",
    cardBg: "bg-rose-50/80 dark:bg-rose-950/20",
    border: "border-rose-100 dark:border-rose-900/40",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    accent: "bg-rose-500",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="
        bg-gray-50
        px-4
        py-12
        text-gray-900
        transition-colors
        dark:bg-gray-950
        dark:text-gray-100
        sm:px-6
        sm:py-16
        lg:px-8
        lg:py-20
      "
    >
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="px-2 text-center sm:px-0">
          <p
            className="
            mb-2
            text-sm
            font-bold
            uppercase
            tracking-[0.16em]
            text-indigo-600
            dark:text-indigo-400
          "
          >
            VTU & Digital Services
          </p>

          <h2
            id="services-heading"
            className="
              text-2xl
              font-bold
              tracking-tight
              text-gray-900
              dark:text-white
              sm:text-3xl
              lg:text-4xl
            "
          >
            Our Services in Nigeria
          </h2>

          <p
            className="
            mx-auto
            mt-3
            max-w-2xl
            text-sm
            leading-6
            text-gray-600
            dark:text-gray-300
            sm:text-base
          "
          >
            Access airtime, data, electricity bill payments, cable TV,
            examination PINs, CBT examinations and NIN verification from one
            secure and reliable platform.
          </p>
        </div>

        {/* SERVICES */}

        <div
          className="
          mt-8
          grid
          grid-cols-1
          gap-3
          sm:mt-10
          sm:grid-cols-2
          sm:gap-4
          lg:grid-cols-3
          lg:gap-5
        "
        >
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <Link
                key={service.title}
                href={service.href}
                aria-label={`Get started with ${service.title}`}
                className={`
                  group
                  relative
                  overflow-hidden
                  rounded-xl
                  border
                  ${service.border}
                  ${service.cardBg}
                  p-4
                  shadow-[0_1px_2px_rgba(0,0,0,0.03)]
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:shadow-md
                  active:scale-[0.99]
                  sm:rounded-2xl
                  sm:p-5
                `}
              >
                {/* DECORATIVE BACKGROUND */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-10
                    -top-10
                    h-28
                    w-28
                    rounded-full
                    bg-white/40
                    blur-2xl
                    dark:bg-white/5
                  "
                />

                {/* ARROW */}

                <div
                  className="
                    absolute
                    right-3
                    top-3
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-full
                    bg-white/60
                    text-gray-500
                    opacity-0
                    shadow-sm
                    transition-all
                    duration-200
                    group-hover:opacity-100
                    dark:bg-black/20
                    dark:text-slate-400
                  "
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>

                {/* ICON */}

                <div
                  className={`
                    relative
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    ${service.iconBg}
                    transition-transform
                    duration-200
                    group-hover:scale-105
                    sm:h-14
                    sm:w-14
                    sm:rounded-[14px]
                  `}
                >
                  <Icon
                    aria-hidden="true"
                    className={service.iconColor}
                    size={24}
                    strokeWidth={2.2}
                  />
                </div>

                {/* TEXT */}

                <div className="relative mt-4">
                  <h3
                    className="
                    text-base
                    font-bold
                    leading-tight
                    text-gray-900
                    transition-colors
                    duration-200
                    group-hover:text-indigo-600
                    dark:text-white
                    dark:group-hover:text-indigo-400
                    sm:text-lg
                  "
                  >
                    {service.title}
                  </h3>

                  <p
                    className="
                    mt-1.5
                    text-xs
                    leading-5
                    text-gray-600
                    dark:text-slate-400
                    sm:text-sm
                    sm:leading-6
                  "
                  >
                    {service.description}
                  </p>
                </div>

                {/* GET STARTED */}

                <div
                  className="
                  relative
                  mt-4
                  flex
                  items-center
                  text-xs
                  font-bold
                  text-indigo-600
                  dark:text-indigo-400
                  sm:text-sm
                "
                >
                  Get Started
                  <span
                    aria-hidden="true"
                    className="
                      ml-1
                      transition-transform
                      duration-200
                      group-hover:translate-x-1
                    "
                  >
                    →
                  </span>
                </div>

                {/* BOTTOM ACCENT */}

                <div
                  className={`
                    absolute
                    bottom-0
                    left-0
                    h-[2px]
                    w-0
                    ${service.accent}
                    transition-all
                    duration-300
                    group-hover:w-full
                  `}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
