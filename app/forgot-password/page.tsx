"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(
          data.message ||
            "Unable to process request."
        );
        return;
      }

      toast.success(
        "Password reset link sent to your email."
      );

      setEmail("");
    } catch (error) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        error
      );

      toast.error(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900 dark:shadow-black/30 sm:p-8">

      <h1 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
        Forgot Password
      </h1>

      <p className="mb-8 text-center text-gray-500 dark:text-slate-400">
        Enter your email address and we’ll
        send you a link to reset your password.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        <AuthInput
          label="Email"
          name="email"
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <AuthButton
          text={
            loading
              ? "Sending..."
              : "Send Reset Link"
          }
        />

      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-indigo-600 dark:text-indigo-400"
        >
          Back to Login
        </Link>
      </p>

    </div>
  );
}