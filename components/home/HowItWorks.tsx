import {
  UserPlus,
  Wallet,
  ShoppingCart,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description:
      "Create your Brainfriend Global Tech account in less than a minute using your basic details.",
    icon: UserPlus,
    cardBg: "bg-blue-50/80 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
  },
  {
    number: "02",
    title: "Fund Your Wallet",
    description:
      "Add money securely to your wallet through our available payment options and get ready to transact.",
    icon: Wallet,
    cardBg: "bg-emerald-50/80 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },
  {
    number: "03",
    title: "Choose a Service",
    description:
      "Select the service you need, from airtime and data to electricity, cable TV, examination services and NIN verification.",
    icon: ShoppingCart,
    cardBg: "bg-purple-50/80 dark:bg-purple-950/20",
    border: "border-purple-100 dark:border-purple-900/40",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    accent: "bg-purple-500",
  },
  {
    number: "04",
    title: "Get Instant Delivery",
    description:
      "Complete your purchase and receive your selected service quickly with real-time transaction confirmation.",
    icon: CheckCircle,
    cardBg: "bg-indigo-50/80 dark:bg-indigo-950/20",
    border: "border-indigo-100 dark:border-indigo-900/40",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    accent: "bg-indigo-500",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="
        bg-slate-50
        px-4
        py-16
        text-gray-900
        transition-colors
        dark:bg-gray-950
        dark:text-gray-100
        sm:px-6
        sm:py-20
        lg:px-8
        lg:py-24
      "
    >
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
              Simple & Secure
            </span>
          </div>

          <h2
            id="how-it-works-heading"
            className="
              text-2xl
              font-extrabold
              tracking-tight
              text-gray-900
              dark:text-white
              sm:text-3xl
              lg:text-4xl
          "
          >
            How Brainfriend Global Tech Works
          </h2>

          <p
            className="
            mx-auto
            mt-4
            max-w-2xl
            text-sm
            leading-6
            text-gray-600
            dark:text-gray-300
            sm:text-base
          "
          >
            Getting started is simple. Create your account, fund your wallet,
            choose the service you need and complete your transaction in just a
            few steps.
          </p>
        </div>

        {/* STEPS */}
        <div
          className="
          relative
          mt-12
          grid
          gap-4
          sm:mt-14
          sm:grid-cols-2
          lg:grid-cols-4
          lg:gap-5
        "
        >
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className={`
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  ${step.border}
                  ${step.cardBg}
                  p-5
                  shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-lg
                  dark:shadow-black/10
                  sm:p-6
                `}
              >
                {/* DECORATIVE CIRCLE */}
                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-10
                    -top-10
                    h-24
                    w-24
                    rounded-full
                    bg-white/40
                    blur-2xl
                    dark:bg-white/5
                  "
                />

                {/* TOP ROW */}
                <div className="relative flex items-start justify-between">
                  {/* ICON */}
                  <div
                    className={`
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-xl
                      ${step.iconBg}
                      transition-transform
                      duration-300
                      group-hover:scale-105
                      sm:h-14
                      sm:w-14
                      sm:rounded-[14px]
                    `}
                  >
                    <Icon
                      aria-hidden="true"
                      className={step.iconColor}
                      size={24}
                      strokeWidth={2.2}
                    />
                  </div>

                  {/* NUMBER */}
                  <span
                    className="
                    text-xs
                    font-extrabold
                    tracking-widest
                    text-gray-400
                    dark:text-slate-500
                  "
                  >
                    {step.number}
                  </span>
                </div>

                {/* CONTENT */}
                <div className="relative mt-5">
                  <h3
                    className="
                    text-base
                    font-bold
                    text-gray-900
                    dark:text-white
                    sm:text-lg
                  "
                  >
                    {step.title}
                  </h3>

                  <p
                    className="
                    mt-2
                    text-xs
                    leading-5
                    text-gray-600
                    dark:text-gray-300
                    sm:text-sm
                    sm:leading-6
                  "
                  >
                    {step.description}
                  </p>
                </div>

                {/* STEP INDICATOR */}
                <div className="relative mt-5 flex items-center gap-2">
                  <span
                    className={`
                    h-1.5
                    w-1.5
                    rounded-full
                    ${step.accent}
                  `}
                  />

                  <span
                    className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-gray-400
                    dark:text-slate-500
                  "
                  >
                    Step {index + 1}
                  </span>

                  {index < steps.length - 1 && (
                    <ArrowRight
                      size={13}
                      className="
                        ml-auto
                        text-gray-300
                        transition-transform
                        duration-300
                        group-hover:translate-x-1
                        dark:text-slate-600
                      "
                    />
                  )}
                </div>

                {/* BOTTOM ACCENT */}
                <div
                  className={`
                    absolute
                    bottom-0
                    left-0
                    h-[2px]
                    w-0
                    ${step.accent}
                    transition-all
                    duration-300
                    group-hover:w-full
                  `}
                />
              </div>
            );
          })}
        </div>

        {/* BOTTOM MESSAGE */}
        <div
          className="
          mx-auto
          mt-10
          flex
          max-w-2xl
          items-center
          justify-center
          gap-2
          text-center
          text-xs
          text-gray-500
          dark:text-slate-400
          sm:text-sm
        "
        >
          <CheckCircle size={16} className="shrink-0 text-emerald-500" />

          <span>
            Everything is designed to make your digital transactions simple,
            fast and convenient.
          </span>
        </div>
      </div>
    </section>
  );
}
