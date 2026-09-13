import Link from "next/link";

const services = [
  {
    title: "NIN Verification",
    description:
      "Verify your NIN quickly and securely for personal, business and documentation needs.",
    icon: "🪪",
    badge: "Identity",
    href: "/dashboard",
  },
  {
    title: "Airtime",
    description:
      "Recharge your mobile line instantly across supported Nigerian networks.",
    icon: "📱",
    badge: "VTU",
    href: "/dashboard",
  },
  {
    title: "Data Bundles",
    description:
      "Buy affordable data bundles for your preferred Nigerian network with fast delivery.",
    icon: "📶",
    badge: "VTU",
    href: "/dashboard",
  },
  {
    title: "Electricity Bills",
    description:
      "Purchase electricity tokens and pay your electricity bills conveniently online.",
    icon: "⚡",
    badge: "Bills",
    href: "/dashboard",
  },
  {
    title: "Cable TV",
    description:
      "Renew your DStv, GOtv and other supported cable TV subscriptions with ease.",
    icon: "📺",
    badge: "Subscriptions",
    href: "/dashboard",
  },
  {
    title: "Exam PINs",
    description:
      "Get WAEC, NECO, JAMB and other supported examination PINs conveniently.",
    icon: "🎓",
    badge: "Education",
    href: "/dashboard",
  },
  {
    title: "CBT Practice",
    description:
      "Prepare for examinations with convenient computer-based test practice resources.",
    icon: "💻",
    badge: "Education",
    href: "/dashboard",
  },
  {
    title: "Digital & IT Services",
    description:
      "Get support with graphics design, websites, digital solutions and other technology services.",
    icon: "🛠️",
    badge: "Technology",
    href: "/contact",
  },
];

const benefits = [
  {
    title: "Fast Delivery",
    description:
      "Get your digital services processed quickly without unnecessary delays.",
    icon: "⚡",
  },
  {
    title: "Simple & Convenient",
    description:
      "Access the services you need from your phone or computer, anytime.",
    icon: "✓",
  },
  {
    title: "Secure Platform",
    description:
      "We are committed to providing a reliable and secure experience for our customers.",
    icon: "🔒",
  },
  {
    title: "Customer Support",
    description:
      "Need help? Our support team is available to assist you when you need us.",
    icon: "💬",
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-5 sm:h-20 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400 sm:text-base"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
        <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/20" />

        <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/20" />

        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold text-blue-600 shadow-sm dark:border-blue-900/50 dark:bg-slate-900 dark:text-blue-400 sm:px-5 sm:text-sm">
              Our Services
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              Everything You Need,
              <span className="block text-blue-600 dark:text-blue-400">
                All in One Place.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:mt-6 sm:text-base sm:leading-8 lg:text-lg">
              From NIN verification and data subscriptions to electricity
              payments, cable TV and examination services, Brainfriend Global
              Tech makes everyday digital services simple and convenient.
            </p>

            <div className="mt-7 flex justify-center sm:mt-9">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 sm:px-7 sm:py-3.5"
              >
                Explore Services
                <span className="ml-2">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section className="bg-white py-16 dark:bg-slate-950 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 sm:text-sm">
              What We Offer
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl lg:text-4xl">
              Our digital services
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Choose a service below to access it from your Brainfriend
              dashboard.
            </p>
          </div>

          {/* Service Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 sm:p-6"
              >
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-100 opacity-0 blur-2xl transition group-hover:opacity-100 dark:bg-blue-900/30" />

                <div className="relative">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl transition group-hover:scale-105 group-hover:bg-blue-600 dark:bg-slate-800 sm:h-14 sm:w-14 sm:text-2xl">
                      {service.icon}
                    </div>

                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:px-3 sm:text-[11px]">
                      {service.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                    {service.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:min-h-[72px]">
                    {service.description}
                  </p>

                  <div className="mt-4 flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {service.title === "Digital & IT Services"
                      ? "Contact us"
                      : "Access service"}

                    <span className="ml-2 transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section
        id="how-it-works"
        className="bg-slate-50 py-16 dark:bg-slate-900 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 sm:text-sm">
              Simple Process
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl lg:text-4xl">
              How it works
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Getting the service you need is quick and straightforward.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-14 md:grid-cols-3 md:gap-8">
            {[
              {
                number: "1",
                title: "Create an account",
                description:
                  "Register on Brainfriend Global Tech and access your personal dashboard.",
              },
              {
                number: "2",
                title: "Fund your wallet",
                description:
                  "Add funds securely to your wallet and choose the service you want.",
              },
              {
                number: "3",
                title: "Get your service",
                description:
                  "Complete your request and receive your service quickly from your dashboard.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-slate-950 dark:shadow-black/20 sm:p-8"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white sm:h-14 sm:w-14 sm:text-lg">
                  {step.number}
                </div>

                <h3 className="mt-5 text-base font-bold text-slate-950 dark:text-white sm:mt-6 sm:text-lg">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:mt-3">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section
        id="faq"
        className="bg-white py-16 dark:bg-slate-950 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 sm:text-sm">
            FAQ
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
            Frequently Asked Questions
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
            Have a question about our services? Our support team is ready to
            help.
          </p>

          <Link
            href="/contact"
            className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Contact Support
          </Link>
        </div>
      </section>

      {/* ================= WHY BRAINFOOD ================= */}
      <section className="bg-slate-50 py-16 dark:bg-slate-900 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 sm:text-sm">
                Why Brainfriend?
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl lg:text-4xl">
                Built to make digital services easier.
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
                Brainfriend Global Tech brings everyday digital services
                together in one convenient platform, helping individuals and
                businesses save time and manage essential services with ease.
              </p>

              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Go to Dashboard
                <span className="ml-2">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-slate-800">
                    {benefit.icon}
                  </div>

                  <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                    {benefit.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-white px-5 py-16 dark:bg-slate-950 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-blue-600 px-5 py-12 text-center shadow-xl shadow-blue-900/10 sm:px-10 sm:py-14 lg:py-16">
          <div className="mx-auto max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100 sm:text-sm">
              Brainfriend Global Tech
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              Ready to get started?
            </h2>

            <p className="mt-3 text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
              Access reliable digital services from one convenient platform.
            </p>

            <div className="mt-7">
              <Link
                href="/dashboard"
                className="inline-flex rounded-full bg-white px-6 py-3.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50 sm:px-7"
              >
                Go to Dashboard
                <span className="ml-2">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}