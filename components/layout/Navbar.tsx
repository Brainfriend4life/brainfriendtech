
"use client";


import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* LOGO + BUSINESS NAME */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2"
        >
          <Image
            src="/logo.png"
            alt="Brainfriend Global Tech Logo"
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
            className="font-medium text-foreground/80 transition hover:text-indigo-600"
          >
            Home
          </Link>

          <Link
            href="#services"
            className="font-medium text-foreground/80 transition hover:text-indigo-600"
          >
            Services
          </Link>

          <Link
            href="/pricing"
            className="font-medium text-foreground/80 transition hover:text-indigo-600"
          >
            Pricing
          </Link>

          <Link
            href="/contact"
            className="font-medium text-foreground/80 transition hover:text-indigo-600"
          >
            Contact
          </Link>
        </nav>

        {/* DESKTOP ACTIONS */}
        <div className="hidden items-center gap-3 md:flex">
        

          {/* LOGIN */}
          <Link href="/login">
            <Button variant="outline">
              Login
            </Button>
          </Link>

          {/* CREATE ACCOUNT */}
          <Link href="/register">
            <Button>
              Create Account
            </Button>
          </Link>
        </div>

        {/* MOBILE ACTIONS */}
        <div className="flex items-center gap-2 md:hidden">

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-foreground transition hover:bg-accent hover:text-accent-foreground"
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
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 shadow-md md:hidden">
          <nav className="flex flex-col gap-1">

            {/* HOME */}
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 font-medium text-foreground/80 transition hover:bg-accent hover:text-accent-foreground"
            >
              Home
            </Link>

            {/* SERVICES */}
            <Link
              href="#services"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 font-medium text-foreground/80 transition hover:bg-accent hover:text-accent-foreground"
            >
              Services
            </Link>

            {/* PRICING */}
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 font-medium text-foreground/80 transition hover:bg-accent hover:text-accent-foreground"
            >
              Pricing
            </Link>

            {/* CONTACT */}
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 font-medium text-foreground/80 transition hover:bg-accent hover:text-accent-foreground"
            >
              Contact
            </Link>

            {/* MOBILE AUTH BUTTONS */}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">

              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
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
                onClick={() => setMobileOpen(false)}
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

