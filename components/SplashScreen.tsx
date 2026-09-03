"use client";

import Image from "next/image";

/**
 * Pure presentational splash screen. Shown while auth/session status
 * is still resolving — see SplashGate for the logic that decides
 * when to mount/unmount this.
 *
 * Design language is pulled from the logo itself: dark charcoal
 * ground (matching the logo's own backdrop), the blue/gold circuit
 * motif as the single animated accent, rather than a generic
 * gradient + spinner treatment.
 */
export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#12141c] px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading Brainfriend"
    >
      {/* Faint circuit grid, full-bleed background texture — quiet, not competing with the logo */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M0 120 H140 V220 H260 V90 H400 M0 420 H90 V520 H220 V680 H400 M0 620 H180 V760 H400"
          stroke="#7C8CF8"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      <div className="relative flex flex-col items-center">
        {/* LOGO CARD */}
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[26px] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <Image
            src="/icons/icon-512.png"
            alt="Brainfriend"
            width={76}
            height={76}
            className="rounded-2xl"
            priority
          />
        </div>

        {/* NAME + TAGLINE */}
        <div className="mt-7 space-y-2 text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-white">
            BF Global Tech Brainfriend
          </h1>
          <p className="max-w-[240px] text-[13px] leading-5 text-slate-400">
            Fast, reliable VTU platform and NIN verification
          </p>
        </div>

        {/* CIRCUIT TRACE LOADER — echoes the logo's own circuit lines
            as the single load indicator, instead of a generic spinner */}
        <svg
          aria-hidden="true"
          className="mt-8"
          width="120"
          height="28"
          viewBox="0 0 120 28"
        >
          <path
            d="M4 14 H36 L46 4 H74 L84 24 H116"
            fill="none"
            stroke="#2A2E3D"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 14 H36 L46 4 H74 L84 24 H116"
            fill="none"
            stroke="#F5B942"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="34 200"
            className="animate-[circuit-trace_1.6s_ease-in-out_infinite]"
          />
          {/* Node dots at the two circuit joints, matching the logo's connector style */}
          <circle cx="46" cy="4" r="3" fill="#3B82F6" />
          <circle cx="84" cy="24" r="3" fill="#3B82F6" />
        </svg>
      </div>

      <style>{`
        @keyframes circuit-trace {
          0% { stroke-dashoffset: 234; }
          60% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -234; }
        }
      `}</style>
    </div>
  );
}