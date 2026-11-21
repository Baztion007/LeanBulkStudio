"use client";

import { Timer } from "lucide-react";
import { useLeanBulk } from "@/lib/fitness/store";
import {
  REST_PRESETS,
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  REST_SECONDS_STEP,
} from "@/lib/fitness/constants";
import { SectionHeading } from "./shared";
import { cn } from "@/lib/utils";

/**
 * Tools → Rest Timer. One optional override replaces the per-routine defaults
 * set in the Program Builder. The value rides the persisted store (and cloud
 * snapshots), so it survives reloads and follows you to other devices.
 */
export function RestTimerCard() {
  const restOverrideSec = useLeanBulk((s) => s.restOverrideSec);
  const setRestOverride = useLeanBulk((s) => s.setRestOverride);
  const routineA = useLeanBulk((s) => s.routines.A);
  const routineB = useLeanBulk((s) => s.routines.B);

  const active = restOverrideSec;

  const step = (delta: number) => {
    const base = active ?? routineA.restSeconds;
    setRestOverride(Math.min(REST_SECONDS_MAX, Math.max(REST_SECONDS_MIN, base + delta)));
  };

  return (
    <section aria-label="Rest timer settings">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <SectionHeading
          icon={Timer}
          title="Rest Timer"
          subtitle={
            active
              ? `Custom rest between sets: ${active}s on both routines`
              : `Defaults: ${routineA.shortName} ${routineA.restSeconds}s · ${routineB.shortName} ${routineB.restSeconds}s`
          }
        />

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Tap the timer chip on any set to start the countdown. Set one custom
          duration below to replace the program defaults, or keep them as
          designed.
        </p>

        {/* Quick presets */}
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Rest duration presets"
        >
          {REST_PRESETS.map((sec) => {
            const isActive = active === sec;
            return (
              <button
                key={sec}
                type="button"
                aria-pressed={isActive}
                onClick={() => setRestOverride(sec)}
                className={cn(
                  "min-h-[40px] rounded-lg border px-3 text-xs font-bold tabular-nums transition",
                  isActive
                    ? "border-mint-500/50 bg-mint-500/15 text-mint-400"
                    : "border-border bg-charcoal-850 text-steel-300 hover:border-steel-500/50 hover:text-steel-200"
                )}
              >
                {sec}s
              </button>
            );
          })}
        </div>

        {/* Fine-tune stepper + defaults */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => step(-REST_SECONDS_STEP)}
              disabled={active !== null && active <= REST_SECONDS_MIN}
              aria-label="Decrease rest by 15 seconds"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-charcoal-850 text-lg font-bold text-steel-300 transition hover:border-steel-500/50 hover:text-steel-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <span
              aria-live="polite"
              className="grid h-10 min-w-[72px] place-items-center rounded-lg border border-border bg-charcoal-900 text-sm font-bold tabular-nums text-steel-100"
            >
              {active !== null ? `${active}s` : "defaults"}
            </span>
            <button
              type="button"
              onClick={() => step(REST_SECONDS_STEP)}
              disabled={active !== null && active >= REST_SECONDS_MAX}
              aria-label="Increase rest by 15 seconds"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-charcoal-850 text-lg font-bold text-steel-300 transition hover:border-steel-500/50 hover:text-steel-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          {active !== null ? (
            <button
              type="button"
              onClick={() => setRestOverride(null)}
              className="inline-flex min-h-[40px] items-center rounded-lg border border-border bg-charcoal-850 px-3 text-xs font-semibold text-muted-foreground transition hover:border-mint-500/40 hover:text-mint-400"
            >
              Back to program defaults
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Defaults come from your Program Builder — {routineA.shortName} trains
          with {routineA.restSeconds}s rests and {routineB.shortName} with{" "}
          {routineB.restSeconds}s. This override applies one duration to
          everything, which is handy for supersets or busy gym days.
        </p>
      </div>
    </section>
  );
}
