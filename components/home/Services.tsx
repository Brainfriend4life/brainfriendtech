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
    title: "Airtime",
    description:
      "Buy airtime instantly for all Nigerian networks.",
    icon: Smartphone,
    href: "/dashboard/airtime",
  },
  {
    title: "Data",
    description:
      "Affordable data bundles delivered immediately.",
    icon: Wifi,
    href: "/dashboard/data",
  },
  {
    title: "Electricity",
    description:
      "Pay electricity bills and receive tokens instantly.",
    icon: Zap,
    href: "/dashboard/electricity",
  },
  {
    title: "Cable TV",
    description:
      "Renew DSTV, GOtv and Startimes subscriptions.",
    icon: Tv,
    href: "/dashboard/cable",
  },
  {
    title: "Exam Pins",
    description:
      "Purchase WAEC, JAMB, NECO and other exam PINs.",
    icon: GraduationCap,
    href: "/dashboard/exams",
  },
  {
    title: "CBT Examination",
    description:
      "Practice and take CBT examinations online with instant results.",
    icon: BookOpen,
    href: "/dashboard/education/cbt",
  },
  {
    title: "NIN Verification",
    description:
      "Verify NIN details quickly and securely using our verification service.",
    icon: Fingerprint,
    href: "/dashboard/nin",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-7xl">
        {/* SECTION HEADER */}

        <div className="px-2 text-center sm:px-0">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-indigo-600">
            What We Offer
          </p>

          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            Our Services
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            Everything you need in one secure and reliable VTU platform.
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
                className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-2 hover:border-indigo-100 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:p-6"
              >
                {/* ICON */}

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 transition-all duration-300 group-hover:bg-indigo-600 group-hover:shadow-lg sm:h-14 sm:w-14">
                  <Icon className="h-6 w-6 text-indigo-600 transition-colors duration-300 group-hover:text-white sm:h-7 sm:w-7" />
                </div>

                {/* TITLE */}

                <h3 className="mb-2 text-lg font-bold text-gray-900 transition-colors duration-300 group-hover:text-indigo-600 sm:text-xl">
                  {service.title}
                </h3>

                {/* DESCRIPTION */}

                <p className="text-sm leading-6 text-gray-600 sm:text-base">
                  {service.description}
                </p>

                {/* LINK */}

                <div className="mt-5 flex items-center text-sm font-bold text-indigo-600">
                  Get Started
                  <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1">
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