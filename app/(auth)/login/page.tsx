
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success("Login successful");

    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

      <h1 className="mb-2 text-center text-3xl font-bold">
        Welcome Back
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Login to your Brainfriend VTU account
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

        <AuthInput
          label="Password"
          name="password"
          type="password"
          placeholder="********"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        {/* FORGOT PASSWORD */}

        <div className="-mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Forgot password?
          </Link>
        </div>

        <AuthButton
          text={
            loading
              ? "Signing In..."
              : "Login"
          }
        />
      </form>

      <p className="mt-6 text-center text-sm">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-indigo-600"
        >
          Register
        </Link>
      </p>

    </div>
  );
}

