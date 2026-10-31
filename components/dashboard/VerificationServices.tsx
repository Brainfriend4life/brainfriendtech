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
  ArrowUpRight,
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
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a service to continue.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          {SERVICES.length} services
        </span>
      </div>

      <div className="grid w-full grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
        {SERVICES.map((service) => {
          const Icon = ICONS[service.icon] ?? CircleHelp;

          return (
            <Link
              key={service.slug}
              href={service.href}
              className="group flex min-w-0 min-h-[154px] flex-col rounded-xl border border-border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.98] sm:min-h-[165px] sm:p-3.5"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:h-9 sm:w-9">
                  <Icon className="h-4 w-4 sm:h-[17px] sm:w-[17px]" strokeWidth={1.8} />
                </span>

                <span className="rounded-full bg-emerald-500/10 px-1.5 py-1 text-[9px] font-semibold text-emerald-600 sm:px-2 sm:text-[10px]">
                  Available
                </span>
              </div>

              <div className="mt-2.5 min-w-0 flex-1 sm:mt-3">
                <h3 className="break-words text-xs font-bold leading-[17px] text-foreground sm:text-[13px] sm:leading-5">
                  {service.title}
                </h3>

                <p className="mt-1 line-clamp-2 break-words text-[10px] leading-[15px] text-muted-foreground sm:text-[11px] sm:leading-[17px]">
                  {service.desc}
                </p>

                {service.slug === "nin" && (
                  <p className="mt-2 text-[11px] font-bold text-primary sm:text-xs">
                    {money(prices["nin-verification"])}
                  </p>
                )}
              </div>

              <div className="mt-2.5 flex min-w-0 items-center justify-between gap-1 border-t border-border/70 pt-2">
                <span className="min-w-0 truncate text-[9px] font-medium text-muted-foreground sm:text-[10px]">
                  {service.label}
                </span>

                <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-primary sm:text-[11px]">
                  Open
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
