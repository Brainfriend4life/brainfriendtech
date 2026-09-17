import {
  Users,
  CreditCard,
  ShieldCheck,
  Headphones,
  ArrowUpRight,
} from "lucide-react";

const stats = [
  {
    title: "10,000+",
    subtitle: "Happy Customers",
    description: "Customers trust us for their everyday digital services.",
    icon: Users,
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500",
  },
  {
    title: "500,000+",
    subtitle: "Successful Transactions",
    description: "Transactions completed across our digital services.",
    icon: CreditCard,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },
  {
    title: "99.9%",
    subtitle: "Service Uptime",
    description: "Reliable access to our platform when you need it.",
    icon: ShieldCheck,
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    accent: "bg-purple-500",
  },
  {
    title: "24/7",
    subtitle: "Customer Support",
    description: "Support is available to help with your questions.",
    icon: Headphones,
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500",
  },
];

export default function Stats() {
  return (
    <section
      aria-labelledby="stats-heading"
      className="
        relative
        overflow-hidden
        bg-gray-950
        px-4
        py-16
        text-white
        sm:px-6
        sm:py-20
        lg:px-8
        lg:py-24
      "
    >
      {/* BACKGROUND GLOW */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-0
          h-72
          w-72
          -translate-x-1/2
          rounded-full
          bg-indigo-600/20
          blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-32
          -left-20
          h-64
          w-64
          rounded-full
          bg-blue-600/10
          blur-3xl
        "
      />

      <div className="relative mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="mx-auto max-w-3xl text-center">
          <div
            className="
            mb-4
            inline-flex
            items-center
            rounded-full
            border
            border-indigo-400/20
            bg-indigo-500/10
            px-3
            py-1.5
          "
          >
            <span
              className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.18em]
              text-indigo-300
              sm:text-[11px]
            "
            >
              Trusted & Reliable
            </span>
          </div>

          <h2
            id="stats-heading"
            className="
              text-2xl
              font-extrabold
              tracking-tight
              text-white
              sm:text-3xl
              lg:text-4xl
          "
          >
            Built for Everyday Digital Transactions
          </h2>

          <p
            className="
            mx-auto
            mt-4
            max-w-2xl
            text-sm
            leading-6
            text-gray-400
            sm:text-base
          "
          >
            Thousands of customers use Brainfriend Global Tech for convenient,
            secure and reliable digital services across Nigeria.
          </p>
        </div>

        {/* STAT CARDS */}

        <div
          className="
          mt-10
          grid
          gap-4
          sm:mt-12
          sm:grid-cols-2
          lg:grid-cols-4
          lg:gap-5
        "
        >
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.subtitle}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/10
                  bg-white/[0.04]
                  p-5
                  backdrop-blur-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-white/15
                  hover:bg-white/[0.07]
                  hover:shadow-2xl
                  sm:p-6
                "
              >
                {/* DECORATIVE CIRCLE */}

                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    -right-10
                    -top-10
                    h-24
                    w-24
                    rounded-full
                    bg-white/5
                    blur-2xl
                  "
                />

                {/* TOP */}

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
                      ${item.iconBg}
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
                      className={item.iconColor}
                      size={24}
                      strokeWidth={2.2}
                    />
                  </div>

                  {/* ARROW */}

                  <div
                    className="
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/10
                    bg-white/5
                    text-gray-500
                    transition-all
                    duration-300
                    group-hover:border-white/20
                    group-hover:text-gray-300
                  "
                  >
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </div>
                </div>

                {/* NUMBER */}

                <div className="relative mt-6">
                  <h3
                    className="
                    text-3xl
                    font-extrabold
                    tracking-tight
                    text-white
                    sm:text-4xl
                  "
                  >
                    {item.title}
                  </h3>

                  <p
                    className="
                    mt-1
                    text-sm
                    font-bold
                    text-gray-200
                  "
                  >
                    {item.subtitle}
                  </p>

                  <p
                    className="
                    mt-2
                    text-xs
                    leading-5
                    text-gray-500
                  "
                  >
                    {item.description}
                  </p>
                </div>

                {/* BOTTOM STATUS */}

                <div
                  className="
                  relative
                  mt-5
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
                      ${item.accent}
                    `}
                  />

                  <span
                    className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-gray-500
                  "
                  >
                    Brainfriend Global Tech
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
                    ${item.accent}
                    transition-all
                    duration-300
                    group-hover:w-full
                  `}
                />
              </div>
            );
          })}
        </div>

        {/* TRUST MESSAGE */}

        <div
          className="
          mx-auto
          mt-8
          flex
          max-w-2xl
          items-center
          justify-center
          gap-2
          text-center
          text-xs
          text-gray-500
          sm:text-sm
        "
        >
          <ShieldCheck
            size={16}
            className="shrink-0 text-emerald-400"
            aria-hidden="true"
          />

          <span>
            Simple transactions. Reliable services. Built with your convenience
            in mind.
          </span>
        </div>
      </div>
    </section>
  );
}
