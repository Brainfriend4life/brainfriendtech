"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {

  const { resolvedTheme, setTheme } = useTheme();

  // next-themes can't know the real theme on the server (it depends on
  // localStorage / system preference), so we render a neutral placeholder
  // until mounted to avoid a hydration mismatch flash.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="h-10 w-10 rounded-full border-2 border-border bg-muted"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-muted text-foreground shadow-sm transition-colors hover:border-indigo-500 hover:bg-indigo-600 hover:text-white"
    >
      {
        isDark
        ? <Sun className="h-5 w-5" strokeWidth={2.5} />
        : <Moon className="h-5 w-5" strokeWidth={2.5} />
      }
    </button>
  );

}