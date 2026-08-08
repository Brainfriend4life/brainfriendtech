import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 bg-gradient-to-r from-indigo-600 to-blue-600">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-3xl bg-white/10 p-12 backdrop-blur text-center text-white">

          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Get Started?
          </h2>

          <p className="mt-6 text-lg text-indigo-100 max-w-2xl mx-auto">
            Join thousands of users enjoying fast airtime, affordable data,
            instant bill payments and secure wallet funding.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-5">

            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-indigo-600 hover:bg-gray-100"
              >
                Create Free Account
              </Button>
            </Link>

            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-indigo-600"
              >
                Login
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

          </div>

        </div>
      </div>
    </section>
  );
}