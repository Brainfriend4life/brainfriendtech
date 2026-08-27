
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section
      className="
        relative
        overflow-hidden
        bg-gradient-to-r
        from-indigo-700
        via-purple-700
        to-indigo-900
        py-20
        transition-colors
        dark:from-indigo-950
        dark:via-purple-950
        dark:to-gray-950
        sm:py-24
      "
      aria-labelledby="hero-heading"
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl">
          <h1
            id="hero-heading"
            className="
              mb-6
              text-4xl
              font-bold
              tracking-tight
              text-white
              sm:text-5xl
              lg:text-6xl
            "
          >
            Fast & Reliable NIN Verification/VTU Services in Nigeria
          </h1>

          <p
            className="
              mb-8
              max-w-2xl
              text-lg
              leading-8
              text-indigo-100
              dark:text-gray-200
              sm:text-xl
            "
          >
            Brainfriend Global Tech provides fast and reliable
            NIN verification, airtime, data, electricity tokens,
            cable TV subscriptions, WAEC, NECO, JAMB and other
            digital services from one secure platform.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="
                  bg-white
                  text-indigo-700
                  hover:bg-gray-100
                  dark:bg-white
                  dark:text-indigo-800
                  dark:hover:bg-gray-200
                "
              >
                Get Started
              </Button>
            </Link>

            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="
                  border-white
                  bg-transparent
                  text-white
                  hover:bg-white/10
                  hover:text-white
                  dark:border-gray-300
                  dark:text-white
                  dark:hover:bg-white/10
                  dark:hover:text-white
                "
              >
                Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

