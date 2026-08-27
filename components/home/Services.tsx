import Link from "next/link";
import {
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  BookOpen,
  Fingerprint,
} from "lucide-react";

const services = [
  {
    title: "Airtime Recharge",
    description:
      "Buy airtime instantly for MTN, Airtel, Glo and 9mobile networks across Nigeria.",
    icon: Smartphone,
    href: "/dashboard/airtime",
  },
  {
    title: "Data Bundles",
    description:
      "Buy affordable MTN, Airtel, Glo and 9mobile data bundles with fast and reliable delivery.",
    icon: Wifi,
    href: "/dashboard/data",
  },
  {
    title: "Electricity Bill Payment",
    description:
      "Pay electricity bills and receive your token quickly and securely from anywhere in Nigeria.",
    icon: Zap,
    href: "/dashboard/electricity",
  },
  {
    title: "Cable TV Subscription",
    description:
      "Renew your DStv, GOtv and StarTimes subscriptions quickly and conveniently.",
    icon: Tv,
    href: "/dashboard/cable",
  },
  {
    title: "WAEC, JAMB & NECO Exam Pins",
    description:
      "Purchase WAEC, JAMB, NECO and other examination PINs securely and conveniently.",
    icon: GraduationCap,
    href: "/dashboard/exams",
  },
  {
    title: "Online CBT Examination",
    description:
      "Practice and take CBT examinations online with instant results and performance feedback.",
    icon: BookOpen,
    href: "/dashboard/education/cbt",
  },
  {
    title: "NIN Verification",
    description:
      "Verify NIN details quickly and securely using our reliable NIN verification service.",
    icon: Fingerprint,
    href: "/dashboard/nin",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="
        bg-white
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
        {/* SECTION HEADER */}

        <div className="px-2 text-center sm:px-0">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            VTU & Digital Services
          </p>

          <h2
            id="services-heading"
            className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl lg:text-4xl"
          >
            Our Services in Nigeria
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
            Access airtime, data, electricity bill payments, cable TV,
            examination PINs, CBT examinations and NIN verification from
            one secure and reliable platform.
          </p>
        </div>

        {/* SERVICES */}

        <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <Link
                key={service.title}
                href={service.href}
                aria-label={`Get started with ${service.title}`}
                className="
                  group
                  block
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  p-5
                  shadow-md
                  transition-all
                  duration-300
                  hover:-translate-y-2
                  hover:border-indigo-200
                  hover:shadow-xl
                  focus:outline-none
                  focus:ring-2
                  focus:ring-indigo-500
                  focus:ring-offset-2
                  focus:ring-offset-white
                  dark:border-gray-800
                  dark:bg-gray-900
                  dark:shadow-black/20
                  dark:hover:border-indigo-800
                  dark:hover:shadow-2xl
                  dark:focus:ring-offset-gray-950
                  sm:p-6
                "
              >
                {/* ICON */}

                <div
                  className="
                    mb-5
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-indigo-50
                    transition-all
                    duration-300
                    group-hover:bg-indigo-600
                    group-hover:shadow-lg
                    dark:bg-indigo-950
                    dark:group-hover:bg-indigo-500
                    sm:h-14
                    sm:w-14
                  "
                >
                  <Icon
                    aria-hidden="true"
                    className="
                      h-6
                      w-6
                      text-indigo-600
                      transition-colors
                      duration-300
                      group-hover:text-white
                      dark:text-indigo-400
                      dark:group-hover:text-white
                      sm:h-7
                      sm:w-7
                    "
                  />
                </div>

                {/* TITLE */}

                <h3
                  className="
                    mb-2
                    text-lg
                    font-bold
                    text-gray-900
                    transition-colors
                    duration-300
                    group-hover:text-indigo-600
                    dark:text-white
                    dark:group-hover:text-indigo-400
                    sm:text-xl
                  "
                >
                  {service.title}
                </h3>

                {/* DESCRIPTION */}

                <p
                  className="
                    text-sm
                    leading-6
                    text-gray-600
                    dark:text-gray-300
                    sm:text-base
                  "
                >
                  {service.description}
                </p>

                {/* LINK */}

                <div
                  className="
                    mt-5
                    flex
                    items-center
                    text-sm
                    font-bold
                    text-indigo-600
                    dark:text-indigo-400
                  "
                >
                  Get Started

                  <span
                    aria-hidden="true"
                    className="
                      ml-1
                      inline-block
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                    "
                  >
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}