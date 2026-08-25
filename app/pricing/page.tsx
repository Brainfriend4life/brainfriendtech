
import Link from "next/link";
import {
  Smartphone,
  Wifi,
  Zap,
  Tv,
  CreditCard,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const services = [
  {
    title: "Airtime",
    description:
      "Recharge MTN, Airtel, Glo and 9mobile lines quickly and conveniently.",
    icon: Smartphone,
    features: [
      "All major networks",
      "Fast processing",
      "Instant transaction status",
    ],
    href: "/dashboard/airtime",
  },
  {
    title: "Data Bundles",
    description:
      "Purchase affordable data bundles for your preferred network.",
    icon: Wifi,
    features: [
      "MTN, Airtel, Glo & 9mobile",
      "Multiple data plans",
      "Fast delivery",
    ],
    href: "/dashboard/data",
  },
  {
    title: "Electricity",
    description:
      "Pay electricity bills and purchase electricity tokens from your account.",
    icon: Zap,
    features: [
      "Convenient bill payment",
      "Fast processing",
      "Transaction confirmation",
    ],
    href: "/dashboard/electricity",
  },
  {
    title: "Cable TV",
    description:
      "Renew your DSTV, GOtv and Startimes subscriptions with ease.",
    icon: Tv,
    features: [
      "DSTV",
      "GOtv",
      "Startimes",
    ],
    href: "/dashboard/cable",
  },
  {
    title: "NIN Verification",
    description:
      "Access NIN verification and related verification services through your account.",
    icon: CreditCard,
    features: [
      "Easy request process",
      "Secure handling",
      "Transaction tracking",
    ],
    href: "/dashboard/nin",
  },
  {
    title: "Exam Services",
    description:
      "Access examination-related services including WAEC, NECO, JAMB and CBT services.",
    icon: GraduationCap,
    features: [
      "WAEC services",
      "NECO services",
      "JAMB & CBT services",
    ],
    href: "/dashboard/exams",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* HERO */}
      <section className="bg-indigo-700 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-200">
            Simple & Transparent
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
            Our Services & Pricing
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-indigo-100 sm:text-base">
            Access essential digital and VTU services from one convenient
            platform. Prices may vary depending on the selected service,
            provider and current network or service charges.
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Available Services
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Choose the service you need. The exact price is displayed before
              you complete your transaction.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.title}
                  className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                >
                  {/* ICON */}
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                    <Icon className="h-7 w-7" />
                  </div>

                  {/* TITLE */}
                  <h3 className="mt-5 text-xl font-bold text-gray-900">
                    {service.title}
                  </h3>

                  {/* DESCRIPTION */}
                  <p className="mt-2 min-h-[72px] text-sm leading-6 text-gray-600">
                    {service.description}
                  </p>

                  {/* FEATURES */}
                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
                    {service.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* BUTTON */}
                  <Link
                    href={service.href}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Use Service
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW PRICING WORKS */}
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              How Our Pricing Works
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              We keep our pricing straightforward so you know what you are
              paying for before confirming a transaction.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
                1
              </div>

              <h3 className="mt-4 font-bold text-gray-900">
                Select a Service
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Choose the service you want from your Brainfriend Global Tech
                dashboard.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
                2
              </div>

              <h3 className="mt-4 font-bold text-gray-900">
                Select Your Plan
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Select your network, plan or service option and review the
                displayed price.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
                3
              </div>

              <h3 className="mt-4 font-bold text-gray-900">
                Confirm & Pay
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Confirm your details and complete the transaction from your
                wallet balance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NOTICE */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-indigo-100 bg-indigo-50 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
            Important Pricing Information
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-700">
            Service prices are subject to change based on provider pricing,
            network availability, government or regulatory charges and other
            applicable service costs. Always review the final amount shown on
            the transaction page before confirming your purchase.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-indigo-700 px-6 py-10 text-center text-white shadow-lg sm:px-10 sm:py-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to Get Started?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
            Create your Brainfriend Global Tech account and access our digital
            services from one convenient platform.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 transition hover:bg-gray-100 sm:w-auto"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/contact"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

