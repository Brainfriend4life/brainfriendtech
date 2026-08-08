import {
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  BookOpen,
} from "lucide-react";

const services = [
  {
    title: "Airtime",
    description: "Buy airtime instantly for all Nigerian networks.",
    icon: Smartphone,
  },
  {
    title: "Data",
    description: "Affordable data bundles delivered immediately.",
    icon: Wifi,
  },
  {
    title: "Electricity",
    description: "Pay electricity bills and receive tokens instantly.",
    icon: Zap,
  },
  {
    title: "Cable TV",
    description: "Renew DSTV, GOtv and Startimes subscriptions.",
    icon: Tv,
  },
  {
    title: "WAEC PIN",
    description: "Purchase WAEC result checker and registration PINs.",
    icon: GraduationCap,
  },
  {
    title: "NECO PIN",
    description: "Buy NECO tokens quickly and securely.",
    icon: BookOpen,
  },
];

export default function Services() {
  return (
    <section id="services" className="scroll-mt-20 bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold">Our Services</h2>
          <p className="mt-4 text-gray-600">
            Everything you need in one secure VTU platform.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.title}
                className="rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100">
                  <Icon className="h-7 w-7 text-indigo-600" />
                </div>

                <h3 className="mb-2 text-xl font-semibold">
                  {service.title}
                </h3>

                <p className="text-gray-600">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}