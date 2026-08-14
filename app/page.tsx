
import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import Features from "@/components/home/Features";
import HowItWorks from "@/components/home/HowItWorks";
import Stats from "@/components/home/Stats";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title:
    "Brainfriend Global Tech | Fast & Reliable VTU Services in Nigeria",

  description:
    "Brainfriend Global Tech provides fast and reliable VTU services in Nigeria, including data, airtime, NIN verification, electricity bill payment, cable TV subscriptions and examination services.",

  keywords: [
    "Brainfriend Global Tech",
    "VTU Nigeria",
    "VTU services Nigeria",
    "buy data Nigeria",
    "buy airtime Nigeria",
    "NIN verification Nigeria",
    "electricity bill payment Nigeria",
    "cable TV subscription Nigeria",
    "WAEC PIN Nigeria",
    "NECO PIN Nigeria",
    "JAMB PIN Nigeria",
    "online VTU platform",
    "cheap data Nigeria",
    "digital services Nigeria",
  ],

  alternates: {
    canonical: "https://brainfriendglobaltech.vercel.app",
  },

  openGraph: {
    title:
      "Brainfriend Global Tech | Fast & Reliable VTU Services in Nigeria",

    description:
      "Access fast and reliable data, airtime, NIN verification, electricity, cable TV and examination services in Nigeria.",

    url: "https://brainfriendglobaltech.vercel.app",

    siteName: "Brainfriend Global Tech",

    type: "website",

    locale: "en_NG",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Brainfriend Global Tech - Fast & Reliable VTU Services",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "Brainfriend Global Tech | Fast & Reliable VTU Services in Nigeria",

    description:
      "Fast and reliable VTU services in Nigeria including data, airtime, NIN verification, electricity, cable TV and examination services.",

    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}

