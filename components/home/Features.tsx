import {
  BadgeCheck,
  Clock3,
  ShieldCheck,
  WalletCards,
  Smartphone,
  Wifi,
  Signal,
} from "lucide-react";

const features = [
  {
    title: "Instant Service Delivery",
    description:
      "Get airtime, data bundles, electricity tokens and other digital services delivered quickly and reliably.",
    icon: Clock3,
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
  },
  {
    title: "Secure Payments",
    description:
      "Your wallet, account information and transactions are protected with modern security practices.",
    icon: ShieldCheck,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },
  {
    title: "Affordable VTU Prices",
    description:
      "Enjoy competitive prices on data bundles, airtime, electricity and other digital services in Nigeria.",
    icon: WalletCards,
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    accent: "bg-purple-500",
  },
  {
    title: "Reliable VTU Service",
    description:
      "A simple and dependable platform designed to make everyday digital payments and services easier.",
    icon: BadgeCheck,
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500",
  },
];

export default function Features() {
  return (
    <section
      aria-labelledby="features-heading"
      className="
        relative
        overflow-hidden
        bg-slate-50
        px-4
        py-10
        text-gray-900
        transition-colors
        dark:bg-gray-950
        dark:text-gray-100
        sm:px-6
        sm:py-12
        lg:px-8
        lg:py-14
      "
    >
      {/* =====================================================
          VTU NETWORK BACKGROUND
      ====================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-60
          dark:opacity-30
        "
      >
        {/* NETWORK GRID */}

        <div
          className="
            absolute
            inset-0
            bg-[linear-gradient(to_right,rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.06)_1px,transparent_1px)]
            bg-[size:42px_42px]
            dark:bg-[linear-gradient(to_right,rgba(129,140,248,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(129,140,248,0.06)_1px,transparent_1px)]
          "
        />

        {/* TOP LEFT GLOW */}

        <div
          className="
            absolute
            -left-20
            -top-20
            h-64
            w-64
            rounded-full
            bg-indigo-300/20
            blur-3xl
            dark:bg-indigo-600/10
          "
        />

        {/* RIGHT GLOW */}

        <div
          className="
            absolute
            -right-20
            top-1/3
            h-64
            w-64
            rounded-full
            bg-blue-300/20
            blur-3xl
            dark:bg-blue-600/10
          "
        />

        {/* NETWORK DOTS */}

        <div className="absolute left-[8%] top-[22%] h-2 w-2 rounded-full bg-indigo-400/40" />
        <div className="absolute left-[22%] top-[70%] h-1.5 w-1.5 rounded-full bg-blue-400/40" />
        <div className="absolute right-[15%] top-[18%] h-2 w-2 rounded-full bg-purple-400/40" />
        <div className="absolute right-[7%] bottom-[20%] h-1.5 w-1.5 rounded-full bg-indigo-400/40" />

        {/* SIGNAL ICONS */}

        <Signal
          className="
            absolute
            left-[3%]
            top-[45%]
            h-12
            w-12
            rotate-[-15deg]
            text-indigo-200/40
            dark:text-indigo-500/10
          "
        />

        <Wifi
          className="
            absolute
            right-[4%]
            top-[55%]
            h-14
            w-14
            rotate-12
            text-blue-200/40
            dark:text-blue-500/10
          "
        />

        <Smartphone
          className="
            absolute
            bottom-[8%]
            left-[45%]
            h-10
            w-10
            rotate-6
            text-purple-200/30
            dark:text-purple-500/10
          "
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
          <div
            className="
              mb-3
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-indigo-100
              bg-white/80
              px-3
              py-1.5
              shadow-sm
              backdrop-blur
              dark:border-indigo-900/40
              dark:bg-gray-900/70
            "
          >
            <Signal
              size={13}
              className="text-indigo-600 dark:text-indigo-400"
            />

            <span
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.18em]
                text-indigo-600
                dark:text-indigo-400
                sm:text-[11px]
              "
            >
              Why Choose Us
            </span>
          </div>

          <h2
            id="features-heading"
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
            Digital Services Built
            <span className="text-indigo-600 dark:text-indigo-400">
              {" "}
              Around You
            </span>
          </h2>

          <p
            className="
              mx-auto
              mt-3
              max-w-2xl
              text-sm
              leading-6
              text-gray-600
              dark:text-gray-300
              sm:text-base
            "
          >
            From airtime and data to bills and other digital services,
            Brainfriend Global Tech keeps your everyday transactions simple,
            secure and convenient.
          </p>
        </div>

        {/* =====================================================
            FEATURE CARDS
        ====================================================== */}

        <div
          className="
            grid
            gap-3
            sm:grid-cols-2
            sm:gap-4
            lg:grid-cols-4
          "
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  border-gray-200/80
                  bg-white/90
                  p-4
                  shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                  backdrop-blur-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-lg
                  dark:border-gray-800
                  dark:bg-gray-900/90
                  dark:shadow-black/20
                  sm:p-5
                "
              >
                {/* DECORATIVE CIRCLE */}

                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    -right-8
                    -top-8
                    h-20
                    w-20
                    rounded-full
                    bg-gray-100/80
                    blur-2xl
                    transition-transform
                    duration-500
                    group-hover:scale-150
                    dark:bg-gray-800/80
                  "
                />

                {/* ICON */}

                <div
                  className={`
                    relative
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    ${feature.iconBg}
                    transition-transform
                    duration-300
                    group-hover:scale-105
                    sm:h-12
                    sm:w-12
                  `}
                >
                  <Icon
                    aria-hidden="true"
                    className={feature.iconColor}
                    size={22}
                    strokeWidth={2.2}
                  />
                </div>

                {/* CONTENT */}

                <div className="relative mt-4">
                  <h3
                    className="
                      text-base
                      font-bold
                      tracking-tight
                      text-gray-900
                      dark:text-white
                    "
                  >
                    {feature.title}
                  </h3>

                  <p
                    className="
                      mt-1.5
                      text-xs
                      leading-5
                      text-gray-600
                      dark:text-gray-300
                      sm:text-[13px]
                      sm:leading-5
                    "
                  >
                    {feature.description}
                  </p>
                </div>

                {/* STATUS */}

                <div
                  className="
                    relative
                    mt-4
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className={`
                      h-1.5
                      w-1.5
                      rounded-full
                      ${feature.accent}
                    `}
                  />

                  <span
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-gray-400
                      dark:text-slate-500
                    "
                  >
                    Available 24/7
                  </span>
                </div>

                {/* BOTTOM ACCENT */}

                <div
                  className={`
                    absolute
                    bottom-0
                    left-0
                    h-[2px]
                    w-0
                    ${feature.accent}
                    transition-all
                    duration-300
                    group-hover:w-full
                  `}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
