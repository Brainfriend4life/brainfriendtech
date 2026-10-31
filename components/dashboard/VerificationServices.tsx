"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IdCard,
  CheckCircle2,
  Fingerprint,
  PencilLine,
  Globe2,
  List,
  ClipboardCheck,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";

import { SERVICES, type ServiceIcon } from "@/lib/services";

const ICONS: Record<ServiceIcon, React.ElementType> = {
  id: IdCard,
  check: CheckCircle2,
  finger: Fingerprint,
  edit: PencilLine,
  globe: Globe2,
  list: List,
  validation: ClipboardCheck,
  shield: ShieldCheck,
};

export default function VerificationServices() {
  const [prices, setPrices] = useState<Record<string, number | null>>({});

  useEffect(() => {
    fetch("/api/verification/ageverify/download", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPrices(data.prices || {}))
      .catch(() => setPrices({}));
  }, []);

  const money = (value: number | null | undefined) =>
    typeof value === "number" && value > 0
      ? `₦${value.toLocaleString("en-NG")}`
      : "Price unavailable";

  return (
    <section className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Verification Services
          </h2>
        </div>

        <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          {SERVICES.length} services
        </span>
      </div>

      <div className="grid w-full grid-cols-3 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {SERVICES.map((service) => {
          const Icon = ICONS[service.icon] ?? CircleHelp;

          return (
            <Link
              key={service.slug}
              href={service.href}
              className="group flex min-w-0 min-h-[125px] flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-3 text-center shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md active:scale-[0.97] sm:min-h-[140px] sm:p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:h-11 sm:w-11">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>

              <div className="mt-3 min-w-0 w-full">
                <h3 className="line-clamp-2 break-words text-[11px] font-bold leading-4 text-foreground sm:text-sm">
                  {service.title}
                </h3>

                {service.slug === "nin" && (
                  <p className="mt-1.5 text-xs font-bold text-primary">
                    {money(prices["nin-verification"])}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
