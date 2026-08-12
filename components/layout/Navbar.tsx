
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* LOGO + BUSINESS NAME */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2"
        >
          <Image
            src="/logo.png"
            alt="Brainfriend Tech Logo"
            width={44}
            height={44}
            className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11"
            priority
          />

          <span className="text-lg font-bold text-indigo-600 sm:text-xl">
            Brainfriend Global Tech
          </span>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden items-center gap-7 md:flex">
          <Link
            href="/"
            className="font-medium text-gray-700 transition hover:text-indigo-600"
          >
            Home
          </Link>

          <Link
            href="#services"
            className="font-medium text-gray-700 transition hover:text-indigo-600"
          >
            Services
          </Link>

          <Link
            href="/pricing"
            className="font-medium text-gray-700 transition hover:text-indigo-600"
          >
            Pricing
          </Link>

          <Link
            href="/contact"
            className="font-medium text-gray-700 transition hover:text-indigo-600"
          >
            Contact
          </Link>
        </nav>

        {/* DESKTOP AUTH BUTTONS */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="outline">
              Login
            </Button>
          </Link>

          <Link href="/register">
            <Button>
              Create Account
            </Button>
          </Link>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 md:hidden"
          aria-label={
            mobileOpen
              ? "Close menu"
              : "Open menu"
          }
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="border-t bg-white px-4 py-4 shadow-md md:hidden">
          <nav className="flex flex-col gap-1">

            <Link
              href="/"
              onClick={() =>
                setMobileOpen(false)
              }
              className="rounded-lg px-4 py-3 font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              Home
            </Link>

            <Link
              href="#services"
              onClick={() =>
                setMobileOpen(false)
              }
              className="rounded-lg px-4 py-3 font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              Services
            </Link>

            <Link
              href="/pricing"
              onClick={() =>
                setMobileOpen(false)
              }
              className="rounded-lg px-4 py-3 font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              Pricing
            </Link>

            <Link
              href="/contact"
              onClick={() =>
                setMobileOpen(false)
              }
              className="rounded-lg px-4 py-3 font-medium text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              Contact
            </Link>

            {/* MOBILE AUTH BUTTONS */}
            <div className="mt-3 flex flex-col gap-2 border-t pt-4">
              <Link
                href="/login"
                onClick={() =>
                  setMobileOpen(false)
                }
                className="w-full"
              >
                <Button
                  variant="outline"
                  className="w-full"
                >
                  Login
                </Button>
              </Link>

              <Link
                href="/register"
                onClick={() =>
                  setMobileOpen(false)
                }
                className="w-full"
              >
                <Button className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

