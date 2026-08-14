
import {
  UserPlus,
  Wallet,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";

const steps = [
  {
    title: "Create Your Account",
    description:
      "Create your Brainfriend Global Tech account in less than a minute using your email and password.",
    icon: UserPlus,
  },
  {
    title: "Fund Your Wallet",
    description:
      "Add money securely to your wallet using Paystack or bank transfer and start using our VTU services.",
    icon: Wallet,
  },
  {
    title: "Choose a VTU Service",
    description:
      "Select the service you need, including airtime, data, electricity, cable TV, WAEC, NECO and other digital services.",
    icon: ShoppingCart,
  },
  {
    title: "Get Instant Delivery",
    description:
      "Complete your purchase and receive your airtime, data or other digital service quickly with real-time confirmation.",
    icon: CheckCircle,
  },
];

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="bg-slate-50 py-20"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}

        <div className="mb-14 text-center">
          <p className="font-semibold uppercase tracking-wide text-indigo-600">
            How Brainfriend Global Tech Works
          </p>

          <h2
            id="how-it-works-heading"
            className="mt-2 text-4xl font-bold text-gray-900"
          >
            Start Using Our VTU Services in Four Simple Steps
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Getting started is easy. Create an account, fund your
            wallet, choose a service and receive your purchase quickly
            and securely.
          </p>
        </div>

        {/* Steps */}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="rounded-2xl bg-white p-8 shadow-md transition hover:-translate-y-2 hover:shadow-xl"
              >
                {/* ICON */}

                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                  <Icon
                    aria-hidden="true"
                    className="h-8 w-8 text-indigo-600"
                  />
                </div>

                {/* STEP */}

                <div className="mb-4 flex items-center gap-2">
                  <span
                    aria-label={`Step ${index + 1}`}
                    className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-bold text-white"
                  >
                    {index + 1}
                  </span>

                  <h3 className="text-lg font-bold text-gray-900">
                    {step.title}
                  </h3>
                </div>

                {/* DESCRIPTION */}

                <p className="leading-6 text-gray-600">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

