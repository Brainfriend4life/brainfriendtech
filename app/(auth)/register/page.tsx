
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  User,
  Gift,
} from "lucide-react";

import AuthButton from "@/components/auth/AuthButton";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const referralCode =
    searchParams.get("ref")?.trim().toUpperCase() || "";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    referralCode,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "referralCode"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password
    ) {
      toast.error("Please complete all the fields.");
      return;
    }

    if (form.password.length < 6) {
      toast.error(
        "Password must be at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        "/api/auth/register",
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          referralCode:
            form.referralCode.trim() || null,
        }
      );

      toast.success(
        res.data.message ||
          "Account created successfully."
      );

      router.push("/login");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            "Registration failed. Please try again."
        );
      } else {
        toast.error(
          "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen flex-col lg:flex-row">

        {/* ================================================= */}
        {/* LEFT BRAND PANEL */}
        {/* ================================================= */}

        <section className="relative hidden overflow-hidden bg-indigo-700 lg:flex lg:w-[40%] xl:w-[42%]">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10" />

          <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-blue-400/20" />

          <div className="absolute right-20 top-1/3 h-32 w-32 rounded-full border border-white/10" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">

            {/* LOGO */}
            <Link
              href="/"
              className="group flex w-fit items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg transition group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="Brainfriend Global Tech"
                  width={48}
                  height={48}
                  priority
                  className="h-10 w-10 object-contain"
                />
              </div>

              <div>
                <p className="text-xl font-bold text-white">
                  Brainfriend
                </p>

                <p className="text-xs font-semibold tracking-widest text-indigo-200">
                  TECH SERVICES
                </p>
              </div>
            </Link>

            {/* BRAND CONTENT */}
            <div className="my-12 max-w-md">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Join Brainfriend
              </p>

              <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                Everything you need.
                <br />
                One simple account.
              </h1>

              <p className="mt-6 text-base leading-7 text-indigo-100">
                Create your account and enjoy
                convenient access to airtime, data,
                electricity, cable and other digital
                services.
              </p>

              <div className="mt-9 space-y-4">

                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                    <Check className="h-4 w-4 text-indigo-600" />
                  </div>

                  <p className="text-sm font-medium text-white">
                    Fast and convenient transactions
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                    <Check className="h-4 w-4 text-indigo-600" />
                  </div>

                  <p className="text-sm font-medium text-white">
                    Secure wallet and payments
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                    <Check className="h-4 w-4 text-indigo-600" />
                  </div>

                  <p className="text-sm font-medium text-white">
                    Reliable digital services
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                    <Gift className="h-4 w-4 text-indigo-600" />
                  </div>

                  <p className="text-sm font-medium text-white">
                    Earn rewards when friends use the platform
                  </p>
                </div>

              </div>
            </div>

            <p className="text-sm text-indigo-200">
              © {new Date().getFullYear()} Brainfriend Global Tech
            </p>
          </div>
        </section>

        {/* ================================================= */}
        {/* REGISTER AREA */}
        {/* ================================================= */}

        <section className="flex w-full flex-1 items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:w-[60%] lg:px-10 xl:px-14 2xl:px-20">

          <div className="w-full max-w-2xl">

            {/* MOBILE TOP */}
            <div className="mb-7 lg:hidden">

              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>

              <div className="mt-7 flex items-center gap-3">

                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100">
                  <Image
                    src="/logo.png"
                    alt="Brainfriend Global Tech"
                    width={56}
                    height={56}
                    priority
                    className="h-12 w-12 object-contain"
                  />
                </div>

                <div>
                  <p className="text-xl font-bold text-gray-900">
                    Brainfriend
                  </p>

                  <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-600">
                    TECH SERVICES
                  </p>
                </div>

              </div>
            </div>

            {/* DESKTOP BACK */}
            <div className="mb-7 hidden lg:block">

              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>

            </div>

            {/* HEADING */}
            <div className="mb-7">

              <p className="mb-2 text-sm font-semibold text-indigo-600">
                Get started
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Create your account
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                Sign up in less than a minute and start
                using Brainfriend Global Tech services.
              </p>

              {/* REFERRAL NOTICE */}
              {form.referralCode && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">

                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                    <Gift className="h-4 w-4 text-indigo-600" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-indigo-700">
                      You were invited to Brainfriend
                    </p>

                    <p className="mt-1 text-xs text-indigo-500">
                      Referral code:{" "}
                      <span className="font-bold">
                        {form.referralCode}
                      </span>
                    </p>
                  </div>

                </div>
              )}

            </div>

            {/* FORM CARD */}
            <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8">

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* FULL NAME */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Full name
                  </label>

                  <div className="relative">

                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="John Doe"
                      value={form.fullName}
                      onChange={handleChange}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Email address
                  </label>

                  <div className="relative">

                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>
                </div>

                {/* PHONE */}
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Phone number
                  </label>

                  <div className="relative">

                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="08012345678"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>
                </div>

                {/* REFERRAL CODE */}
                <div>
                  <label
                    htmlFor="referralCode"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Referral code{" "}
                    <span className="font-normal text-gray-400">
                      (optional)
                    </span>
                  </label>

                  <div className="relative">

                    <Gift className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      id="referralCode"
                      name="referralCode"
                      type="text"
                      autoComplete="off"
                      placeholder="e.g. BF8EFB5DC7"
                      value={form.referralCode}
                      onChange={handleChange}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm uppercase text-gray-900 outline-none transition placeholder:normal-case placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    Enter a referral code if someone invited you.
                  </p>
                </div>

                {/* PASSWORD */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Password
                  </label>

                  <div className="relative">

                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={handleChange}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      disabled={loading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>

                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    Use at least 6 characters.
                  </p>
                </div>

                {/* SUBMIT */}
                <div className="pt-2">
                  <AuthButton
                    text={
                      loading
                        ? "Creating Account..."
                        : "Create Account"
                    }
                  />
                </div>

              </form>

              {/* LOGIN */}
              <div className="mt-7 border-t border-gray-100 pt-6 text-center">

                <p className="text-sm text-gray-500">
                  Already have an account?{" "}

                  <Link
                    href="/login"
                    className="font-semibold text-indigo-600 transition hover:text-indigo-700"
                  >
                    Sign in
                  </Link>
                </p>

              </div>

            </div>

            {/* TERMS */}
            <p className="mx-auto mt-5 max-w-lg text-center text-xs leading-5 text-gray-400">
              By creating an account, you agree to use
              Brainfriend Global Tech responsibly and keep
              your account information secure.
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}

