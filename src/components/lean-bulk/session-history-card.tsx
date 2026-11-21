"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Flame, History, StickyNote } from "lucide-react";
import type { HistoryRow } from "@/lib/fitness/types";
import { useLeanBulk } from "@/lib/fitness/store";
import { todayName } from "@/lib/fitness/constants";
import {
  buildHistory,
  currentStreak,
  weeklyConsistency,
} from "@/lib/fitness/utils";
import { SectionHeading } from "./shared";
import { cn } from "@/lib/utils";

export function SessionHistoryCard() {
  const sessions = useLeanBulk((s) => s.sessions);
  const currentWeek = useLeanBulk((s) => s.currentWeek);
  const routines = useLeanBulk((s) => s.routines);
  const schedule = useLeanBulk((s) => s.schedule);

  const history = useMemo(() => buildHistory(sessions, routines), [sessions, routines]);
  const consistency = useMemo(() => weeklyConsistency(sessions, schedule), [sessions, schedule]);
  const streak = useMemo(
    () => currentStreak(sessions, currentWeek, todayName(), schedule),
    [sessions, currentWeek, schedule]
  );

  const [expanded, setExpanded] = useState<string | null>(null);
  const totalLogged = history.length;

  return (
    <section aria-label="Session history and consistency">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <SectionHeading
          icon={History}
          title="Session History & Consistency"
          subtitle={`${totalLogged} ${totalLogged === 1 ? "session" : "sessions"} logged · tap a row to review`}
        />

        {/* Streak + weekly consistency */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
              streak > 0
                ? "border-mint-500/50 bg-mint-500/15 text-mint-400"
                : "border-border bg-charcoal-850 text-muted-foreground"
            )}
            title="Consecutive scheduled sessions completed, counting back from today"
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {streak > 0 ? `${streak} in a row` : "No streak yet"}
          </span>
          <div
            className="flex flex-1 flex-wrap items-center justify-end gap-1"
            role="group"
            aria-label="Weekly session completion"
          >
            {consistency.map((w) => (
              <span
                key={w.week}
                title={`Week ${w.week}: ${w.done}/${w.planned} sessions completed`}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold tabular-nums",
                  w.done >= w.planned
                    ? "border-mint-500/50 bg-mint-500/15 text-mint-400"
                    : w.done > 0
                      ? "border-steel-500/40 bg-steel-600/10 text-steel-300"
                      : "border-border/70 bg-charcoal-850 text-slate-500"
                )}
              >
                W{w.week}
                <span className="opacity-80">{w.done}/{w.planned}</span>
              </span>
            ))}
          </div>
        </div>

        {/* History list */}
        {totalLogged === 0 ? (
          <div className="mt-4 grid h-24 place-items-center rounded-xl border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
            No sessions logged yet — complete your first set in the Workout tab
            and it will appear here.
          </div>
        ) : (
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
            {history.map((row) => (
              <HistoryEntry
                key={row.key}
                row={row}
                expanded={expanded === row.key}
                onToggle={() =>
                  setExpanded((cur) => (cur === row.key ? null : row.key))
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryEntry({
  row,
  expanded,
  onToggle,
}: {
  row: HistoryRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const routineShort = useLeanBulk(
    (s) => s.routines[row.routine]?.shortName ?? row.routine
  );
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        expanded ? "border-steel-500/40" : "border-border/70",
        row.complete ? "bg-mint-500/[0.05]" : "bg-charcoal-850"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-foreground/5"
      >
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold",
            row.complete
              ? "border border-mint-500/40 bg-mint-500/15 text-mint-400"
              : "border border-border bg-charcoal-800 text-steel-300"
          )}
        >
          {row.complete ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            `W${row.week}`
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-steel-100">
            Week {row.week} · {row.day} · {routineShort}
          </span>
          <span className="block text-[11px] tabular-nums text-muted-foreground">
            {row.done}/{row.total} sets completed
            {row.complete ? " · full session 🎉" : ""}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {expanded ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="border-t border-border/70 px-3 py-2.5"
        >
          <ul className="space-y-1.5">
            {row.exercises.map((ex) => {
              const noteLine = ex.notePairs
                .map((p) => `S${p.set}: ${p.note}`)
                .join(" · ");
              return (
                <li key={ex.id} className="text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-steel-200">{ex.name}</span>
                    <span className="shrink-0 font-mono tabular-nums text-slate-300">
                      {ex.logged
                        ? `${ex.usesWeight ? (ex.weight > 0 ? `${ex.weight} × ` : "BW × ") : ""}${ex.reps.map((r) => (r > 0 ? r : "–")).join("·")}`
                        : "—"}
                    </span>
                  </div>
                  {noteLine ? (
                    <p className="mt-0.5 flex items-start gap-1 italic text-amber-500/80">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                      {noteLine}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </motion.div>
      ) : null}
    </div>
  );
}
