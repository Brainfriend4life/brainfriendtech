
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Zap,
  Wallet,
  Headphones,
  Smartphone,
  ArrowRight,
} from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white">

        {/* ===================================================== */}
        {/* HERO */}
        {/* ===================================================== */}

        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50">
          <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:px-8 lg:py-28">

            <div className="mx-auto max-w-3xl text-center">

              <p className="mb-4 font-semibold uppercase tracking-wider text-indigo-600">
                About Us
              </p>

              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Making Digital Services
                <span className="block text-indigo-600">
                  Simple, Fast & Reliable
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
                Brainfriend Global Tech is a Nigerian digital services
                platform created to make essential digital services
                easier, faster and more accessible.
              </p>

            </div>
          </div>
        </section>


        {/* ===================================================== */}
        {/* ABOUT US */}
        {/* ===================================================== */}

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">

          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

            {/* PICTURE */}

            <div className="relative mx-auto w-full max-w-lg">

              <div className="absolute -inset-4 rounded-3xl bg-indigo-100 blur-2xl opacity-60" />

              <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-200">

                <Image
                  src="/founder.jpg"
                  alt="Emmanuel - Founder of Brainfriend Global Tech"
                  width={600}
                  height={700}
                  priority
                  className="h-auto w-full object-cover"
                />

              </div>

            </div>


            {/* CONTENT */}

            <div>

              <p className="mb-3 font-semibold uppercase tracking-wide text-indigo-600">
                Who We Are
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                About Brainfriend Global Tech
              </h2>

              <p className="mt-6 text-lg leading-8 text-gray-600">
                Brainfriend Global Tech is a Nigerian digital services
                platform built to make everyday digital transactions
                easier and more convenient.
              </p>

              <p className="mt-5 text-lg leading-8 text-gray-600">
                From buying data and airtime to paying electricity
                bills, renewing cable TV subscriptions, accessing NIN
                verification services and handling educational needs,
                our goal is to bring essential digital services together
                on one reliable platform.
              </p>

              <p className="mt-5 text-lg leading-8 text-gray-600">
                We believe technology should solve real problems. That
                belief continues to guide the way we build our platform,
                improve our services and serve our customers.
              </p>

            </div>

          </div>

        </section>


        {/* ===================================================== */}
        {/* OUR STORY */}
        {/* ===================================================== */}

        <section className="bg-gray-50">

          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">

            <div className="mx-auto max-w-3xl text-center">

              <p className="font-semibold uppercase tracking-wide text-indigo-600">
                Our Story
              </p>

              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                Built With a Simple Purpose
              </h2>

              <p className="mt-6 text-lg leading-8 text-gray-600">
                Brainfriend Global Tech was created with a simple
                vision: to make essential digital services available
                to people whenever and wherever they need them.
              </p>

              <p className="mt-5 text-lg leading-8 text-gray-600">
                We understand that everyday transactions should not
                be stressful. Our platform brings multiple services
                together so customers can complete their transactions
                conveniently from one place.
              </p>

              <p className="mt-5 text-lg leading-8 text-gray-600">
                As we continue to grow, we remain focused on improving
                our technology, expanding our services and creating
                better experiences for our customers.
              </p>

            </div>

          </div>

        </section>


        {/* ===================================================== */}
        {/* WHAT WE DO */}
        {/* ===================================================== */}

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">

          <div className="mx-auto max-w-3xl text-center">

            <p className="font-semibold uppercase tracking-wide text-indigo-600">
              What We Do
            </p>

            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
              Digital Services in One Place
            </h2>

            <p className="mt-5 text-lg leading-8 text-gray-600">
              We provide convenient digital and VTU services designed
              to make everyday transactions easier.
            </p>

          </div>


          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {[
              "Data subscriptions across major Nigerian networks",
              "Airtime top-up",
              "Electricity bill and token payments",
              "DSTV, GOtv and Startimes subscriptions",
              "NIN verification services",
              "WAEC, NECO and JAMB-related services",
              "CBT and educational services",
              "Other convenient digital and VTU services",
            ].map((service) => (
              <div
                key={service}
                className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                <p className="font-medium leading-6 text-gray-700">
                  {service}
                </p>
              </div>
            ))}

          </div>

        </section>


        {/* ===================================================== */}
        {/* WHY CHOOSE US */}
        {/* ===================================================== */}

        <section className="bg-indigo-600">

          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">

            <div className="mx-auto max-w-3xl text-center text-white">

              <p className="font-semibold uppercase tracking-wide text-indigo-200">
                Why Choose Us
              </p>

              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Built Around Your Convenience
              </h2>

              <p className="mt-5 text-lg leading-8 text-indigo-100">
                We focus on providing a simple, reliable and convenient
                experience every time you use Brainfriend Global Tech.
              </p>

            </div>


            <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {/* FAST */}

              <div className="rounded-2xl bg-white p-7 shadow-lg">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                  <Zap className="h-6 w-6 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  Fast & Convenient
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  Complete your digital transactions quickly without
                  unnecessary stress or complicated processes.
                </p>

              </div>


              {/* RELIABLE */}

              <div className="rounded-2xl bg-white p-7 shadow-lg">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                  <ShieldCheck className="h-6 w-6 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  Reliable Services
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  We work continuously to provide dependable services
                  and a smooth transaction experience.
                </p>

              </div>


              {/* AFFORDABLE */}

              <div className="rounded-2xl bg-white p-7 shadow-lg">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                  <Wallet className="h-6 w-6 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  Affordable Pricing
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  We strive to provide competitive prices and good
                  value for the services you use.
                </p>

              </div>


              {/* EASY */}

              <div className="rounded-2xl bg-white p-7 shadow-lg">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                  <Smartphone className="h-6 w-6 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  Easy to Use
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  Our platform is designed to be simple and easy to
                  navigate on both phones and computers.
                </p>

              </div>


              {/* SUPPORT */}

              <div className="rounded-2xl bg-white p-7 shadow-lg">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                  <Headphones className="h-6 w-6 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  Customer Focused
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  Our customers are at the heart of what we do. We
                  listen, improve and provide support when needed.
                </p>

              </div>


              {/* ALL IN ONE */}

              <div className="rounded-2xl bg-white p-7 shadow-lg">

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                  <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  Multiple Services
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  Access several essential digital services from one
                  convenient platform.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ===================================================== */}
        {/* FOUNDER */}
        {/* ===================================================== */}

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">

          <div className="grid items-center gap-12 rounded-3xl bg-gray-50 p-8 sm:p-12 lg:grid-cols-[0.8fr_1.2fr] lg:p-16">

            {/* FOUNDER IMAGE */}

            <div className="flex justify-center">

              <div className="overflow-hidden rounded-3xl shadow-xl ring-1 ring-gray-200">

                <Image
                  src="/founder.jpg"
                  alt="Emmanuel, Founder of Brainfriend Global Tech"
                  width={450}
                  height={550}
                  className="h-auto w-full max-w-sm object-cover"
                />

              </div>

            </div>


            {/* FOUNDER CONTENT */}

            <div>

              <p className="font-semibold uppercase tracking-wide text-indigo-600">
                Meet the Founder
              </p>

              <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
                Odjuvwederhie Emmanuel Oghenevovwero
              </h2>

              <p className="mt-2 text-lg font-medium text-indigo-600">
                Founder, Brainfriend Global Tech</p>
                <p className="font-bold">Fullstack Dev /Nextjs /React /Typescript /Javascript / Tailwind CSS
              </p>

              <p className="mt-6 text-lg leading-8 text-gray-600">
                Brainfriend Global Tech was founded with the vision of
                building a technology-driven platform that makes
                essential digital services easier and more accessible
                to Nigerians.
              </p>

              <p className="mt-5 text-lg leading-8 text-gray-600">
                With a passion for technology, digital solutions and
                creating useful services, the journey continues with
                a commitment to building a trusted digital services
                brand.
              </p>

              <p className="mt-5 text-lg font-medium leading-8 text-gray-900">
                “Our goal is simple: To build technology that solves
                real problems and makes everyday life easier.”
              </p>

            </div>

          </div>

        </section>


        {/* ===================================================== */}
        {/* MISSION & VISION */}
        {/* ===================================================== */}

        <section className="bg-gray-50">

          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">

            <div className="grid gap-8 md:grid-cols-2">

              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-200 sm:p-10">

                <h2 className="text-2xl font-bold text-gray-900">
                  Our Mission
                </h2>

                <p className="mt-5 text-lg leading-8 text-gray-600">
                  To provide fast, reliable, affordable and accessible
                  digital services while continuously improving the
                  technology and customer experience behind them.
                </p>

              </div>


              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-200 sm:p-10">

                <h2 className="text-2xl font-bold text-gray-900">
                  Our Vision
                </h2>

                <p className="mt-5 text-lg leading-8 text-gray-600">
                  To become a trusted and widely recognized digital
                  services platform in Nigeria, providing convenient
                  technology solutions that people can rely on every day.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ===================================================== */}
        {/* LOCATION */}
        {/* ===================================================== */}

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">

          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-white shadow-xl sm:p-12">

            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">

              <div>

                <p className="font-semibold uppercase tracking-wide text-indigo-200">
                  Our Location
                </p>

                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                  Proudly Nigerian 🇳🇬
                </h2>

                <div className="mt-5 flex items-start gap-3">

                  <MapPin className="mt-1 h-6 w-6 shrink-0 text-indigo-200" />

                  <div>

                    <p className="text-lg font-semibold">
                      Brainfriend Global Tech
                    </p>

                    <p className="mt-1 text-indigo-100">
                      Port Harcourt, Rivers State, Nigeria
                    </p>

                  </div>

                </div>

              </div>


              <div className="max-w-md">

                <p className="leading-7 text-indigo-100">
                  We are proudly Nigerian and focused on providing
                  digital services that meet the everyday needs of
                  customers across Nigeria.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ===================================================== */}
        {/* CTA */}
        {/* ===================================================== */}

        <section className="border-t border-gray-100 bg-white">

          <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-8 lg:py-24">

            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Ready to Get Started?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Whether you need data, airtime, electricity payment,
              cable TV renewal, NIN services or educational services,
              Brainfriend Global Tech is here to make the process easier.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

              <Link href="/register">
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition hover:bg-indigo-700 sm:w-auto">
                  Create an Account
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>

              <Link href="/contact">
                <button className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto">
                  Contact Us
                </button>
              </Link>

            </div>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

