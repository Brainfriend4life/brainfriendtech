"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Gift,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const referralCode =
    searchParams.get("ref")?.trim().toUpperCase() || "";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    referralCode,
    password: "",
    confirmPassword: "",
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

  const passwordRequirements = {
    length: form.password.length >= 6,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };

  const strongPassword =
    passwordRequirements.length &&
    passwordRequirements.uppercase &&
    passwordRequirements.lowercase &&
    passwordRequirements.number &&
    passwordRequirements.special;

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      toast.error("Please complete all required fields.");
      return;
    }

    if (!strongPassword) {
      toast.error(
        "Password must contain uppercase, lowercase, number and special character."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
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
      console.error("REGISTER ERROR:", error);

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
    <main
      className="
        min-h-screen
        bg-gradient-to-br
        from-slate-50
        via-white
        to-indigo-50
        px-4 py-6
        transition-colors duration-300
        dark:from-slate-950
        dark:via-slate-950
        dark:to-indigo-950/40
        sm:px-6 sm:py-10
      "
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div
          className="
            grid w-full overflow-hidden rounded-3xl
            border border-gray-200
            bg-white
            shadow-2xl shadow-indigo-100/50
            transition-colors duration-300
            dark:border-slate-800
            dark:bg-slate-900
            dark:shadow-black/30
            lg:grid-cols-2
          "
        >
          {/* ================================================= */}
          {/* LEFT BRAND PANEL */}
          {/* ================================================= */}

          <div
            className="
              relative hidden overflow-hidden
              bg-gradient-to-br
              from-indigo-700 via-indigo-600 to-violet-700
              p-10 text-white
              lg:flex lg:min-h-[680px]
              lg:flex-col lg:justify-between
              xl:p-14
            "
          >
            {/* Decorative circles */}

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />

            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/10" />

            <div className="absolute right-20 top-1/2 h-20 w-20 rounded-full bg-white/5" />

            <div className="relative z-10">
              {/* LOGO */}

              <Link
                href="/"
                className="inline-flex items-center gap-3"
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
                  <Image
                    src="/logo.png"
                    alt="Brainfriend Global Tech"
                    width={56}
                    height={56}
                    priority
                    className="h-full w-full object-contain p-1"
                  />
                </div>

                <div>
                  <p className="text-xl font-bold text-white">
                    Brainfriend
                  </p>

                  <p className="text-xs font-medium tracking-wide text-indigo-200">
                    TECH SERVICES
                  </p>
                </div>
              </Link>

              {/* BRAND CONTENT */}

              <div className="mt-20 max-w-md">
                <div
                  className="
                    mb-6 inline-flex items-center gap-2
                    rounded-full border border-white/20
                    bg-white/10 px-4 py-2
                    text-xs font-semibold
                    text-indigo-100
                    backdrop-blur-sm
                  "
                >
                  <ShieldCheck className="h-4 w-4" />
                  Secure Registration
                </div>

                <h2 className="text-4xl font-bold leading-tight xl:text-5xl">
                  Join Brainfriend,
                  <span className="mt-2 block text-indigo-200">
                    start today.
                  </span>
                </h2>

                <p className="mt-6 text-base leading-7 text-indigo-100">
                  Create your Brainfriend Global Tech
                  account and enjoy fast, secure and
                  reliable digital services.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </div>

                    <span className="text-sm text-indigo-100">
                      Secure account protection
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                      <Check className="h-4 w-4 text-white" />
                    </div>

                    <span className="text-sm text-indigo-100">
                      Fast and reliable transactions
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                      <Gift className="h-4 w-4 text-white" />
                    </div>

                    <span className="text-sm text-indigo-100">
                      Referral rewards available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="relative z-10">
              <p className="text-sm text-indigo-200">
                © {new Date().getFullYear()} Brainfriend Global Tech
              </p>
            </div>
          </div>

          {/* ================================================= */}
          {/* RIGHT REGISTRATION AREA */}
          {/* ================================================= */}

          <div
            className="
              relative flex
              flex-col justify-center
              bg-white
              p-5
              transition-colors duration-300
              dark:bg-slate-900
              sm:p-8
              md:p-10
              lg:p-12
              xl:p-14
            "
          >
            <div className="mx-auto w-full max-w-md">

              {/* ================================================= */}
              {/* BACK TO HOME */}
              {/* ================================================= */}

              <div className="mb-7">
                <Link
                  href="/"
                  className="
                    inline-flex items-center gap-2
                    rounded-xl
                    border border-gray-200
                    bg-white
                    px-4 py-2.5
                    text-sm font-semibold
                    text-gray-700
                    shadow-sm
                    transition
                    hover:border-indigo-200
                    hover:bg-indigo-50
                    hover:text-indigo-600
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-slate-200
                    dark:hover:border-indigo-500/50
                    dark:hover:bg-indigo-950/50
                    dark:hover:text-indigo-300
                  "
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </div>

              {/* ================================================= */}
              {/* MOBILE LOGO */}
              {/* ================================================= */}

              <div className="mb-7 flex items-center gap-3 lg:hidden">
                <div
                  className="
                    flex h-14 w-14
                    items-center justify-center
                    overflow-hidden rounded-2xl
                    bg-white shadow-md
                    ring-1 ring-gray-100
                    dark:bg-slate-800
                    dark:ring-slate-700
                  "
                >
                  <Image
                    src="/logo.png"
                    alt="Brainfriend Global Tech"
                    width={56}
                    height={56}
                    priority
                    className="h-full w-full object-contain p-1"
                  />
                </div>

                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    Brainfriend
                  </p>

                  <p className="text-xs font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
                    TECH SERVICES
                  </p>
                </div>
              </div>

              {/* ================================================= */}
              {/* HEADING */}
              {/* ================================================= */}

              <div className="mb-7">
                <div
                  className="
                    mb-3 inline-flex items-center gap-2
                    rounded-full
                    bg-indigo-50
                    px-3 py-1.5
                    text-xs font-semibold
                    text-indigo-600
                    dark:bg-indigo-950/60
                    dark:text-indigo-300
                  "
                >
                  <User className="h-3.5 w-3.5" />
                  Create Account
                </div>

                <h1
                  className="
                    text-3xl font-bold tracking-tight
                    text-gray-900
                    dark:text-white
                    sm:text-4xl
                  "
                >
                  Create your account
                </h1>

                <p
                  className="
                    mt-3 text-sm leading-6
                    text-gray-500
                    dark:text-slate-400
                    sm:text-base
                  "
                >
                  Register with Brainfriend Global Tech
                  and start using our digital services.
                </p>
              </div>

              {/* ================================================= */}
              {/* REGISTRATION FORM */}
              {/* ================================================= */}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* FULL NAME */}

                <AuthInput
                  label="Full Name"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={handleChange}
                />

                {/* EMAIL */}

                <AuthInput
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                />

                {/* PHONE */}

                <AuthInput
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  placeholder="08012345678"
                  value={form.phone}
                  onChange={handleChange}
                />

                {/* REFERRAL */}

                <div>
                  <label
                    htmlFor="referralCode"
                    className="
                      mb-2 block text-sm font-semibold
                      text-gray-700
                      dark:text-slate-200
                    "
                  >
                    Referral Code{" "}
                    <span className="font-normal text-gray-400">
                      (optional)
                    </span>
                  </label>

                  <div className="relative">
                    <Gift
                      className="
                        pointer-events-none
                        absolute left-4 top-1/2
                        h-5 w-5
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      id="referralCode"
                      name="referralCode"
                      type="text"
                      autoComplete="off"
                      placeholder="e.g. BF8EFB5DC7"
                      value={form.referralCode}
                      onChange={handleChange}
                      disabled={loading}
                      className="
                        h-12 w-full rounded-xl
                        border border-gray-200
                        bg-gray-50
                        pl-12 pr-4
                        text-base uppercase
                        text-gray-900
                        outline-none
                        transition
                        placeholder:normal-case
                        placeholder:text-gray-400
                        focus:border-indigo-500
                        focus:bg-white
                        focus:ring-4
                        focus:ring-indigo-500/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-white
                        dark:placeholder:text-slate-500
                        dark:focus:border-indigo-400
                        sm:h-14
                      "
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Enter a referral code if someone invited you.
                  </p>
                </div>

                {/* ================================================= */}
                {/* PASSWORD */}
                {/* ================================================= */}

                <div>
                  <label
                    htmlFor="password"
                    className="
                      mb-2 block text-sm font-semibold
                      text-gray-700
                      dark:text-slate-200
                    "
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      className="
                        pointer-events-none
                        absolute left-4 top-1/2
                        h-5 w-5
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={handleChange}
                      disabled={loading}
                      className="
                        h-12 w-full rounded-xl
                        border border-gray-200
                        bg-gray-50
                        pl-12 pr-12
                        text-base
                        text-gray-900
                        outline-none
                        transition
                        placeholder:text-gray-400
                        focus:border-indigo-500
                        focus:bg-white
                        focus:ring-4
                        focus:ring-indigo-500/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-white
                        dark:placeholder:text-slate-500
                        dark:focus:border-indigo-400
                        sm:h-14
                      "
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
                      className="
                        absolute right-4 top-1/2
                        -translate-y-1/2
                        text-slate-400
                        transition
                        hover:text-slate-700
                        dark:hover:text-slate-200
                      "
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ================================================= */}
                {/* CONFIRM PASSWORD */}
                {/* ================================================= */}

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="
                      mb-2 block text-sm font-semibold
                      text-gray-700
                      dark:text-slate-200
                    "
                  >
                    Confirm Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      className="
                        pointer-events-none
                        absolute left-4 top-1/2
                        h-5 w-5
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      className={`
                        h-12 w-full rounded-xl
                        border bg-gray-50
                        pl-12 pr-12
                        text-base
                        text-gray-900
                        outline-none
                        transition
                        placeholder:text-gray-400
                        dark:bg-slate-800
                        dark:text-white
                        dark:placeholder:text-slate-500
                        sm:h-14
                        ${
                          form.confirmPassword &&
                          form.password !==
                            form.confirmPassword
                            ? `
                              border-red-400
                              focus:border-red-500
                              focus:ring-4
                              focus:ring-red-500/10
                              dark:border-red-500
                            `
                            : form.confirmPassword &&
                              form.password ===
                                form.confirmPassword
                            ? `
                              border-emerald-400
                              focus:border-emerald-500
                              focus:ring-4
                              focus:ring-emerald-500/10
                              dark:border-emerald-500
                            `
                            : `
                              border-gray-200
                              focus:border-indigo-500
                              focus:bg-white
                              focus:ring-4
                              focus:ring-indigo-500/10
                              dark:border-slate-700
                              dark:focus:border-indigo-400
                            `
                        }
                      `}
                    />

                    <button
                      type="button"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) => !current
                        )
                      }
                      disabled={loading}
                      className="
                        absolute right-4 top-1/2
                        -translate-y-1/2
                        text-slate-400
                        transition
                        hover:text-slate-700
                        dark:hover:text-slate-200
                      "
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {form.confirmPassword && (
                    <p
                      className={`
                        mt-2 text-xs font-medium
                        ${
                          form.password ===
                          form.confirmPassword
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                        }
                      `}
                    >
                      {form.password ===
                      form.confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* ================================================= */}
                {/* PASSWORD REQUIREMENTS */}
                {/* ================================================= */}

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
  <p className="mb-3 text-xs font-bold text-slate-700 dark:text-slate-200">
    Password requirements
  </p>

  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
    {[
      {
        label: "At least 6 characters",
        valid: passwordRequirements.length,
      },
      {
        label: "Uppercase letter",
        valid: passwordRequirements.uppercase,
      },
      {
        label: "Lowercase letter",
        valid: passwordRequirements.lowercase,
      },
      {
        label: "Number",
        valid: passwordRequirements.number,
      },
      {
        label: "Special character",
        valid: passwordRequirements.special,
      },
    ].map((item) => (
      <div
        key={item.label}
        className="flex min-w-0 items-center gap-2"
      >
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            item.valid
              ? "bg-emerald-500"
              : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          {item.valid && (
            <Check className="h-3 w-3 text-white" />
          )}
        </div>

        <span
          className={`truncate text-xs ${
            item.valid
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {item.label}
        </span>
      </div>
    ))}
  </div>
</div>

                {/* ================================================= */}
                {/* CREATE ACCOUNT */}
                {/* ================================================= */}

                <div className="pt-1">
                  <AuthButton
                    text={
                      loading
                        ? "Creating Account..."
                        : "Create Account"
                    }
                  />
                </div>
              </form>

              {/* ================================================= */}
              {/* LOGIN LINK */}
              {/* ================================================= */}

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />

                <span
                  className="
                    whitespace-nowrap
                    text-[10px] font-semibold
                    tracking-wider
                    text-gray-400
                    dark:text-slate-500
                  "
                >
                  ALREADY A MEMBER?
                </span>

                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
              </div>

              <p className="text-center text-sm text-gray-600 dark:text-slate-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="
                    font-bold
                    text-indigo-600
                    transition
                    hover:text-indigo-700
                    dark:text-indigo-400
                    dark:hover:text-indigo-300
                  "
                >
                  Sign in
                </Link>
              </p>

              {/* ================================================= */}
              {/* FOOTER */}
              {/* ================================================= */}

              <p
                className="
                  mt-7 text-center
                  text-xs leading-5
                  text-gray-400
                  dark:text-slate-500
                "
              >
                By creating an account, you agree to use
                Brainfriend Global Tech responsibly and
                keep your account information secure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main
          className="
            flex min-h-screen
            items-center justify-center
            bg-slate-50
            dark:bg-slate-950
          "
        >
          <div
            className="
              text-sm font-medium
              text-slate-500
              dark:text-slate-400
            "
          >
            Loading registration...
          </div>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}