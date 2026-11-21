"use client";

import { useMemo } from "react";
import { Gauge, Trophy, TrendingUp } from "lucide-react";
import type { ExercisePR } from "@/lib/fitness/types";
import { useLeanBulk } from "@/lib/fitness/store";
import { computePRs } from "@/lib/fitness/utils";
import { DAY_SHORT } from "@/lib/fitness/constants";
import { SectionHeading } from "./shared";
import { cn } from "@/lib/utils";

function PRRow({ pr }: { pr: ExercisePR }) {
  const best = pr.best;
  return (
    <li className="rounded-xl border border-border/70 bg-charcoal-850 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h3 className="min-w-0 truncate text-sm font-bold text-steel-100">
          {pr.exerciseName}
        </h3>
        <span className="shrink-0 rounded-md border border-steel-500/40 bg-steel-600/15 px-1.5 py-0.5 text-[10px] font-bold text-steel-300">
          Routine {pr.routine}
        </span>
      </div>

      {best ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-bold tabular-nums text-mint-400">
              {best.weightLbs}
            </span>
            <span className="text-xs text-muted-foreground">
              lb × {best.reps} reps
            </span>
          </p>
          <span className="rounded-md border border-border bg-charcoal-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            W{best.week} · {DAY_SHORT[best.day]}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          No completed sets yet — log one in the Workout tab.
        </p>
      )}

      {pr.e1rm || pr.bestVolume ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
          {pr.e1rm ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-mint-500/40 bg-mint-500/10 px-1.5 py-0.5 text-mint-300"
              title={`Epley estimate from ${pr.e1rm.weightLbs} lb × ${pr.e1rm.reps} reps (W${pr.e1rm.week})`}
            >
              <Gauge className="h-3 w-3" aria-hidden="true" />
              e1RM {pr.e1rm.valueLbs} lb
            </span>
          ) : null}
          {pr.bestVolume ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-steel-500/40 bg-steel-600/15 px-1.5 py-0.5 text-steel-200"
              title={`${pr.bestVolume.weightLbs} lb × ${pr.bestVolume.reps} reps (W${pr.bestVolume.week})`}
            >
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              best set {pr.bestVolume.volumeLbs.toLocaleString()} lb
            </span>
          ) : null}
          <span className="text-muted-foreground">
            {pr.totalCompletedSets} set{pr.totalCompletedSets === 1 ? "" : "s"} logged
          </span>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Personal Records center — heaviest set, Epley e1RM and best single-set
 * volume for every weighted exercise, scanned from completed sets only.
 */
export function PersonalRecordsCard() {
  const sessions = useLeanBulk((s) => s.sessions);
  const routines = useLeanBulk((s) => s.routines);
  const prs = useMemo(() => computePRs(sessions, routines), [sessions, routines]);
  const withRecords = prs.filter((p) => p.best !== null);
  const totalSets = withRecords.reduce((acc, p) => acc + p.totalCompletedSets, 0);

  return (
    <section aria-label="Personal records">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <SectionHeading
          icon={Trophy}
          title="Personal Records"
          subtitle={
            withRecords.length > 0
              ? `${withRecords.length} exercises · ${totalSets} completed sets this cycle`
              : "Heaviest set · est. 1RM · best set volume"
          }
        />

        {withRecords.length === 0 ? (
          <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <Trophy className="h-6 w-6 text-slate-600" aria-hidden="true" />
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              No records yet. Complete sets in the Workout tab — check off a set
              and your heaviest lifts will show up here automatically.
            </p>
          </div>
        ) : (
          <ul
            className={cn(
              "scrollbar-thin mt-4 max-h-96 space-y-2 overflow-y-auto pr-1",
              "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-charcoal-700"
            )}
          >
            {withRecords.map((pr) => (
              <PRRow key={pr.exerciseId} pr={pr} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
