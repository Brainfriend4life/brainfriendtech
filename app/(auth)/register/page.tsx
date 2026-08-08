"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import AuthInput from "@/components/auth/AuthInput";
import AuthButton from "@/components/auth/AuthButton";

export default function RegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await axios.post(
        "/api/auth/register",
        form
      );

      alert(res.data.message);

      router.push("/login");
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <h1 className="mb-6 text-center text-3xl font-bold">
        Create Account
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <AuthInput
          label="Full Name"
          name="fullName"
          type="text"
          placeholder="John Doe"
          value={form.fullName}
          onChange={handleChange}
        />

        <AuthInput
          label="Email"
          name="email"
          type="email"
          placeholder="example@email.com"
          value={form.email}
          onChange={handleChange}
        />

        <AuthInput
          label="Phone"
          name="phone"
          type="tel"
          placeholder="08012345678"
          value={form.phone}
          onChange={handleChange}
        />

        <AuthInput
          label="Password"
          name="password"
          type="password"
          placeholder="********"
          value={form.password}
          onChange={handleChange}
        />

        <AuthButton
          text={
            loading
              ? "Creating..."
              : "Create Account"
          }
        />
      </form>
    </div>
  );
}