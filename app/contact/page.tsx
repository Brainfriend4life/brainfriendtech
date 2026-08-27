"use client";

import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Send,
  Clock,
} from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const email = formData.get("email");
    const subject = formData.get("subject");
    const userMessage = formData.get("message");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to send message."
        );
      }

      setMessage(
        "Your message has been sent successfully. We will get back to you shortly."
      );

      form.reset();
    } catch (error) {
      console.error("CONTACT ERROR:", error);

      setMessage(
        "Unable to send your message right now. Please try again or contact us directly."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      {/* ===================================================== */}
      {/* HERO */}
      {/* ===================================================== */}

      <section className="bg-indigo-700 px-4 py-16 text-white dark:bg-indigo-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-200">
            Brainfriend Global Tech
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
            Contact Brainfriend Global Tech
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
            Have a question, need help with a transaction, or want to
            learn more about our services? We are here to help.
          </p>
        </div>
      </section>

      {/* ===================================================== */}
      {/* CONTACT CONTENT */}
      {/* ===================================================== */}

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {/* ================================================= */}
          {/* CONTACT INFORMATION */}
          {/* ================================================= */}

          <div className="space-y-5 lg:col-span-1">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Support
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Get in Touch
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                Our support team is available to assist you with your
                Brainfriend Global Tech account and transactions.
              </p>
            </div>

            {/* EMAIL */}

            <a
              href="mailto:brainfriendglobaltech@gmail.com"
              className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-800"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Mail className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Email
                </p>

                <p className="mt-1 break-all text-sm text-gray-600 transition group-hover:text-indigo-600 dark:text-gray-400 dark:group-hover:text-indigo-400">
                  brainfriendglobaltech@gmail.com
                </p>
              </div>
            </a>

            {/* PHONE */}

            <a
              href="tel:+2348143542037"
              className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-800"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Phone className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Phone
                </p>

                <p className="mt-1 text-sm text-gray-600 transition group-hover:text-indigo-600 dark:text-gray-400 dark:group-hover:text-indigo-400">
                  +2348143542037
                </p>
              </div>
            </a>

            {/* WHATSAPP */}

            <a
              href="https://wa.me/2348143542037"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-green-900"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                <MessageCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  WhatsApp
                </p>

                <p className="mt-1 text-sm text-gray-600 transition group-hover:text-green-600 dark:text-gray-400 dark:group-hover:text-green-400">
                  Chat with us on WhatsApp
                </p>
              </div>
            </a>

            {/* LOCATION */}

            <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <MapPin className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Location
                </p>

                <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">
                  Port Harcourt, Rivers State, Nigeria
                </p>
              </div>
            </div>

            {/* SUPPORT HOURS */}

            <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Clock className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Support Hours
                </p>

                <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">
                  Monday - Saturday
                  <br />
                  8:00 AM - 8:00 PM
                </p>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* CONTACT FORM */}
          {/* ================================================= */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-7 lg:col-span-2">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Send a Message
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Send Us a Message
              </h2>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Fill out the form below and our team will get back to
                you.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* NAME */}

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Full Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-950"
                />
              </div>

              {/* EMAIL */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-950"
                />
              </div>

              {/* SUBJECT */}

              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Subject
                </label>

                <select
                  id="subject"
                  name="subject"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-950"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select a subject
                  </option>

                  <option value="Transaction Issue">
                    Transaction Issue
                  </option>

                  <option value="Payment Issue">
                    Payment Issue
                  </option>

                  <option value="Account Issue">
                    Account Issue
                  </option>

                  <option value="VTU Service">
                    VTU Service
                  </option>

                  <option value="General Enquiry">
                    General Enquiry
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* MESSAGE */}

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Message
                </label>

                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Tell us how we can help you..."
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-950"
                />
              </div>

              {/* RESPONSE MESSAGE */}

              {message && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    message.includes("successfully")
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400"
                      : "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Send className="h-4 w-4" />

                {loading
                  ? "Sending..."
                  : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* QUICK HELP */}
      {/* ===================================================== */}

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center dark:border-indigo-900/50 dark:bg-indigo-950/40 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Quick Access
          </p>

          <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Need to make a transaction?
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-400">
            Buy airtime, data, pay electricity bills, renew cable
            subscriptions and purchase exam PINs from your
            Brainfriend Global Tech account.
          </p>

          <Link
            href="/register"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Create an Account
          </Link>
        </div>
      </section>
    </main>
  );
}