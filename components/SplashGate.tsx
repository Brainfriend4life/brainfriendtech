"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import SplashScreen from "./SplashScreen";

type SplashGateProps = {
  children: React.ReactNode;
  /**
   * Minimum time (ms) the splash stays visible even if the session
   * check finishes instantly. Prevents a jarring flash on fast
   * connections — the splash should read as a deliberate brand
   * moment, not a loading glitch. Set to 0 to disable.
   */
  minDurationMs?: number;
};

export default function SplashGate({
  children,
  minDurationMs = 600,
}: SplashGateProps) {
  const { status } = useSession();
  const [minTimeElapsed, setMinTimeElapsed] = useState(minDurationMs === 0);

  useEffect(() => {
    if (minDurationMs === 0) return;

    const timer = setTimeout(() => setMinTimeElapsed(true), minDurationMs);
    return () => clearTimeout(timer);
  }, [minDurationMs]);

  const sessionResolved = status !== "loading";
  const showSplash = !sessionResolved || !minTimeElapsed;

  return (
    <>
      {showSplash && <SplashScreen />}
      {/* Keep children mounted underneath so their own effects/data
          fetching can start immediately rather than waiting for the
          splash to unmount — the splash just visually covers them. */}
      <div
        aria-hidden={showSplash}
        className={showSplash ? "invisible" : "visible"}
      >
        {children}
      </div>
    </>
  );
}