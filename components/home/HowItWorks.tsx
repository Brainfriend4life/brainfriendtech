import { UserPlus, Wallet, ShoppingCart, CheckCircle } from "lucide-react";

const steps = [
  {
    title: "Create an Account",
    description: "Sign up in less than a minute using your email and password.",
    icon: UserPlus,
  },
  {
    title: "Fund Your Wallet",
    description: "Add money securely using Paystack or bank transfer.",
    icon: Wallet,
  },
  {
    title: "Choose a Service",
    description: "Buy airtime, data, electricity, cable TV, WAEC, NECO, and more.",
    icon: ShoppingCart,
  },
  {
    title: "Instant Delivery",
    description: "Receive your purchase immediately with real-time confirmation.",
    icon: CheckCircle,
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <p className="font-semibold uppercase tracking-wide text-indigo-600">
            How It Works
          </p>

          <h2 className="mt-2 text-4xl font-bold text-gray-900">
            Start in Four Simple Steps
          </h2>

          <p className="mt-4 text-gray-600">
            Getting started is easy. Follow these simple steps and enjoy our
            fast and secure VTU services.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="rounded-2xl bg-white p-8 shadow-md transition hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                  <Icon className="h-8 w-8 text-indigo-600" />
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-bold text-white">
                    {index + 1}
                  </span>

                  <h3 className="text-lg font-bold">
                    {step.title}
                  </h3>
                </div>

                <p className="text-gray-600">
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