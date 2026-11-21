"use client";

import { useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Dumbbell,
  Info,
  Minus,
  PersonStanding,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { DayName, ExerciseDef, RoutineDef, RoutineId } from "@/lib/fitness/types";
import { useLeanBulk } from "@/lib/fitness/store";
import { EXERCISE_GUIDES } from "@/lib/fitness/exercise-guides";
import {
  DAYS,
  DAY_SHORT,
  EXERCISES_PER_ROUTINE_MAX,
  EXERCISE_NAME_MAX,
  EXERCISE_REP_TARGET_MAX,
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  REST_SECONDS_STEP,
  ROUTINE_FOCUS_MAX,
  ROUTINE_NAME_MAX,
  ROUTINE_SHORT_MAX,
  routineTotalSets,
} from "@/lib/fitness/constants";
import { formatClock } from "@/lib/fitness/utils";
import { SectionHeading, TipCallout } from "./shared";
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

/**
 * Program Builder — makes the whole training plan user-owned: rename both
 * routines, add/remove/reorder exercises, tune sets · reps · rest per
 * exercise, and decide which routine runs on which weekday. Everything is
 * persisted (store v6) and travels with backups + cloud sync.
 */
export function ProgramTab() {
  const routines = useLeanBulk((s) => s.routines);
  const resetProgram = useLeanBulk((s) => s.resetProgram);

  const totalExercises = routines.A.exercises.length + routines.B.exercises.length;

  return (
    <div className="space-y-5">
      <SectionHeading
        icon={ClipboardList}
        title="Program Builder"
        subtitle={`${totalExercises} exercises across 2 routines — make the plan yours`}
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                aria-label="Reset program to the shipped defaults"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border bg-charcoal-900">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset the program?</AlertDialogTitle>
                <AlertDialogDescription>
                  Both routines and the weekly schedule return to the shipped
                  defaults. Your logged workout history is never deleted, but
                  custom exercises you added will disappear from future
                  sessions. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my program</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => resetProgram()}
                >
                  Reset program
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <TipCallout variant="steel">
        <Info className="mr-1 inline h-3.5 w-3.5 -translate-y-px" aria-hidden="true" />
        Changes apply to <strong>new</strong> sessions — existing logs keep the
        exercises they were recorded with. Your program is saved automatically
        and included in backups and cloud snapshots.
      </TipCallout>

      {(["A", "B"] as RoutineId[]).map((rid) => (
        <RoutineEditorCard key={rid} routineId={rid} def={routines[rid]} />
      ))}

      <ScheduleCard />
    </div>
  );
}

/* ---------------------------- Routine editor card --------------------------- */

function RoutineEditorCard({
  routineId,
  def,
}: {
  routineId: RoutineId;
  def: RoutineDef;
}) {
  const updateRoutine = useLeanBulk((s) => s.updateRoutine);
  const addExercise = useLeanBulk((s) => s.addExercise);
  const atCap = def.exercises.length >= EXERCISES_PER_ROUTINE_MAX;

  return (
    <section
      aria-label={`Edit ${def.name}`}
      className="rounded-2xl border border-border/70 bg-card p-4"
    >
      {/* Routine meta */}
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-steel-500/40 bg-steel-600/15 text-sm font-bold text-steel-200">
          {routineId}
        </span>
        <RestStepper routineId={routineId} seconds={def.restSeconds} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TextField
          key={`${routineId}:name:${def.name}`}
          label="Routine name"
          value={def.name}
          max={ROUTINE_NAME_MAX}
          placeholder="e.g. Push Day"
          onCommit={(v) => updateRoutine(routineId, { name: v })}
        />
        <TextField
          key={`${routineId}:short:${def.shortName}`}
          label="Short label"
          value={def.shortName}
          max={ROUTINE_SHORT_MAX}
          placeholder="e.g. Push (A)"
          onCommit={(v) => updateRoutine(routineId, { shortName: v })}
        />
        <TextField
          key={`${routineId}:focus:${def.focus}`}
          label="Focus (shown on dashboard)"
          value={def.focus}
          max={ROUTINE_FOCUS_MAX}
          placeholder="e.g. Chest · Shoulders · Triceps"
          onCommit={(v) => updateRoutine(routineId, { focus: v })}
          allowEmpty
        />
      </div>

      {/* Exercises */}
      <div className="mt-4 space-y-2" role="list" aria-label={`${def.name} exercises`}>
        {def.exercises.map((ex, i) => (
          <ExerciseEditorRow
            key={ex.id}
            routineId={routineId}
            exercise={ex}
            index={i}
            count={def.exercises.length}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => addExercise(routineId)}
        disabled={atCap}
        className={cn(
          "mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition active:scale-[0.98]",
          atCap
            ? "cursor-not-allowed border-border bg-charcoal-850 text-slate-500 opacity-70"
            : "border-steel-500/40 bg-steel-600/15 text-steel-200 hover:border-steel-400/60 hover:bg-steel-600/25"
        )}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {atCap
          ? `Exercise cap reached (${EXERCISES_PER_ROUTINE_MAX})`
          : "Add exercise"}
      </button>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {def.exercises.length} exercises · {routineTotalSets(def)} sets total ·
        rest {def.restSeconds}s between sets
      </p>
    </section>
  );
}

/* ------------------------------ Rest stepper -------------------------------- */

function RestStepper({
  routineId,
  seconds,
}: {
  routineId: RoutineId;
  seconds: number;
}) {
  const updateRoutine = useLeanBulk((s) => s.updateRoutine);
  const clamp = (v: number) =>
    Math.min(REST_SECONDS_MAX, Math.max(REST_SECONDS_MIN, v));

  return (
    <div
      className="flex items-center gap-1.5"
      role="group"
      aria-label={`Rest between sets for routine ${routineId}`}
    >
      <span className="sr-only">Rest between sets</span>
      <button
        type="button"
        onClick={() => updateRoutine(routineId, { restSeconds: clamp(seconds - REST_SECONDS_STEP) })}
        disabled={seconds <= REST_SECONDS_MIN}
        aria-label={`Decrease rest by ${REST_SECONDS_STEP} seconds`}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-charcoal-850 text-steel-300 transition hover:border-steel-500/50 disabled:opacity-40"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        className="min-w-[86px] text-center text-xs font-bold tabular-nums text-steel-200"
        aria-live="polite"
      >
        {formatClock(seconds)}
        <span className="ml-1 font-medium text-muted-foreground">rest</span>
      </span>
      <button
        type="button"
        onClick={() => updateRoutine(routineId, { restSeconds: clamp(seconds + REST_SECONDS_STEP) })}
        disabled={seconds >= REST_SECONDS_MAX}
        aria-label={`Increase rest by ${REST_SECONDS_STEP} seconds`}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-charcoal-850 text-steel-300 transition hover:border-steel-500/50 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ---------------------------- Exercise editor row --------------------------- */

function ExerciseEditorRow({
  routineId,
  exercise,
  index,
  count,
}: {
  routineId: RoutineId;
  exercise: ExerciseDef;
  index: number;
  count: number;
}) {
  const updateExercise = useLeanBulk((s) => s.updateExercise);
  const removeExercise = useLeanBulk((s) => s.removeExercise);
  const moveExercise = useLeanBulk((s) => s.moveExercise);
  const guideKnown = exercise.id in EXERCISE_GUIDES;

  return (
    <div
      role="listitem"
      className="rounded-xl border border-border/70 bg-charcoal-850 p-3"
    >
      {/* Row header: position + reorder + delete */}
      <div className="flex items-center gap-1.5">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-charcoal-800 text-[11px] font-bold tabular-nums text-steel-300"
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <span className="sr-only">{`Exercise ${index + 1} of ${count}`}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => moveExercise(routineId, exercise.id, -1)}
          disabled={index === 0}
          aria-label={`Move ${exercise.name} up`}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-charcoal-800 text-slate-400 transition hover:border-steel-500/50 hover:text-steel-200 disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => moveExercise(routineId, exercise.id, 1)}
          disabled={index === count - 1}
          aria-label={`Move ${exercise.name} down`}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-charcoal-800 text-slate-400 transition hover:border-steel-500/50 hover:text-steel-200 disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => removeExercise(routineId, exercise.id)}
          disabled={count <= 1}
          aria-label={
            count <= 1
              ? "A routine must keep at least one exercise"
              : `Remove ${exercise.name} from the routine`
          }
          title={count <= 1 ? "A routine needs at least one exercise" : "Remove exercise"}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-charcoal-800 text-slate-400 transition hover:border-destructive/60 hover:text-destructive disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Name — keyed by the stored value so external edits (e.g. program
          reset) refresh the uncontrolled input */}
      <label className="mt-2 block">
        <span className="sr-only">Name of exercise {index + 1}</span>
        <input
          type="text"
          key={`${exercise.id}:name:${exercise.name}`}
          defaultValue={exercise.name}
          maxLength={EXERCISE_NAME_MAX}
          onBlur={(e) => {
            if (e.target.value.trim() !== exercise.name) {
              updateExercise(routineId, exercise.id, { name: e.target.value });
            }
          }}
          placeholder="Exercise name"
          className="h-11 w-full rounded-lg border border-border bg-charcoal-900 px-3 text-sm font-semibold text-steel-100 placeholder:text-slate-500 focus:border-steel-500/60"
        />
      </label>

      {/* Sets · reps · weight toggle */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label={`Sets for ${exercise.name}`}
        >
          <button
            type="button"
            onClick={() => updateExercise(routineId, exercise.id, { sets: exercise.sets - 1 })}
            disabled={exercise.sets <= 1}
            aria-label={`Remove a set from ${exercise.name}`}
            className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-charcoal-900 text-steel-300 transition hover:border-steel-500/50 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span
            className="grid h-11 min-w-[64px] place-items-center rounded-lg border border-border bg-charcoal-900 px-2 text-sm font-bold tabular-nums text-steel-100"
            aria-live="polite"
          >
            {exercise.sets} <span className="ml-1 text-[10px] font-medium text-muted-foreground">sets</span>
          </span>
          <button
            type="button"
            onClick={() => updateExercise(routineId, exercise.id, { sets: exercise.sets + 1 })}
            disabled={exercise.sets >= 12}
            aria-label={`Add a set to ${exercise.name}`}
            className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-charcoal-900 text-steel-300 transition hover:border-steel-500/50 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <label className="min-w-[120px] flex-1">
          <span className="sr-only">Rep target for {exercise.name}</span>
          <input
            type="text"
            key={`${exercise.id}:rep:${exercise.repTarget}`}
            defaultValue={exercise.repTarget}
            maxLength={EXERCISE_REP_TARGET_MAX}
            onBlur={(e) => {
              if (e.target.value.trim() !== exercise.repTarget) {
                updateExercise(routineId, exercise.id, { repTarget: e.target.value });
              }
            }}
            placeholder="8–12 reps"
            className="h-11 w-full rounded-lg border border-border bg-charcoal-900 px-2.5 text-center text-xs font-semibold text-steel-100 placeholder:text-slate-500 focus:border-steel-500/60"
          />
        </label>

        <button
          type="button"
          onClick={() =>
            updateExercise(routineId, exercise.id, { usesWeight: !exercise.usesWeight })
          }
          aria-pressed={exercise.usesWeight}
          aria-label={`${exercise.name}: track ${exercise.usesWeight ? "weight" : "bodyweight"} — tap to switch`}
          title="Toggle weighted / bodyweight"
          className={cn(
            "inline-flex h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition",
            exercise.usesWeight
              ? "border-steel-500/50 bg-steel-600/20 text-steel-200"
              : "border-mint-500/40 bg-mint-500/10 text-mint-300"
          )}
        >
          {exercise.usesWeight ? (
            <Dumbbell className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PersonStanding className="h-4 w-4" aria-hidden="true" />
          )}
          {exercise.usesWeight ? "Weighted" : "Bodyweight"}
        </button>
      </div>

      {!guideKnown ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
          No built-in form guide for custom exercise names — steps appear
          automatically when the name matches a known exercise.
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------- Schedule --------------------------------- */

function ScheduleCard() {
  const schedule = useLeanBulk((s) => s.schedule);
  const routines = useLeanBulk((s) => s.routines);
  const setSchedule = useLeanBulk((s) => s.setSchedule);
  const trainingDays = DAYS.filter((d) => schedule[d] !== null).length;

  return (
    <section
      aria-label="Weekly schedule"
      className="rounded-2xl border border-border/70 bg-card p-4"
    >
      <SectionHeading
        icon={Dumbbell}
        title="Weekly Schedule"
        subtitle={`${trainingDays} training days · ${7 - trainingDays} rest days`}
      />

      <div className="mt-3 space-y-1.5">
        {DAYS.map((day) => (
          <div
            key={day}
            className="flex items-center gap-2 rounded-xl border border-border/70 bg-charcoal-850 p-2"
          >
            <span className="w-16 shrink-0 text-xs font-semibold text-steel-200">
              {DAY_SHORT[day]}
            </span>
            <div
              className="grid flex-1 grid-cols-3 gap-1"
              role="group"
              aria-label={`${day} assignment`}
            >
              {(["A", "B", null] as (RoutineId | null)[]).map((r) => {
                const active = schedule[day] === r;
                const label = r === null ? "Rest" : routines[r].shortName;
                return (
                  <button
                    key={r ?? "rest"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSchedule(day, r)}
                    className={cn(
                      "min-h-[40px] truncate rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-all",
                      active
                        ? r === null
                          ? "border border-mint-500/50 bg-mint-500/15 text-mint-400"
                          : "border border-steel-400/60 bg-steel-600/30 text-white"
                        : "border border-transparent text-slate-400 hover:bg-charcoal-800 hover:text-steel-300"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        The Today tab and streak tracking follow this schedule. You can always
        log a bonus session on a rest day from the Workout tab.
      </p>
    </section>
  );
}

/* --------------------------------- TextField -------------------------------- */

function TextField({
  label,
  value,
  max,
  placeholder,
  onCommit,
  allowEmpty = false,
}: {
  label: string;
  value: string;
  max: number;
  placeholder?: string;
  onCommit: (v: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        <span className="tabular-nums text-[10px] text-slate-500">
          {value.length}/{max}
        </span>
      </span>
      <input
        type="text"
        defaultValue={value}
        maxLength={max}
        placeholder={placeholder}
        onBlur={(e) => {
          const t = e.target.value;
          if (t.trim() === value) return;
          if (!allowEmpty && t.trim().length === 0) {
            e.target.value = value; // revert — never allow an empty name
            return;
          }
          onCommit(t);
        }}
        className="h-11 w-full rounded-lg border border-border bg-charcoal-900 px-3 text-sm font-semibold text-steel-100 placeholder:text-slate-500 focus:border-steel-500/60"
      />
    </label>
  );
}
