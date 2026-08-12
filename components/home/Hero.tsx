"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 py-24">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl">
          <h1 className="mb-6 text-5xl font-bold text-white">
            Fast & Reliable VTU Platform
          </h1>

          <p className="mb-8 text-lg text-indigo-100">
            NIN verification, Buy Airtime, Data, Electricity Tokens, Cable TV, WAEC, NECO,
            JAMB and more all from one secure platform.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/register">
              <Button size="lg">
                Get Started
              </Button>
            </Link>

            <Link href="/login">
              <Button size="lg" variant="outline">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}