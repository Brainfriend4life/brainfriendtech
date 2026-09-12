import Link from "next/link";

const services = [
  {
    title: "NIN Verification",
    description:
      "Verify your NIN quickly and securely for personal, business and documentation needs.",
    icon: "🪪",
    href: "/services/nin",
    badge: "Identity",
  },
  {
    title: "Airtime",
    description:
      "Recharge your mobile line instantly across supported Nigerian networks.",
    icon: "📱",
    href: "/services/airtime",
    badge: "VTU",
  },
  {
    title: "Data Bundles",
    description:
      "Buy affordable data bundles for your preferred Nigerian network with fast delivery.",
    icon: "📶",
    href: "/services/data",
    badge: "VTU",
  },
  {
    title: "Electricity Bills",
    description:
      "Purchase electricity tokens and pay your electricity bills conveniently online.",
    icon: "⚡",
    href: "/services/electricity",
    badge: "Bills",
  },
  {
    title: "Cable TV",
    description:
      "Renew your DStv, GOtv and other supported cable TV subscriptions with ease.",
    icon: "📺",
    href: "/services/cable",
    badge: "Subscriptions",
  },
  {
    title: "Exam PINs",
    description:
      "Get WAEC, NECO, JAMB and other supported examination PINs conveniently.",
    icon: "🎓",
    href: "/services/exam-pins",
    badge: "Education",
  },
  {
    title: "CBT Practice",
    description:
      "Prepare for examinations with convenient computer-based test practice resources.",
    icon: "💻",
    href: "/cbt",
    badge: "Education",
  },
  {
    title: "Digital & IT Services",
    description:
      "Get support with graphics design, websites, digital solutions and other technology services.",
    icon: "🛠️",
    href: "/contact",
    badge: "Technology",
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
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">

          {/* Logo / Brand */}
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-blue-50 dark:bg-slate-800">
              <img
                src="/logo.png"
                alt="Brainfriend Global Tech"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-950 dark:text-white">
                Brainfriend Global Tech
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your Gateway to Digital Skills
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              Home
            </Link>

            <Link
              href="/services"
              className="text-sm font-semibold text-blue-600 dark:text-blue-400"
            >
              Services
            </Link>

            <Link
              href="/#how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              How It Works
            </Link>

            <Link
              href="/#faq"
              className="text-sm font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              FAQ
            </Link>
          </nav>

          {/* Authentication Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-slate-900 sm:px-5"
            >
              Log in
            </Link>

            <Link
              href="/register"
              className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:px-5"
            >
              Register
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800 md:hidden">
          <nav className="flex items-center justify-between gap-3 overflow-x-auto">
            <Link
              href="/"
              className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Home
            </Link>

            <Link
              href="/services"
              className="whitespace-nowrap text-xs font-semibold text-blue-600 dark:text-blue-400"
            >
              Services
            </Link>

            <Link
              href="/#how-it-works"
              className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              How It Works
            </Link>

            <Link
              href="/#faq"
              className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              FAQ
            </Link>
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/20" />
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/20" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">

            <div className="mb-6 inline-flex items-center rounded-full border border-blue-100 bg-white px-5 py-2 text-sm font-semibold text-blue-600 shadow-sm dark:border-blue-900/50 dark:bg-slate-900 dark:text-blue-400">
              Our Services
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              Everything You Need,
              <span className="block text-blue-600 dark:text-blue-400">
                All in One Place.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              From NIN verification and data subscriptions to electricity
              payments, cable TV and examination services, Brainfriend Global
              Tech makes everyday digital services simple and convenient.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Get Started
                <span className="ml-2">→</span>
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-slate-800"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section className="bg-white py-20 dark:bg-slate-950 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="mb-12">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              What We Offer
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Our digital services
            </h2>

            <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
              Choose a service and get started in just a few steps.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-100 opacity-0 blur-2xl transition group-hover:opacity-100 dark:bg-blue-900/30" />

                <div className="relative">
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl transition group-hover:scale-105 group-hover:bg-blue-600 dark:bg-slate-800">
                      {service.icon}
                    </div>

                    <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {service.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    {service.title}
                  </h3>

                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {service.description}
                  </p>

                  <div className="mt-5 flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Get started
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
        className="bg-slate-50 py-20 dark:bg-slate-900 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Simple Process
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
              How it works
            </h2>

            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Getting the service you need is quick and straightforward.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
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
                className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-950 dark:shadow-black/20"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {step.number}
                </div>

                <h3 className="mt-6 text-lg font-bold text-slate-950 dark:text-white">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ANCHOR ================= */}
      <section
        id="faq"
        className="bg-white py-20 dark:bg-slate-950 lg:py-24"
      >
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            FAQ
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
            Frequently Asked Questions
          </h2>

          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Have a question about our services? Our support team is ready to
            help.
          </p>

          <Link
            href="/contact"
            className="mt-7 inline-flex rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Contact Support
          </Link>
        </div>
      </section>

      {/* ================= WHY BRAINFOOD ================= */}
      <section className="bg-slate-50 py-20 dark:bg-slate-900 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">

            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Why Brainfriend?
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Built to make digital services easier.
              </h2>

              <p className="mt-5 leading-7 text-slate-600 dark:text-slate-400">
                Brainfriend Global Tech brings everyday digital services
                together in one convenient platform, helping individuals and
                businesses save time and manage essential services with ease.
              </p>

              <Link
                href="/register"
                className="mt-7 inline-flex items-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Create an Account
                <span className="ml-2">→</span>
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-slate-800">
                    {benefit.icon}
                  </div>

                  <h3 className="mt-5 font-bold text-slate-950 dark:text-white">
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
      <section className="bg-white px-6 pb-20 pt-20 dark:bg-slate-950 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-blue-600 px-6 py-14 text-center shadow-xl shadow-blue-900/10 sm:px-10 lg:py-16">

          <div className="mx-auto max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
              Brainfriend Global Tech
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Ready to get started?
            </h2>

            <p className="mt-4 leading-7 text-blue-100">
              Access reliable digital services from one convenient platform.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
              >
                Register Now
              </Link>

              <Link
                href="/contact"
                className="rounded-full border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Contact Us
              </Link>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}