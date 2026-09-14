
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [success, setSuccess] =
    useState(false);

  const [message, setMessage] = useState(
    "Verifying your email..."
  );

  useEffect(() => {
    async function verifyEmail() {
      try {
        const params =
          new URLSearchParams(
            window.location.search
          );

        const token =
          params.get("token");

        if (!token) {
          setMessage(
            "Verification token is missing."
          );
          setLoading(false);
          return;
        }

        const response =
          await fetch(
            `/api/auth/verify-email?token=${encodeURIComponent(
              token
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setMessage(
            data.message ||
              "Email verification failed."
          );
          setLoading(false);
          return;
        }

        setSuccess(true);

        setMessage(
          data.message ||
            "Email verified successfully."
        );

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch (error) {
        console.error(
          "EMAIL VERIFICATION ERROR:",
          error
        );

        setMessage(
          "Something went wrong while verifying your email."
        );
      } finally {
        setLoading(false);
      }
    }

    verifyEmail();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg dark:bg-slate-900">

        <div className="mb-6 text-4xl">
          {loading
            ? "⏳"
            : success
            ? "✅"
            : "❌"}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {loading
            ? "Verifying Email"
            : success
            ? "Email Verified"
            : "Verification Failed"}
        </h1>

        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {message}
        </p>

        {!loading && success && (
          <>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
              Redirecting you to the login page...
            </p>

            <Link
              href="/login"
              className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Go to Login
            </Link>
          </>
        )}

        {!loading && !success && (
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-gray-800 px-6 py-3 font-semibold text-white transition hover:bg-gray-900"
          >
            Back to Login
          </Link>
        )}

      </div>
    </main>
  );
}

