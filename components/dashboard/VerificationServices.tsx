"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IdCard, CheckCircle2, Fingerprint, PencilLine, Globe2,
  List, ClipboardCheck, ShieldCheck, CircleHelp, ArrowUpRight,
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
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setPrices(data.prices || {}))
      .catch(() => setPrices({}));
  }, []);

  const money = (value: number | null | undefined) =>
    typeof value === "number" && value > 0
      ? `₦${value.toLocaleString("en-NG")}`
      : "Price unavailable";

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Verification Services
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Select a service to continue.
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {SERVICES.length} services
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SERVICES.map((service) => {
          const Icon = ICONS[service.icon] ?? CircleHelp;

          return (
            <Link
              key={service.slug}
              href={service.href}
              className="group relative flex min-h-[142px] flex-col rounded-xl border border-border bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </span>

                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                  Available
                </span>
              </div>

              <div className="mt-3 flex-1">
                <h3 className="text-[13px] font-semibold leading-5 text-foreground">
                  {service.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-[17px] text-muted-foreground">
                  {service.desc}
                </p>

                {service.slug === "nin" && (
                  <p className="mt-2 text-xs font-bold text-primary">
                    {money(prices["nin-verification"])}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {service.label}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                  Open
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
