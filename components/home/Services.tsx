import Link from "next/link";
import {
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
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
];

export default function Services() {
  return (
    <section
      id="services"
      className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        {/* SECTION HEADER */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Our Services
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Everything you need in one secure VTU platform.
          </p>
        </div>

        {/* SERVICES */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <Link
                key={service.title}
                href={service.href}
                className="group block rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {/* ICON */}
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 transition-colors duration-300 group-hover:bg-indigo-600">
                  <Icon className="h-7 w-7 text-indigo-600 transition-colors duration-300 group-hover:text-white" />
                </div>

                {/* TITLE */}
                <h3 className="mb-2 text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-indigo-600">
                  {service.title}
                </h3>

                {/* DESCRIPTION */}
                <p className="text-gray-600">
                  {service.description}
                </p>

                {/* LINK TEXT */}
                <div className="mt-5 text-sm font-semibold text-indigo-600">
                  Get Started{" "}
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
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