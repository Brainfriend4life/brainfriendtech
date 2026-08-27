import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      <div className="min-h-screen w-full">
        <div className="mx-auto w-full max-w-[1100px]">
          {children}
        </div>
      </div>
    </main>
  );
}