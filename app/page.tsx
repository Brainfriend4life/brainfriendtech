import Testimonials from "@/components/home/Testimonials";
import Footer from "@/components/layout/Footer";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Fingerprint,
  GraduationCap,
  Headphones,
  LockKeyhole,
  Network,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tv,
  UserPlus,
  Users,
  Wallet,
  WalletCards,
  Wifi,
  Zap,
} from "lucide-react";

import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title:
    "Brainfriend Global Tech | Fast & Reliable VTU & NIN Services in Nigeria",

  description:
    "Brainfriend Global Tech provides fast and reliable VTU and digital services in Nigeria including data, airtime, NIN verification, electricity, cable TV and examination services.",

  keywords: [
    "Brainfriend Global Tech",
    "VTU Nigeria",
    "VTU services Nigeria",
    "buy data Nigeria",
    "buy airtime Nigeria",
    "NIN verification Nigeria",
    "electricity bill payment Nigeria",
    "cable TV subscription Nigeria",
    "DStv Nigeria",
    "GOtv Nigeria",
    "WAEC PIN Nigeria",
    "NECO PIN Nigeria",
    "JAMB PIN Nigeria",
    "online VTU platform",
    "cheap data Nigeria",
    "digital services Nigeria",
  ],

  alternates: {
    canonical: "https://brainfriendglobaltech.com",
  },

  openGraph: {
    title:
      "Brainfriend Global Tech | Fast & Reliable VTU & NIN Services in Nigeria",

    description:
      "Fast and reliable data, airtime, NIN verification, electricity, cable TV and examination services.",

    url: "https://brainfriendglobaltech.com",

    siteName: "Brainfriend Global Tech",

    type: "website",

    locale: "en_NG",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Brainfriend Global Tech - Fast & Reliable VTU Services",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "Brainfriend Global Tech | Fast & Reliable VTU & NIN Services in Nigeria",

    description: "Fast and reliable VTU and digital services in Nigeria.",

    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

/* =========================================================
   SERVICES
========================================================= */

const services = [
  {
    title: "Airtime",
    description: "Buy airtime instantly",
    icon: Smartphone,
    href: "/dashboard/airtime",
    cardBg: "bg-blue-50/80 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
  },

  {
    title: "Data",
    description: "Affordable data bundles",
    icon: Wifi,
    href: "/dashboard/data",
    cardBg: "bg-cyan-50/80 dark:bg-cyan-950/20",
    border: "border-cyan-100 dark:border-cyan-900/40",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    accent: "bg-cyan-500",
  },

  {
    title: "Electricity",
    description: "Pay electricity bills",
    icon: Zap,
    href: "/dashboard/electricity",
    cardBg: "bg-amber-50/80 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500",
  },

  {
    title: "Cable TV",
    description: "Renew your subscription",
    icon: Tv,
    href: "/dashboard/cable",
    cardBg: "bg-purple-50/80 dark:bg-purple-950/20",
    border: "border-purple-100 dark:border-purple-900/40",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    accent: "bg-purple-500",
  },

  {
    title: "Exam Pins",
    description: "Get exam PINs easily",
    icon: GraduationCap,
    href: "/dashboard/exams",
    cardBg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },

  {
    title: "NIN Verification",
    description: "Verify your NIN securely",
    icon: Fingerprint,
    href: "/dashboard/nin",
    cardBg: "bg-rose-50/80 dark:bg-rose-950/20",
    border: "border-rose-100 dark:border-rose-900/40",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    accent: "bg-rose-500",
  },

  {
    title: "Refer & Earn",
    description: "Earn from referrals",
    icon: Users,
    href: "/dashboard/referral",
    cardBg: "bg-indigo-50/80 dark:bg-indigo-950/20",
    border: "border-indigo-100 dark:border-indigo-900/40",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accent: "bg-indigo-500",
  },
];

/* =========================================================
   FEATURES
========================================================= */

const features = [
  {
    title: "Instant Service Delivery",
    description:
      "Get airtime, data bundles, electricity tokens and other digital services delivered quickly.",
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
      "Enjoy competitive prices on airtime, data, electricity and other digital services.",
    icon: WalletCards,
  },

  {
    title: "Reliable VTU Service",
    description:
      "A simple and dependable platform designed to make everyday digital payments easier.",
    icon: BadgeCheck,
  },
];

/* =========================================================
   HOW IT WORKS
========================================================= */

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description: "Sign up in less than a minute using your email and password.",
    icon: UserPlus,
  },

  {
    number: "02",
    title: "Fund Your Wallet",
    description: "Add money securely using Paystack or bank transfer.",
    icon: Wallet,
  },

  {
    number: "03",
    title: "Choose a Service",
    description:
      "Select airtime, data, electricity, cable TV or any available service.",
    icon: ShoppingCart,
  },

  {
    number: "04",
    title: "Get Instant Delivery",
    description: "Complete your purchase and receive your service quickly.",
    icon: CheckCircle2,
  },
];

/* =========================================================
   STATS
========================================================= */

const stats = [
  {
    number: "10,000+",
    title: "Happy Customers",
    icon: Users,
  },

  {
    number: "500,000+",
    title: "Successful Transactions",
    icon: CreditCard,
  },

  {
    number: "99.9%",
    title: "Service Uptime",
    icon: ShieldCheck,
  },

  {
    number: "24/7",
    title: "Customer Support",
    icon: Headphones,
  },
];

const faqs = [
  {
    question: "What services does Brainfriend Global Tech provide?",

    answer:
      "You can purchase airtime, data, electricity, cable TV subscriptions, examination PINs and access NIN verification services.",
  },

  {
    question: "How do I fund my wallet?",

    answer:
      "You can fund your wallet securely through the available payment options on your dashboard.",
  },

  {
    question: "Is my money safe?",

    answer:
      "We use secure payment processing and account security practices to protect your transactions and account information.",
  },

  {
    question: "Can I use the platform from anywhere in Nigeria?",

    answer:
      "Yes. Brainfriend Global Tech is designed to provide digital services to customers across Nigeria.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* =========================================================
          NAVBAR
          Uses your existing Navbar so the original light/dark
          toggle remains available.
      ========================================================= */}

      <Navbar />

      {/* =========================================================
          HERO
      ========================================================= */}

      <section
        className="
          relative min-h-[650px]
          overflow-hidden
          bg-gradient-to-br
          from-white
          via-blue-50/60
          to-cyan-50/80
          pt-24
          transition-colors duration-300
          dark:from-slate-950
          dark:via-blue-950/40
          dark:to-slate-950
          lg:min-h-[690px]
        "
      >
        {/* BACKGROUND DESIGN */}

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-700/10" />

          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-700/10" />

          <div className="absolute right-[8%] top-[15%] h-[500px] w-[500px] rounded-full border border-blue-200/40 dark:border-blue-800/30" />

          <div className="absolute right-[12%] top-[20%] h-[390px] w-[390px] rounded-full border border-blue-200/30 dark:border-blue-800/20" />

          <div className="absolute bottom-0 left-0 h-36 w-full bg-gradient-to-t from-blue-100/70 to-transparent dark:from-blue-950/40" />

          {/* subtle VTU-style grid */}
          <div
            className="
              absolute inset-0 opacity-[0.035]
              dark:opacity-[0.04]
              [background-image:linear-gradient(rgba(37,99,235,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.8)_1px,transparent_1px)]
              [background-size:42px_42px]
            "
          />
        </div>

        {/* NETWORK GRAPHICS */}

        <div className="pointer-events-none absolute right-3 top-28 hidden opacity-20 dark:opacity-10 lg:block">
          <Network className="h-44 w-44 text-blue-600" strokeWidth={1} />
        </div>

        <div className="pointer-events-none absolute bottom-10 left-4 hidden opacity-10 dark:opacity-5 lg:block">
          <Network className="h-52 w-52 text-blue-600" strokeWidth={1} />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          {/* LEFT */}

          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-400">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              Fast
              <span>•</span>
              Secure
              <span>•</span>
              Reliable
            </div>

            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[58px]">
              Your One-Stop
              <br />
              <span className="text-blue-700 dark:text-blue-400">
                VTU & NIN
              </span>
              <br />
              Verification Platform
              <br />
              <span className="text-cyan-600 dark:text-cyan-400">
                in Nigeria
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              Buy airtime, data, electricity, cable TV, exam PINs and verify
              your NIN — all in one place. Fast, secure and affordable.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="
                  group inline-flex items-center gap-2
                  rounded-full
                  bg-gradient-to-r
                  from-blue-600
                  to-indigo-600
                  px-6 py-3.5
                  text-sm font-bold text-white
                  shadow-xl shadow-blue-600/20
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-2xl
                "
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>

              <Link
                href="/services"
                className="
                  inline-flex items-center gap-2
                  rounded-full
                  border border-blue-200
                  bg-white/80
                  px-6 py-3.5
                  text-sm font-bold text-blue-700
                  backdrop-blur
                  transition
                  hover:bg-white
                  dark:border-blue-800
                  dark:bg-slate-900/70
                  dark:text-blue-400
                  dark:hover:bg-slate-900
                "
              >
                Explore Services
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                Instant Delivery
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                Secure Payments
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Headphones className="h-3.5 w-3.5" />
                </div>
                24/7 Support
              </div>
            </div>
          </div>

          {/* RIGHT VISUAL
              Same absolute-positioned mockup as before (built inside a
              fixed 540x500 box so the phone / NIN card / telecom badges
              keep their exact relative positions), but now wrapped in a
              responsive-sized outer box that scales the whole group down
              with a CSS transform on small screens instead of hiding it.
              The outer box's own size shrinks per breakpoint so it takes
              up exactly the right amount of space in the layout — no
              leftover empty space, no overflow, no overlap with the text
              column above it. */}

          <div
            className="
              relative mx-auto mt-4
              h-[250px] w-[270px]
              sm:h-[315px] sm:w-[340px]
              lg:mt-0 lg:h-[500px] lg:w-[540px]
            "
          >
            <div
              className="
                absolute left-0 top-0
                h-[500px] w-[540px]
                origin-top-left
                scale-[0.5]
                sm:scale-[0.63]
                lg:scale-100
              "
            >
              {/* glowing circle */}

              <div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-200/80 to-cyan-100/40 blur-sm dark:from-blue-900/40 dark:to-cyan-900/20" />

              {/* PHONE */}

              <div className="absolute right-5 top-14 h-[410px] w-[220px] rotate-[7deg] rounded-[34px] border-[7px] border-slate-900 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                <div className="h-full overflow-hidden rounded-[26px] bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 text-white">
                    <div>
                      <div className="text-[9px] opacity-80">Welcome back</div>

                      <div className="text-sm font-bold">Brainfriend</div>
                    </div>

                    <Wallet className="h-5 w-5" />
                  </div>

                  <div className="p-3">
                    <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
                      <div className="text-[9px] text-slate-400">
                        Wallet Balance
                      </div>

                      <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                        ₦25,480.00
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {[
                        ["Airtime", Smartphone],
                        ["Data", Wifi],
                        ["Electricity", Zap],
                        ["Cable TV", Tv],
                        ["Exam Pins", GraduationCap],
                        ["NIN Verification", Fingerprint],
                      ].map(([name, Icon]) => {
                        const ServiceIcon = Icon as typeof Smartphone;

                        return (
                          <div
                            key={String(name)}
                            className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm dark:bg-slate-800"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                              <ServiceIcon className="h-3.5 w-3.5" />
                            </div>

                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                              {String(name)}
                            </span>

                            <ArrowRight className="ml-auto h-3 w-3 text-slate-300" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* NIN CARD */}

              <div className="absolute bottom-12 left-0 w-[270px] -rotate-3 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                    <Fingerprint className="h-6 w-6" />
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      NIN Verification
                    </div>

                    <div className="text-sm font-black text-slate-800 dark:text-white">
                      Verification Successful
                    </div>
                  </div>

                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                </div>
              </div>

              {/* TELECOM FLOATERS */}

              <div className="absolute left-16 top-24 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400 text-[10px] font-black text-slate-900 shadow-xl">
                MTN
              </div>

              <div className="absolute left-5 top-40 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500 text-xs font-black text-white shadow-xl">
                airtel
              </div>

              <div className="absolute left-16 top-56 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-xs font-black text-white shadow-xl">
                glo
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SERVICES
      ========================================================= */}

      <section
        id="services"
        className="
          relative bg-white py-12
          transition-colors duration-300
          dark:bg-slate-950
          sm:py-14
        "
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mb-7">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Quick Access
            </p>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Our Services
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Everything you need, all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <Link
                  key={service.title}
                  href={service.href}
                  className={`
                    group relative overflow-hidden
                    rounded-2xl border
                    ${service.border}
                    ${service.cardBg}
                    p-4
                    shadow-[0_1px_3px_rgba(0,0,0,0.03)]
                    transition-all duration-300
                    hover:-translate-y-1
                    hover:shadow-lg
                    active:scale-[0.98]
                  `}
                >
                  <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/50 blur-2xl dark:bg-white/5" />

                  <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 dark:bg-slate-900/60 dark:text-slate-300">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>

                  <div
                    className={`
                      relative flex h-12 w-12 items-center justify-center
                      rounded-[14px]
                      ${service.iconBg}
                      transition-transform duration-300
                      group-hover:scale-110
                    `}
                  >
                    <Icon
                      className={service.iconColor}
                      size={23}
                      strokeWidth={2.2}
                    />
                  </div>

                  <div className="relative mt-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-[15px]">
                      {service.title}
                    </h3>

                    <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400 sm:text-[11px]">
                      {service.description}
                    </p>
                  </div>

                  <div
                    className={`
                      absolute bottom-0 left-0 h-[2px] w-0
                      ${service.accent}
                      transition-all duration-300
                      group-hover:w-full
                    `}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          WHY US
      ========================================================= */}

      <section
        id="why-us"
        className="
          relative overflow-hidden
          bg-gradient-to-r
          from-blue-600
          via-blue-600
          to-indigo-700
          py-12
          text-white
          sm:py-14
        "
      >
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full border-[40px] border-white/10" />

          <div className="absolute right-0 top-0 h-80 w-80 rounded-full border-[50px] border-white/10" />

          <Network className="absolute bottom-0 left-0 h-64 w-64" />

          <Network className="absolute right-8 top-4 h-56 w-56" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_2fr] lg:items-center">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
                Why Choose Us
              </p>

              <h2 className="max-w-lg text-3xl font-black leading-tight sm:text-4xl">
                Fast, Secure and Reliable VTU Services
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100">
                We make everyday digital payments and VTU services simple, fast,
                secure and convenient for users across Nigeria.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div key={feature.title} className="group">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur transition group-hover:bg-white/25">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="text-sm font-bold">{feature.title}</h3>

                    <p className="mt-2 text-[11px] leading-5 text-blue-100">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}

      <section
        className="
          relative overflow-hidden
          bg-gradient-to-br
          from-slate-50
          via-white
          to-blue-50
          py-12
          transition-colors duration-300
          dark:from-slate-950
          dark:via-slate-900
          dark:to-blue-950/30
          sm:py-14
        "
      >
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-blue-100 blur-3xl dark:bg-blue-900/20" />

          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-100 blur-3xl dark:bg-cyan-900/20" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              How It Works
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Start Using Our Services in 4 Simple Steps
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Getting started is easy. Create an account, fund your wallet,
              choose a service and get instant delivery.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="
                    group relative
                    rounded-2xl
                    border border-blue-100
                    bg-white
                    p-5
                    shadow-sm
                    transition
                    hover:-translate-y-1
                    hover:shadow-lg
                    dark:border-slate-800
                    dark:bg-slate-900
                  "
                >
                  {index < steps.length - 1 && (
                    <div className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-600 lg:flex dark:border-slate-700 dark:bg-slate-900">
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/50 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <span className="text-xs font-black text-blue-100 dark:text-blue-900">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-sm font-black text-slate-900 dark:text-white">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          STATS
      ========================================================= */}

      <section
        className="
          relative overflow-hidden
          bg-gradient-to-r
          from-blue-950
          via-blue-900
          to-indigo-950
          py-12
          text-white
          sm:py-14
        "
      >
        <div className="absolute inset-0 opacity-10">
          <Network className="absolute -left-10 bottom-0 h-80 w-80" />

          <Network className="absolute right-0 top-0 h-72 w-72" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-center">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                Our Impact
              </p>

              <h2 className="text-2xl font-black sm:text-3xl">
                Trusted for Fast and Reliable VTU Services
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-blue-200">
                Brainfriend Global Tech provides reliable, secure and convenient
                VTU and digital payment services to customers across Nigeria.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.title}
                    className="rounded-2xl border border-white/10 bg-white/10 p-5 text-center backdrop-blur transition hover:bg-white/15"
                  >
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                      <Icon className="h-5 w-5 text-blue-200" />
                    </div>

                    <div className="text-2xl font-black sm:text-3xl">
                      {stat.number}
                    </div>

                    <div className="mt-1 text-[10px] text-blue-200 sm:text-xs">
                      {stat.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Testimonials />

      {/* =========================================================
          FAQ + CTA
      ========================================================= */}

      <section
        id="faq"
        className="
          bg-white
          py-12
          transition-colors duration-300
          dark:bg-slate-950
          sm:py-14
        "
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* FAQ */}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                Frequently Asked Questions
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                Got Questions?
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                Find quick answers to common questions about our services,
                payments and more.
              </p>

              <div className="mt-6 space-y-3">
                {faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="
                      group
                      rounded-xl
                      border border-slate-200
                      bg-white
                      p-4
                      dark:border-slate-800
                      dark:bg-slate-900
                    "
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-slate-800 dark:text-white">
                      {faq.question}

                      <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                    </summary>

                    <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            {/* CTA */}

            <div
              id="contact"
              className="
                relative overflow-hidden
                rounded-3xl
                bg-gradient-to-br
                from-blue-600
                via-indigo-600
                to-blue-800
                p-7
                text-white
                shadow-2xl
                sm:p-9
              "
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[35px] border-white/10" />

              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full border-[30px] border-white/10" />

              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Sparkles className="h-6 w-6" />
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
                  Ready to Get Started?
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Fast. Secure. Reliable.
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">
                  Join thousands of happy customers and experience convenient
                  VTU and digital services today.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="
                      inline-flex items-center gap-2
                      rounded-full
                      bg-white
                      px-5 py-3
                      text-sm font-bold text-blue-700
                      shadow-lg
                      transition
                      hover:-translate-y-0.5
                    "
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/login"
                    className="
                      inline-flex items-center gap-2
                      rounded-full
                      border border-white/30
                      bg-white/10
                      px-5 py-3
                      text-sm font-bold text-white
                      transition
                      hover:bg-white/20
                    "
                  >
                    Login
                  </Link>
                </div>

                <div className="mt-7 flex flex-wrap gap-4 text-[10px] font-semibold text-blue-100">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Secure
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Fast delivery
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    24/7 support
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
