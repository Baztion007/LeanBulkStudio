"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Repeat, RotateCcw, TrendingUp, Trophy } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { PhaseId, RoutineId } from "@/lib/fitness/types";
import { useLeanBulk } from "@/lib/fitness/store";
import {
  PHASES,
  PROGRAM_WEEKS,
  phaseForWeek,
} from "@/lib/fitness/constants";
import { getLatestSessionInWeek, programCompletion, summarizeExerciseSets, totalVolume } from "@/lib/fitness/utils";
import { SectionHeading } from "./shared";
import { WeightTrendCard } from "./weight-trend-card";
import { SessionHistoryCard } from "./session-history-card";
import { PersonalRecordsCard } from "./pr-card";
import { VolumeAnalyticsCard } from "./volume-analytics-card";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function ProgressTab() {
  const currentWeek = useLeanBulk((s) => s.currentWeek);
  const selectedPhase = useLeanBulk((s) => s.selectedPhase);
  const selectPhase = useLeanBulk((s) => s.selectPhase);
  const sessions = useLeanBulk((s) => s.sessions);
  const routines = useLeanBulk((s) => s.routines);
  const chart = useChartTheme();

  const allExercises = useMemo(
    () => [
      ...routines.A.exercises.map((e) => ({ ...e, routine: "A" as RoutineId })),
      ...routines.B.exercises.map((e) => ({ ...e, routine: "B" as RoutineId })),
    ],
    [routines]
  );
  const [chartExerciseId, setChartExerciseId] = useState(allExercises[0].id);
  /* If the picked exercise was deleted/renamed in the builder, fall back */
  const effectiveChartId = allExercises.some((e) => e.id === chartExerciseId)
    ? chartExerciseId
    : allExercises[0].id;

  const weeks = useMemo(
    () => Array.from({ length: PROGRAM_WEEKS }, (_, i) => i + 1),
    []
  );

  const chartData = useMemo(() => {
    const ex = allExercises.find((e) => e.id === effectiveChartId);
    if (!ex) return [];
    return weeks.map((w) => {
      const summary = summarizeExerciseSets(
        getLatestSessionInWeek(sessions, w, ex.routine),
        ex.id
      );
      return { week: `W${w}`, lbs: summary.weight > 0 ? summary.weight : null };
    });
  }, [allExercises, effectiveChartId, sessions, weeks]);

  const hasChartData = chartData.some((d) => d.lbs !== null);

  return (
    <div className="space-y-5">
      <SectionHeading
        icon={TrendingUp}
        title="6-Week Progressive Overload Controller"
        subtitle={`Week ${currentWeek} of ${PROGRAM_WEEKS} · Double Progression program`}
      />

      {/* 0. Graduation — the program is complete */}
      <ProgramCompleteCard />

      {/* 1. The Core Progression Engine — permanent overlay */}
      <div className="relative overflow-hidden rounded-2xl border border-mint-500/30 bg-gradient-to-br from-charcoal-900 to-charcoal-850 p-5">
        <span
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-mint-500/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-mint-500/40 bg-mint-500/10">
            <Repeat className="h-5 w-5 text-mint-400" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold tracking-tight text-mint-400">
            The Double Progression Rule
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-steel-200">
          Always try to increase your <strong className="text-mint-300">repetitions first</strong>.
          Once you hit the maximum rep target (<strong className="text-mint-300">12 reps</strong>)
          for all sets of an exercise, increase the dumbbell weight by the smallest
          available amount (using your <strong className="text-mint-300">2.5lb or 5lb plates</strong>)
          next week, dropping the reps back down to <strong className="text-mint-300">8</strong>.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
          <span className="rounded-md border border-border bg-charcoal-800 px-2 py-1 text-slate-300">
            8–12 reps
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-mint-400" aria-hidden="true" />
          <span className="rounded-md border border-mint-500/40 bg-mint-500/10 px-2 py-1 text-mint-300">
            all sets × 12
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-mint-400" aria-hidden="true" />
          <span className="rounded-md border border-steel-500/40 bg-steel-600/15 px-2 py-1 text-steel-200">
            +2.5–5 lb → back to 8
          </span>
        </div>
      </div>

      {/* 2. Body weight trend — the lean-bulk feedback loop */}
      <WeightTrendCard />

      {/* 3. Phase milestone selector */}
      <section aria-label="Phase milestones">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PHASES.map((phase) => {
            const active = phase.id === selectedPhase;
            const isCurrent = phaseForWeek(currentWeek) === phase.id;
            return (
              <motion.button
                key={phase.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => selectPhase(phase.id as PhaseId)}
                aria-pressed={active}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "border-mint-500/50 bg-mint-500/[0.08] shadow-lg shadow-mint-600/10"
                    : "border-border/70 bg-card hover:border-steel-500/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                      active
                        ? "border-mint-500/50 bg-mint-500/15 text-mint-400"
                        : "border-border bg-charcoal-850 text-slate-400"
                    )}
                  >
                    PHASE {phase.id}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    W{phase.weeks[0]}–{phase.weeks[1]}
                  </span>
                </div>
                <h3
                  className={cn(
                    "mt-2 text-sm font-bold tracking-tight",
                    active ? "text-mint-300" : "text-steel-200"
                  )}
                >
                  {phase.name}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {phase.tag}
                </p>
                {isCurrent ? (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-steel-400">
                    ● Current phase (Week {currentWeek})
                  </p>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 4. 6-week macro matrix */}
      <section aria-label="6-week macro matrix">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-steel-200">
                6-Week Macro Matrix
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Weight × reps per set · latest session of each week
              </p>
            </div>
          </div>

          <div className="scrollbar-hide mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-xs">
              <caption className="sr-only">
                Top-set weight and reps for every exercise across all six
                program weeks
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-semibold text-slate-400"
                  >
                    Exercise
                  </th>
                  {weeks.map((w) => (
                    <th
                      key={w}
                      scope="col"
                      aria-current={w === currentWeek ? "true" : undefined}
                      className={cn(
                        "px-1.5 py-2 text-center font-semibold tabular-nums",
                        w === currentWeek ? "text-mint-400" : "text-slate-400"
                      )}
                    >
                      W{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(routines) as RoutineId[]).map((r) => (
                  <RoutineMatrixRows key={r} routine={r} weeks={weeks} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-mint-400" />
              Progression ready (all sets × 12)
            </span>
            <span>BW = bodyweight (plank)</span>
            <span>— = not logged yet</span>
          </div>
        </div>
      </section>

      {/* 5. Strength progression chart */}
      <section aria-label="Strength progression chart">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-steel-200">
                Load Progression
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Top-set dumbbell weight (lbs) by week
              </p>
            </div>
            <select
              value={effectiveChartId}
              onChange={(e) => setChartExerciseId(e.target.value)}
              aria-label="Choose exercise for the chart"
              className="h-9 max-w-[220px] rounded-lg border border-border bg-charcoal-900 px-2 text-xs font-medium text-steel-200 focus:border-steel-500/60"
            >
              {(Object.keys(routines) as RoutineId[]).map((r) => (
                <optgroup key={r} label={routines[r].shortName}>
                  {routines[r].exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="mt-3 h-[220px] w-full">
            {hasChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: chart.tick, fontSize: 11 }}
                    axisLine={{ stroke: chart.axisLine }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: chart.tick, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={["dataMin - 5", "dataMax + 5"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chart.tooltipBg,
                      border: `1px solid ${chart.tooltipBorder}`,
                      borderRadius: 10,
                      fontSize: 12,
                      color: chart.tooltipText,
                    }}
                    formatter={(value) => [`${value} lbs`, "Top set"]}
                    labelFormatter={(label) => `Week ${String(label).replace("W", "")}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="lbs"
                    stroke={chart.line}
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: chart.dotFill, stroke: chart.line, strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: chart.line }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                Log a few sets in the Workout tab and your load curve will appear here.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. Volume analytics (weekly tonnage + muscle split) */}
      <VolumeAnalyticsCard />

      {/* 7. Personal records (heaviest set · e1RM · best set volume) */}
      <PersonalRecordsCard />

      {/* 8. Session history & consistency */}
      <SessionHistoryCard />
    </div>
  );
}

function RoutineMatrixRows({
  routine,
  weeks,
}: {
  routine: RoutineId;
  weeks: number[];
}) {
  const currentWeek = useLeanBulk((s) => s.currentWeek);
  const sessions = useLeanBulk((s) => s.sessions);
  const routines = useLeanBulk((s) => s.routines);

  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={weeks.length + 1}
          className="border-t border-border/70 px-2 pb-1 pt-3 text-left text-[10px] font-bold uppercase tracking-wider text-steel-400"
        >
          {routines[routine].name}
        </th>
      </tr>
      {routines[routine].exercises.map((ex) => (
        <tr key={ex.id}>
          <th
            scope="row"
            className="sticky left-0 z-10 max-w-[190px] truncate bg-card px-2 py-1.5 text-left font-medium text-steel-200"
          >
            {ex.name}
          </th>
          {weeks.map((w) => {
            const summary = summarizeExerciseSets(
              getLatestSessionInWeek(sessions, w, routine),
              ex.id
            );
            const isCurrentWeek = w === currentWeek;
            return (
              <td key={w} className="px-1.5 py-1.5 text-center">
                {summary.logged && summary.reps.some((r) => r > 0) ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                      summary.allTwelve
                        ? "border-mint-500/40 bg-mint-500/10 text-mint-300"
                        : isCurrentWeek
                          ? "border-steel-500/40 bg-steel-600/10 text-steel-200"
                          : "border-border/70 bg-charcoal-850 text-slate-300"
                    )}
                  >
                    {summary.weight > 0 ? `${summary.weight}×` : "BW×"}
                    {summary.reps.map((r) => (r > 0 ? r : "–")).join("·")}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/* ------------------------------ Graduation card ---------------------------- */

function ProgramCompleteCard() {
  const sessions = useLeanBulk((s) => s.sessions);
  const schedule = useLeanBulk((s) => s.schedule);
  const startNextCycle = useLeanBulk((s) => s.startNextCycle);
  const { toast } = useToast();

  const completion = useMemo(
    () => programCompletion(sessions, schedule),
    [sessions, schedule]
  );
  const volume = useMemo(() => totalVolume(sessions), [sessions]);

  if (!completion.complete) return null;

  return (
    <motion.section
      aria-label="Program complete"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-mint-500/40 bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-charcoal-850 p-5"
    >
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-mint-500/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-mint-500/50 bg-mint-500/15 shadow-lg shadow-mint-600/20">
          <Trophy className="h-6 w-6 text-mint-400" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-glow-mint text-mint-400">
            Program Complete! 🏆
          </h2>
          <p className="text-sm text-muted-foreground">
            All {completion.planned} scheduled sessions finished — that&apos;s a
            full 6-week cycle of double progression.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-mint-500/30 bg-mint-500/10 p-3 text-center">
          <p className="text-xl font-bold tabular-nums text-mint-400">
            {completion.done}
          </p>
          <p className="text-[11px] text-muted-foreground">sessions done</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3 text-center">
          <p className="text-xl font-bold tabular-nums text-steel-200">
            {volume.sets}
          </p>
          <p className="text-[11px] text-muted-foreground">sets logged</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3 text-center">
          <p className="text-xl font-bold tabular-nums text-steel-200">
            {volume.volumeLbs.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">lb total volume</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-steel-200">
        Next step: take a deload week if you feel run down, then run the cycle
        again with heavier baselines — your logged matrix is the blueprint.
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-mint-500 px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-mint-600/20 transition hover:bg-mint-400 focus-visible:outline-2 focus-visible:outline-mint-400 active:scale-[0.98] sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Start next cycle (fresh Week 1)
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-border bg-charcoal-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Start a fresh cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all week-by-week workout logs and rewinds to Week 1.
              Your body-weight history, calculator settings and plate inventory
              are kept. Want to keep the old cycle? Export a backup first
              (Tools → Backup &amp; Restore).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep history</AlertDialogCancel>
            <AlertDialogAction
              className="bg-mint-500 font-bold text-primary-foreground hover:bg-mint-400"
              onClick={() => {
                startNextCycle();
                toast({
                  title: "New cycle started 🔁",
                  description:
                    "Week 1 is live. Set fresh baselines and beat last cycle's matrix.",
                });
              }}
            >
              Start next cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.section>
  );
}
