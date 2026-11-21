"use client";

import { Dumbbell } from "lucide-react";
import { useLeanBulk } from "@/lib/fitness/store";
import { PROGRAM_WEEKS, phaseForWeek, PHASES } from "@/lib/fitness/constants";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const currentWeek = useLeanBulk((s) => s.currentWeek);
  const setWeek = useLeanBulk((s) => s.setWeek);
  const phase = PHASES.find((p) => p.id === phaseForWeek(currentWeek));

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-charcoal-950/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-steel-500/40 bg-gradient-to-br from-steel-600/40 to-charcoal-800 shadow-lg shadow-steel-700/20"
            aria-hidden="true"
          >
            <Dumbbell className="h-5 w-5 text-steel-300" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="bg-gradient-to-r from-steel-200 via-steel-300 to-mint-400 bg-clip-text text-base font-bold leading-tight tracking-tight text-transparent">
              Lean Bulk Studio
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              50kg lifter · 6-week home program
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {phase ? (
            <span
              className="hidden rounded-full border border-steel-500/30 bg-steel-600/15 px-2.5 py-1 text-[11px] font-medium text-steel-300 sm:inline-block"
              title={phase.name}
            >
              Phase {phase.id} · {phase.effort}
            </span>
          ) : null}
          {/* Horizontally scrollable on narrow screens so week selection
              never overflows the header (WCAG 1.4.10 reflow friendly) */}
          <nav
            aria-label="Program week"
            className="scrollbar-hide flex min-w-0 items-center gap-1 overflow-x-auto py-1"
          >
            {Array.from({ length: PROGRAM_WEEKS }, (_, i) => i + 1).map((w) => {
              const active = w === currentWeek;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeek(w)}
                  aria-pressed={active}
                  aria-label={`Week ${w}${active ? " (current)" : ""}`}
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-lg text-xs font-semibold tabular-nums transition-colors",
                    active
                      ? "border border-mint-500/50 bg-mint-500/15 text-mint-400"
                      : "border border-border bg-charcoal-850 text-muted-foreground hover:border-steel-500/40 hover:text-steel-300"
                  )}
                >
                  W{w}
                </button>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
