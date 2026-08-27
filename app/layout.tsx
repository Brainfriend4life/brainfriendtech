import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AuthProvider from "@/components/providers/AuthProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";
import UpdatePrompt from "@/components/pwa/UpdatePrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://brainfriendglobaltech.vercel.app"
  ),

  verification: {
    google:
      "AQIBWSH6BimsTbJT4tNXn0f_At6RIL6JRwKV-GymDdQ",
  },

  title: {
    default:
      "Brainfriend Global Tech | Fast & Reliable NIN Verification/VTU Platform",
    template: "%s | Brainfriend Global Tech",
  },

  description:
    "Brainfriend Global Tech is a fast and reliable Nigerian VTU platform for NIN verification, airtime, data bundles, electricity tokens, cable TV subscriptions, WAEC, NECO, JAMB and CBT services.",

  keywords: [
    "Brainfriend Global Tech",
    "VTU Nigeria",
    "VTU platform Nigeria",
    "buy data Nigeria",
    "cheap data Nigeria",
    "buy airtime Nigeria",
    "NIN verification Nigeria",
    "electricity bill payment Nigeria",
    "electricity token Nigeria",
    "DSTV subscription Nigeria",
    "GOtv subscription Nigeria",
    "Startimes subscription Nigeria",
    "WAEC PIN Nigeria",
    "NECO PIN Nigeria",
    "JAMB PIN Nigeria",
    "CBT practice Nigeria",
    "online VTU",
    "digital services Nigeria",
  ],

  applicationName: "Brainfriend Global Tech",

  authors: [
    {
      name: "Brainfriend Global Tech",
      url: "https://brainfriendglobaltech.vercel.app",
    },
  ],

  creator: "Brainfriend Global Tech",
  publisher: "Brainfriend Global Tech",

  alternates: {
    canonical:
      "https://brainfriendglobaltech.vercel.app",
  },

  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://brainfriendglobaltech.vercel.app",
    siteName: "Brainfriend Global Tech",

    title:
      "Brainfriend Global Tech | Fast & Reliable NIN Verification/VTU Platform",

    description:
      "Buy airtime and data, verify NIN, pay electricity bills, renew cable TV subscriptions and access WAEC, NECO, JAMB and CBT services on Brainfriend Global Tech.",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Brainfriend Global Tech - Fast and Reliable NIN Verification/VTU Platform",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "Brainfriend Global Tech | Fast & Reliable NIN Verification/VTU Platform",

    description:
      "Fast and reliable NIN Verification/VTU services in Nigeria including airtime, data, NIN verification, electricity, cable TV and examination services.",

    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-NG"
      // Required because next-themes sets the "dark" class / color-scheme
      // on <html> on the client before React hydrates, based on
      // localStorage or system preference. Without this, React logs a
      // hydration warning even though the mismatch is intentional and
      // handled by next-themes.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>

          <Toaster position="top-right" />
          <UpdatePrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}