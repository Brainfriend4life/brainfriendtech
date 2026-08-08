import {
  Users,
  CreditCard,
  ShieldCheck,
  Headphones,
} from "lucide-react";

const stats = [
  {
    title: "10,000+",
    subtitle: "Happy Customers",
    icon: Users,
  },
  {
    title: "500,000+",
    subtitle: "Successful Transactions",
    icon: CreditCard,
  },
  {
    title: "99.9%",
    subtitle: "Service Uptime",
    icon: ShieldCheck,
  },
  {
    title: "24/7",
    subtitle: "Customer Support",
    icon: Headphones,
  },
];

export default function Stats() {
  return (
    <section className="bg-indigo-600 py-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold">
            Trusted by Thousands
          </h2>

          <p className="mt-4 text-indigo-100">
            We provide reliable and secure VTU services across Nigeria.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.subtitle}
                className="rounded-2xl bg-white/10 p-8 text-center backdrop-blur transition hover:bg-white/20"
              >
                <div className="mb-5 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <Icon className="h-8 w-8" />
                  </div>
                </div>

                <h3 className="text-4xl font-bold">
                  {item.title}
                </h3>

                <p className="mt-3 text-indigo-100">
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}