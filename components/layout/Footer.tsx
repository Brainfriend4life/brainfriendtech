import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* BRAND */}

          <div>
            <h2 className="text-xl font-bold">
              Brainfriend Tech
            </h2>

            <p className="mt-3 text-sm text-gray-400">
              Your trusted platform for airtime,
              data, electricity, cable TV and
              other digital services.
            </p>
          </div>

          {/* QUICK LINKS */}

          <div>
            <h3 className="mb-4 font-semibold">
              Quick Links
            </h3>

            <div className="space-y-3 text-sm text-gray-400">

              <Link
                href="/"
                className="block transition hover:text-white"
              >
                Home
              </Link>

              <Link
                href="/pricing"
                className="block transition hover:text-white"
              >
                Pricing
              </Link>

              <Link
                href="/contact"
                className="block transition hover:text-white"
              >
                Contact
              </Link>

              <Link
                href="/#services"
                className="block transition hover:text-white"
              >
                Services
              </Link>

            </div>
          </div>

          {/* SERVICES */}

          <div>
            <h3 className="mb-4 font-semibold">
              Services
            </h3>

            <div className="space-y-3 text-sm text-gray-400">

              <Link
                href="/dashboard/airtime"
                className="block transition hover:text-white"
              >
                Airtime
              </Link>

              <Link
                href="/dashboard/data"
                className="block transition hover:text-white"
              >
                Data
              </Link>

              <Link
                href="/dashboard/electricity"
                className="block transition hover:text-white"
              >
                Electricity
              </Link>

              <Link
                href="/dashboard/cable"
                className="block transition hover:text-white"
              >
                Cable TV
              </Link>

              <Link
                href="/dashboard/exams"
                className="block transition hover:text-white"
              >
                Exams & Education
              </Link>

            </div>
          </div>

          {/* ACCOUNT */}

          <div>
            <h3 className="mb-4 font-semibold">
              Account
            </h3>

            <div className="space-y-3 text-sm text-gray-400">

              <Link
                href="/login"
                className="block transition hover:text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="block transition hover:text-white"
              >
                Create Account
              </Link>

            </div>
          </div>

        </div>

        {/* BOTTOM */}

        <div className="mt-10 flex flex-col gap-4 border-t border-gray-800 pt-6 text-sm text-gray-400 sm:flex-row sm:items-center sm:justify-between">

          <p>
            © {new Date().getFullYear()} Brainfriend Tech.
            All rights reserved.
          </p>

          <div className="flex flex-wrap gap-5">

            <Link
              href="/privacy"
              className="transition hover:text-white"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="transition hover:text-white"
            >
              Terms & Conditions
            </Link>

          </div>

        </div>

      </div>
    </footer>
  );
}