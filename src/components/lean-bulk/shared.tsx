"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-steel-500/30 bg-steel-600/15">
          <Icon className="h-4 w-4 text-steel-300" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight text-steel-200">
            {title}
          </h2>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function TipCallout({
  children,
  variant = "mint",
}: {
  children: React.ReactNode;
  variant?: "mint" | "steel";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-xs leading-relaxed",
        variant === "mint"
          ? "border-mint-500/30 bg-mint-500/10 text-mint-300"
          : "border-steel-500/30 bg-steel-600/10 text-steel-200"
      )}
    >
      {children}
    </div>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone = "steel",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: "steel" | "mint";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "mint"
          ? "border-mint-500/30 bg-mint-500/10"
          : "border-border/70 bg-charcoal-850"
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon
          className={cn("h-3.5 w-3.5", tone === "mint" ? "text-mint-400" : "text-steel-400")}
          aria-hidden="true"
        />
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            tone === "mint" ? "text-mint-400 text-glow-mint" : "text-steel-200"
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-xs font-medium text-muted-foreground">{unit}</span>
        ) : null}
      </div>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
