"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Plus, X, Timer } from "lucide-react";
import { useLeanBulk } from "@/lib/fitness/store";
import { formatClock, playChime } from "@/lib/fitness/utils";
import { cn } from "@/lib/utils";

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RestTimerOverlay() {
  const timer = useLeanBulk((s) => s.restTimer);
  const pauseRestTimer = useLeanBulk((s) => s.pauseRestTimer);
  const resumeRestTimer = useLeanBulk((s) => s.resumeRestTimer);
  const bumpRestTimer = useLeanBulk((s) => s.bumpRestTimer);
  const cancelRestTimer = useLeanBulk((s) => s.cancelRestTimer);

  const [now, setNow] = useState(() => Date.now());
  const chimedRef = useRef(false);
  const endAtRef = useRef<number | null>(null);

  const running = timer !== null && timer.pausedRemainingMs === null;
  const remainingMs = timer
    ? timer.pausedRemainingMs !== null
      ? timer.pausedRemainingMs
      : Math.max(0, timer.endAt - now)
    : 0;
  const done = timer !== null && remainingMs <= 0;
  const progress =
    timer && timer.totalSeconds > 0
      ? 1 - remainingMs / (timer.totalSeconds * 1000)
      : 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  /* Keep the screen awake for the duration of the countdown (gym use — the
     phone would otherwise sleep mid-rest). Feature-detected, safe no-op. */
  useEffect(() => {
    if (!running) return;
    type WakeLockSentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
    };
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    nav.wakeLock
      ?.request("screen")
      .then((s) => {
        if (cancelled) void s.release().catch(() => {});
        else sentinel = s;
      })
      .catch(() => {
        /* wake lock unsupported or denied — fine */
      });
    return () => {
      cancelled = true;
      void sentinel?.release().catch(() => {});
    };
  }, [running]);

  // Chime exactly once per countdown: re-arm whenever a NEW timer/extended
  // countdown begins (different endAt), reset when the overlay closes.
  useEffect(() => {
    if (!timer) {
      chimedRef.current = false;
      endAtRef.current = null;
      return;
    }
    if (endAtRef.current !== timer.endAt) {
      endAtRef.current = timer.endAt;
      chimedRef.current = false;
    }
    if (done && !chimedRef.current) {
      chimedRef.current = true;
      playChime();
      // Haptic buzz alongside the chime (no-op where unsupported)
      try {
        navigator.vibrate?.([220, 100, 220]);
      } catch {
        /* vibration unavailable */
      }
    }
  }, [timer, done]);

  // Auto-dismiss 5s after completion
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => cancelRestTimer(), 5000);
    return () => window.clearTimeout(id);
  }, [done, cancelRestTimer]);

  return (
    <AnimatePresence>
      {timer ? (
        <motion.div
          key="rest-timer"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4"
          role="timer"
          aria-label="Rest timer"
        >
          <div
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border p-3 shadow-2xl backdrop-blur-md",
              done
                ? "border-mint-500/50 bg-charcoal-900/95 shadow-mint-600/10"
                : "border-steel-500/40 bg-charcoal-900/95"
            )}
          >
            <div className="relative h-[72px] w-[72px] shrink-0">
              <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                <circle
                  cx="36"
                  cy="36"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="6"
                  className="stroke-charcoal-700"
                />
                <circle
                  cx="36"
                  cy="36"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)))}
                  className={cn(
                    "transition-[stroke-dashoffset] duration-300",
                    done ? "stroke-mint-400" : "stroke-steel-400"
                  )}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <span
                  className={cn(
                    "font-mono text-sm font-bold tabular-nums",
                    done ? "text-mint-400" : "text-steel-200"
                  )}
                >
                  {formatClock(remainingMs / 1000)}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Timer className="h-3 w-3" aria-hidden="true" />
                {done ? "Rest complete" : "Rest timer"}
              </p>
              <p className="truncate text-sm font-semibold text-steel-200">
                {done ? "Go — next set! 💪" : timer.label}
              </p>
              {done ? (
                <p role="status" className="sr-only">
                  Rest timer finished. Start your next set.
                </p>
              ) : null}
              <div className="mt-1.5 flex items-center gap-1.5">
                {!done ? (
                  <>
                    <button
                      type="button"
                      onClick={running ? pauseRestTimer : resumeRestTimer}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-charcoal-800 text-steel-300 transition hover:border-steel-500/50 hover:text-steel-200"
                      aria-label={running ? "Pause timer" : "Resume timer"}
                    >
                      {running ? (
                        <Pause className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Play className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => bumpRestTimer(15)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-charcoal-800 text-steel-300 transition hover:border-steel-500/50 hover:text-steel-200"
                      aria-label="Add 15 seconds"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={cancelRestTimer}
                  className="rounded-lg border border-border bg-charcoal-800 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-mint-500/40 hover:text-mint-400"
                >
                  {done ? "Dismiss" : "Skip rest"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={cancelRestTimer}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-charcoal-800 hover:text-foreground"
              aria-label="Close timer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
