import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Left Side */}
        <div className="hidden lg:flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-bold leading-tight">
            Brainfriend Global Tech
          </h1>

          <p className="mt-6 max-w-md text-lg text-indigo-100">
            Buy Airtime, Data, Electricity, Cable TV subscriptions,
            WAEC, NECO and more with speed, security and reliability.
          </p>

          <div className="mt-10 space-y-4">
            <div>✅ Instant Transactions</div>
            <div>✅ Secure Payments</div>
            <div>✅ 24/7 Availability</div>
            <div>✅ Affordable Prices</div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center justify-center p-6">
          {children}
        </div>

      </div>
    </main>
  );
}