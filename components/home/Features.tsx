
import {
  BadgeCheck,
  Clock3,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const features = [
  {
    title: "Instant Service Delivery",
    description:
      "Get airtime, data bundles, electricity tokens and other digital services delivered quickly and reliably.",
    icon: Clock3,
  },
  {
    title: "Secure Payments",
    description:
      "Your wallet, account information and transactions are protected with modern security practices.",
    icon: ShieldCheck,
  },
  {
    title: "Affordable VTU Prices",
    description:
      "Enjoy competitive prices on data bundles, airtime, electricity and other digital services in Nigeria.",
    icon: WalletCards,
  },
  {
    title: "Reliable VTU Service",
    description:
      "A simple and dependable platform designed to make everyday digital payments and services easier.",
    icon: BadgeCheck,
  },
];

export default function Features() {
  return (
    <section
      aria-labelledby="features-heading"
      className="bg-white py-20"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}

        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 font-semibold text-indigo-600">
            WHY CHOOSE BRAINFRIEND GLOBAL TECH
          </p>

          <h2
            id="features-heading"
            className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl"
          >
            Fast, Secure and Reliable VTU Services
          </h2>

          <p className="mt-4 text-gray-600">
            We make everyday digital payments and VTU services
            simple, fast, secure and convenient for users across
            Nigeria.
          </p>
        </div>

        {/* Feature Cards */}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 transition group-hover:bg-indigo-600">
                  <Icon
                    aria-hidden="true"
                    className="h-6 w-6 text-indigo-600 transition group-hover:text-white"
                  />
                </div>

                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {feature.title}
                </h3>

                <p className="text-sm leading-6 text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

