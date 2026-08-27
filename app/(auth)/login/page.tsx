
"use client";

import Image from "next/image";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Welcome back!");

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      toast.error("Something went wrong. Please try again.");
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
          {/* LEFT BRAND PANEL - DESKTOP */}
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
            {/* Decorative shapes */}

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
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-indigo-100 backdrop-blur-sm">
                  <LockKeyhole className="h-4 w-4" />
                  Secure Login
                </div>

                <h2 className="text-4xl font-bold leading-tight xl:text-5xl">
                  Everything you need,
                  <span className="mt-2 block text-indigo-200">
                    in one place.
                  </span>
                </h2>

                <p className="mt-6 text-base leading-7 text-indigo-100">
                  Buy airtime, data, electricity and
                  other digital services quickly and
                  securely with Brainfriend Global Tech.
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
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </div>

                    <span className="text-sm text-indigo-100">
                      Fast and reliable transactions
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
          {/* RIGHT LOGIN AREA */}
          {/* ================================================= */}

          <div
            className="
              relative flex min-h-[680px]
              flex-col justify-center
              bg-white
              p-5
              transition-colors duration-300
              dark:bg-slate-900
              sm:p-8 md:p-10 lg:p-12 xl:p-16
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

              <div className="mb-8 flex items-center gap-3 lg:hidden">
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

              <div className="mb-8">
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
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Secure Login
                </div>

                <h1
                  className="
                    text-3xl font-bold tracking-tight
                    text-gray-900
                    dark:text-white
                    sm:text-4xl
                  "
                >
                  Welcome back
                </h1>

                <p
                  className="
                    mt-3 text-sm leading-6
                    text-gray-500
                    dark:text-slate-400
                    sm:text-base
                  "
                >
                  Sign in to your Brainfriend Global Tech
                  account and continue where you left off.
                </p>
              </div>

              {/* ================================================= */}
              {/* LOGIN FORM */}
              {/* ================================================= */}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <AuthInput
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />

                <AuthInput
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />

                {/* FORGOT PASSWORD */}

                <div className="flex justify-end pt-1">
                  <Link
                    href="/forgot-password"
                    className="
                      text-sm font-semibold
                      text-indigo-600
                      transition
                      hover:text-indigo-700
                      dark:text-indigo-400
                      dark:hover:text-indigo-300
                    "
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* LOGIN BUTTON */}

                <AuthButton
                  text={
                    loading
                      ? "Signing In..."
                      : "Sign In"
                  }
                />
              </form>

              {/* ================================================= */}
              {/* REGISTER DIVIDER */}
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
                  NEW TO BRAINFRIEND?
                </span>

                <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
              </div>

              {/* REGISTER LINK */}

              <p className="text-center text-sm text-gray-600 dark:text-slate-400">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="
                    font-bold
                    text-indigo-600
                    transition
                    hover:text-indigo-700
                    dark:text-indigo-400
                    dark:hover:text-indigo-300
                  "
                >
                  Create an account
                </Link>
              </p>

              {/* FOOTER */}

              <p
                className="
                  mt-8 text-center
                  text-xs leading-5
                  text-gray-400
                  dark:text-slate-500
                "
              >
                By signing in, you agree to use
                Brainfriend Global Tech responsibly and
                securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

