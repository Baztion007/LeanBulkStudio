"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Beef,
  CalendarDays,
  Check,
  Dumbbell,
  Droplet,
  Droplets,
  Flame,
  Moon,
  Timer,
  Utensils,
  Wheat,
} from "lucide-react";
import type { DayName } from "@/lib/fitness/types";
import { useLeanBulk } from "@/lib/fitness/store";
import {
  DAYS,
  DAY_INITIAL,
  DAY_SHORT,
  WATER_BOXES,
  WATER_BOX_ML,
  WATER_GOAL_ML,
  routineTotalSets,
  todayName,
} from "@/lib/fitness/constants";
import {
  computeTargets,
  currentStreak,
  formatMl,
  getSessionsForDay,
  sessionIsComplete,
  weeklyConsistency,
} from "@/lib/fitness/utils";
import { SectionHeading, TipCallout } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function DashboardTab() {
  const selectedDay = useLeanBulk((s) => s.selectedDay);
  const selectDay = useLeanBulk((s) => s.selectDay);
  const currentWeek = useLeanBulk((s) => s.currentWeek);
  const sessions = useLeanBulk((s) => s.sessions);
  const water = useLeanBulk((s) => s.water);
  const bodyWeightKg = useLeanBulk((s) => s.bodyWeightKg);
  const activityFactor = useLeanBulk((s) => s.activityFactor);
  const setWaterCount = useLeanBulk((s) => s.setWaterCount);
  const setActiveTab = useLeanBulk((s) => s.setActiveTab);
  const routines = useLeanBulk((s) => s.routines);
  const schedule = useLeanBulk((s) => s.schedule);
  const { toast } = useToast();

  const targets = computeTargets(bodyWeightKg, activityFactor);
  const today = todayName();
  const routine = schedule[selectedDay];
  const waterCount = water[selectedDay] ?? 0;

  const daySessions = getSessionsForDay(sessions, currentWeek, selectedDay);
  const daySessionComplete = daySessions.some(sessionIsComplete);

  /* Week context: scheduled sessions done this week + current streak */
  const weekRow = weeklyConsistency(sessions, schedule).find(
    (w) => w.week === currentWeek
  );
  const streak = currentStreak(sessions, currentWeek, today, schedule);

  const handleWaterTap = (box: number) => {
    const next = box === waterCount ? box - 1 : box;
    setWaterCount(selectedDay, next);
    if (next === WATER_BOXES) {
      toast({
        title: "Hydration goal reached! 💧",
        description: `${formatMl(WATER_GOAL_ML)} logged for ${DAY_SHORT[selectedDay]}. Nice work.`,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Day selection bar — swipeable */}
      <section aria-label="Day selection">
        <SectionHeading
          icon={CalendarDays}
          title="This Week at a Glance"
          subtitle={`Week ${currentWeek} of 6 · tap a day to shift focus`}
          action={
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className="inline-flex min-h-[28px] items-center gap-1 rounded-full border border-steel-500/40 bg-steel-600/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-steel-200"
                title={`Scheduled sessions fully completed in week ${currentWeek}`}
              >
                <Dumbbell className="h-3 w-3" aria-hidden="true" />
                {weekRow
                  ? `${weekRow.done}/${weekRow.planned}`
                  : `0/${DAYS.filter((d) => schedule[d] !== null).length}`}
              </span>
              <span
                className={cn(
                  "inline-flex min-h-[28px] items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums",
                  streak > 0
                    ? "border-mint-500/50 bg-mint-500/15 text-mint-400"
                    : "border-border bg-charcoal-850 text-muted-foreground"
                )}
                title="Consecutive scheduled sessions completed, counting back from today"
              >
                <Flame className="h-3 w-3" aria-hidden="true" />
                {streak > 0 ? streak : 0}
              </span>
            </div>
          }
        />
        <div
          className="scrollbar-hide -mx-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1"
          role="group"
          aria-label="Days of the week"
        >
          {DAYS.map((day) => {
            const active = day === selectedDay;
            const isToday = day === today;
            const dayRoutine = schedule[day];
            const complete = getSessionsForDay(sessions, currentWeek, day).some(
              sessionIsComplete
            );
            return (
              <button
                key={day}
                type="button"
                aria-pressed={active}
                aria-label={`${day}${isToday ? " (today)" : ""} — ${
                  complete
                    ? "session logged"
                    : dayRoutine
                      ? "workout day"
                      : "rest day"
                }`}
                onClick={() => selectDay(day)}
                className={cn(
                  "relative flex w-[68px] shrink-0 snap-start flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 transition-all",
                  active
                    ? "border-steel-400/60 bg-steel-600/25 shadow-lg shadow-steel-700/20"
                    : "border-border/70 bg-charcoal-900 hover:border-steel-500/30"
                )}
              >
                {isToday ? (
                  <span
                    className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-mint-400"
                    title="Today"
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold",
                    active
                      ? "bg-steel-500/40 text-steel-100"
                      : "bg-charcoal-800 text-slate-400"
                  )}
                >
                  {DAY_INITIAL[day]}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    active ? "text-steel-100" : "text-slate-400"
                  )}
                >
                  {DAY_SHORT[day]}
                </span>
                <span
                  className={cn(
                    "h-1 w-6 rounded-full",
                    complete
                      ? "bg-mint-400"
                      : dayRoutine
                        ? "bg-steel-500/70"
                        : "bg-charcoal-700"
                  )}
                  title={
                    complete
                      ? "Session logged"
                      : dayRoutine
                        ? "Workout day"
                        : "Rest day"
                  }
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Dynamic workout / rest card */}
      <section aria-label="Today's focus">
        {routine ? (
          <motion.div
            key={`${selectedDay}-workout`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="overflow-hidden rounded-2xl border border-steel-500/30 bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-charcoal-850">
              <div className="flex items-start gap-4 p-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-steel-500/40 bg-steel-600/20">
                  <Dumbbell className="h-6 w-6 text-steel-300" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold tracking-tight text-steel-100">
                      {routines[routine].name}
                    </h3>
                    {daySessionComplete ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-mint-500/40 bg-mint-500/15 px-2 py-0.5 text-[11px] font-semibold text-mint-400">
                        <Check className="h-3 w-3" aria-hidden="true" /> Done
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {routineTotalSets(routines[routine])} sets ·{" "}
                    {routines[routine].focus}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("workout")}
                    className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-mint-500 px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-mint-600/20 transition hover:bg-mint-400 focus-visible:outline-2 focus-visible:outline-mint-400 active:scale-[0.98]"
                  >
                    {daySessionComplete ? "Review Workout" : "Launch Workout"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`${selectedDay}-rest`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="rounded-2xl border border-mint-500/25 bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-charcoal-850 p-5">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-mint-500/30 bg-mint-500/10">
                  <Moon className="h-6 w-6 text-mint-400" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-glow-mint text-mint-400">
                    REST &amp; RECOVER
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Growth happens while you recover — hit today&apos;s targets.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3 text-center">
                  <Flame className="mx-auto h-4 w-4 text-mint-400" aria-hidden="true" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-steel-100">
                    {targets.calories.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">kcal target</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3 text-center">
                  <Beef className="mx-auto h-4 w-4 text-mint-400" aria-hidden="true" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-steel-100">
                    {targets.protein}g
                  </p>
                  <p className="text-[11px] text-muted-foreground">protein</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3 text-center">
                  <Wheat className="mx-auto h-4 w-4 text-mint-400" aria-hidden="true" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-steel-100">
                    {targets.carbs}g
                  </p>
                  <p className="text-[11px] text-muted-foreground">carbs</p>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Live targets pulled from your calculator (Tools tab)
              </p>
            </div>
          </motion.div>
        )}
      </section>

      {/* 3. Meal & hydration sync */}
      <section aria-label="Meal and hydration tracker">
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <SectionHeading
            icon={Utensils}
            title="Meal & Hydration Sync"
            subtitle={`Daily tracker — ${DAY_SHORT[selectedDay]}, Week ${currentWeek}`}
          />

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-charcoal-850 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-steel-600/20 text-steel-300">
                <Timer className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-steel-200">
                  Post-workout anabolic window: 1–2 hours
                </p>
                <p className="text-xs text-muted-foreground">
                  {routine
                    ? "Today is a training day — plan your biggest meal after the session."
                    : "Rest day — keep protein steady and prep meals for the next session."}
                </p>
              </div>
            </div>

            <TipCallout>
              💡 <strong>Pro-Tip:</strong> Time your largest meal (Lunch or Dinner)
              within 1–2 hours after your workout to optimize muscle recovery.
            </TipCallout>

            {/* Water tracker */}
            <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium text-steel-200">
                  <Droplets className="h-4 w-4 text-steel-400" aria-hidden="true" />
                  Water intake
                </p>
                <p
                  className="text-xs tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  <span className="font-semibold text-mint-400">{waterCount}/{WATER_BOXES}</span>
                  {" · "}
                  {formatMl(waterCount * WATER_BOX_ML)} / {formatMl(WATER_GOAL_ML)}
                </p>
              </div>
              <div
                className="mt-3 grid grid-cols-8 gap-1.5"
                role="group"
                aria-label={`Water intake: ${waterCount} of ${WATER_BOXES} boxes`}
              >
                {Array.from({ length: WATER_BOXES }, (_, i) => i + 1).map((box) => {
                  const filled = box <= waterCount;
                  return (
                    <button
                      key={box}
                      type="button"
                      onClick={() => handleWaterTap(box)}
                      aria-label={`Water box ${box} of ${WATER_BOXES}${filled ? " (filled)" : ""}`}
                      aria-pressed={filled}
                      className={cn(
                        "grid min-h-[44px] place-items-center rounded-lg border transition-all active:scale-95",
                        filled
                          ? "border-mint-500/60 bg-mint-500/20"
                          : "border-border bg-charcoal-900 hover:border-steel-500/40"
                      )}
                    >
                      <Droplet
                        className={cn(
                          "h-4 w-4 transition-colors",
                          filled ? "fill-mint-400 text-mint-400" : "text-slate-600"
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tap to complete · each drop = {WATER_BOX_ML} ml
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
