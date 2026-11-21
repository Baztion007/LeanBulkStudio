"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Dumbbell,
  Info,
  Lock,
  RotateCcw,
  StickyNote,
  Timer,
  TrendingUp,
  TriangleAlert,
  X,
} from "lucide-react";
import type { DayName, ExerciseLog, RoutineId, SetLog } from "@/lib/fitness/types";
import { useLeanBulk } from "@/lib/fitness/store";
import {
  PHASES,
  SET_NOTE_MAX_CHARS,
} from "@/lib/fitness/constants";
import {
  countCompletedSets,
  bestWeightForExercise,
  getLatestPriorSession,
  sessionKey,
} from "@/lib/fitness/utils";
import { SectionHeading, TipCallout } from "./shared";
import { ExerciseGuideButton } from "./exercise-guide";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MergedSet extends SetLog {
  fromHistory: boolean;
}

interface MergedExercise {
  id: string;
  name: string;
  sets: MergedSet[];
  repTarget: string;
  usesWeight: boolean;
}

export function WorkoutTab() {
  const selectedDay = useLeanBulk((s) => s.selectedDay);
  const currentWeek = useLeanBulk((s) => s.currentWeek);
  const selectedPhase = useLeanBulk((s) => s.selectedPhase);
  const routineOverride = useLeanBulk((s) => s.routineOverride);
  const setRoutineOverride = useLeanBulk((s) => s.setRoutineOverride);
  const sessions = useLeanBulk((s) => s.sessions);
  const restOverrideSec = useLeanBulk((s) => s.restOverrideSec);
  const updateSetInput = useLeanBulk((s) => s.updateSetInput);
  const toggleSetComplete = useLeanBulk((s) => s.toggleSetComplete);
  const resetSession = useLeanBulk((s) => s.resetSession);
  const startRestTimer = useLeanBulk((s) => s.startRestTimer);
  const routines = useLeanBulk((s) => s.routines);
  const schedule = useLeanBulk((s) => s.schedule);
  const { toast } = useToast();

  const routine: RoutineId = routineOverride ?? schedule[selectedDay] ?? "A";
  const isRestDay = schedule[selectedDay] === null;
  const def = routines[routine];
  const phase = PHASES.find((p) => p.id === selectedPhase) ?? PHASES[0];
  /** Tools → Rest Timer override wins over the per-routine Program Builder default. */
  const restSeconds = restOverrideSec ?? def.restSeconds;
  const restLabel = `Rest ${restSeconds}s`;

  const session = sessions[sessionKey(currentWeek, selectedDay, routine)];
  const { done, total } = countCompletedSets(session);
  const pct = total > 0 ? (done / total) * 100 : 0;

  /** Merge stored session with previous-week prefill for the input defaults */
  const exercises: MergedExercise[] = useMemo(() => {
    const prior = getLatestPriorSession(sessions, currentWeek, selectedDay, routine);
    const priorLogs: Record<string, ExerciseLog> = {};
    if (prior) {
      for (const log of prior.exercise_logs) priorLogs[log.exercise_id] = log;
    }
    const storedLogs: Record<string, ExerciseLog> = {};
    if (session) {
      for (const log of session.exercise_logs) storedLogs[log.exercise_id] = log;
    }
    return def.exercises.map((ex) => {
      const stored = storedLogs[ex.id];
      const priorLog = priorLogs[ex.id];
      const sets: MergedSet[] = Array.from({ length: ex.sets }, (_, i) => {
        const n = i + 1;
        const s = stored?.sets.find((x) => x.set_number === n);
        const p = priorLog?.sets.find((x) => x.set_number === n);
        const matchesPrior =
          !!s &&
          !!p &&
          (s.weight_used_lbs ?? 0) === (p.weight_used_lbs ?? 0) &&
          (s.reps_completed ?? 0) === (p.reps_completed ?? 0);
        const priorHasData =
          !!p && ((p.weight_used_lbs ?? 0) > 0 || (p.reps_completed ?? 0) > 0);
        return {
          set_number: n,
          weight_used_lbs: s?.weight_used_lbs ?? p?.weight_used_lbs ?? 0,
          reps_completed: s?.reps_completed ?? p?.reps_completed ?? 0,
          is_completed: s?.is_completed ?? false,
          // notes live on the current session only — never seeded from history
          ...(s?.note ? { note: s.note } : {}),
          // "last wk" badge: meaningful history carried over and untouched
          fromHistory: !s?.is_completed && priorHasData && (!s || matchesPrior),
        };
      });
      return { id: ex.id, name: ex.name, sets, repTarget: ex.repTarget, usesWeight: ex.usesWeight };
    });
  }, [sessions, currentWeek, selectedDay, routine, def, session]);

  const handleCheck = (
    exerciseId: string,
    exerciseName: string,
    setNumber: number,
    merged: MergedSet
  ) => {
    // Grade against everything logged BEFORE this set is marked complete
    const prevBest = bestWeightForExercise(sessions, exerciseId, {
      sessionKey: sessionKey(currentWeek, selectedDay, routine),
      setNumber,
    });
    const result = toggleSetComplete(
      currentWeek,
      selectedDay,
      routine,
      exerciseId,
      setNumber
    );
    if (result === null) {
      toast({
        title: "Log your reps first",
        description: `Enter the reps you achieved for Set ${setNumber} of ${exerciseName}, then check it off.`,
      });
      return;
    }
    if (result.completed) {
      // Subtle haptic tick on every locked-in set (no-op where unsupported)
      try {
        navigator.vibrate?.(12);
      } catch {
        /* vibration unavailable */
      }
    }
    if (
      result.completed &&
      prevBest > 0 &&
      merged.weight_used_lbs > prevBest
    ) {
      toast({
        title: "New PR! 🏆",
        description: `${merged.weight_used_lbs} lb on ${exerciseName} — beats your previous best of ${prevBest} lb.`,
      });
      try {
        navigator.vibrate?.([80, 60, 80]);
      } catch {
        /* vibration unavailable */
      }
    }
    if (result.completed && result.sessionComplete) {
      toast({
        title: "Session complete! 💪",
        description: `All sets logged for Week ${currentWeek} · ${def.shortName}. Recovery time!`,
      });
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        icon={Dumbbell}
        title="Interactive Workout Logger"
        subtitle={`Week ${currentWeek} · ${selectedDay}${isRestDay ? " (rest day)" : ""}`}
      />

      {/* Rest-day banner */}
      {isRestDay ? (
        <TipCallout variant="steel">
          <Info className="mr-1 inline h-3.5 w-3.5 -translate-y-px" aria-hidden="true" />
          {selectedDay} is a scheduled rest day. You can still log a bonus session —
          pick a routine below.
        </TipCallout>
      ) : null}

      {/* Routine segmented control */}
      <div
        className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-charcoal-850 p-1"
        role="group"
        aria-label="Routine selection"
      >
        {(Object.keys(routines) as RoutineId[]).map((r) => {
          const active = r === routine;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => setRoutineOverride(r)}
              className={cn(
                "min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                active
                  ? "bg-steel-600 text-white shadow-md shadow-steel-700/30"
                  : "text-slate-400 hover:bg-charcoal-800 hover:text-steel-300"
              )}
            >
              {routines[r].shortName}
            </button>
          );
        })}
      </div>

      {/* Phase-driven logging prompt (auto-adjusts with week/phase) */}
      <div className="rounded-xl border border-steel-500/25 bg-steel-600/10 px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-mint-500/40 bg-mint-500/10 px-2 py-0.5 text-[11px] font-bold text-mint-400">
            PHASE {phase.id} · W{phase.weeks[0]}–{phase.weeks[1]}
          </span>
          <span className="text-xs font-semibold text-steel-200">
            Week {currentWeek} · {phase.effort}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-steel-200/90">{phase.tag}</p>
      </div>

      {/* Session progress */}
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-steel-100">{def.name}</p>
            <p className="text-xs text-muted-foreground">
              {done}/{total} sets logged · {restLabel}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                disabled={!session}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border bg-charcoal-900">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes all logged sets for Week {currentWeek} ·{" "}
                  {selectedDay} ({def.shortName}). This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => resetSession(currentWeek, selectedDay, routine)}
                >
                  Reset session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Progress
          value={pct}
          aria-label={`${done} of ${total} sets logged`}
          className="mt-3 h-2 bg-charcoal-800 [&_[data-slot=progress-indicator]]:bg-mint-500"
        />
        {total > 0 && done === total ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 text-center text-xs font-semibold text-mint-400"
          >
            Session complete — every set locked in. See you next session! 🎉
          </motion.p>
        ) : null}
      </div>

      {/* Exercise cards */}
      <div className="space-y-4">
        {exercises.map((ex) => {
          const exDone = ex.sets.filter((s) => s.is_completed).length;
          const allDone = exDone === ex.sets.length;
          // Double-progression nudge: every set currently shows 12 reps
          // (weighted exercises only — plank is seconds-based).
          const allTwelvePrev =
            ex.usesWeight &&
            ex.sets.length > 0 &&
            ex.sets.every((s) => s.reps_completed === 12);
          // Highlight the single heaviest completed set as the current PR
          const exBest = bestWeightForExercise(sessions, ex.id);
          const prSetNumber = ex.sets.find(
            (s) =>
              s.is_completed && s.weight_used_lbs > 0 && s.weight_used_lbs >= exBest
          )?.set_number;
          return (
            <div
              key={ex.id}
              className={cn(
                "rounded-2xl border bg-card p-4 transition-colors",
                allDone ? "border-mint-500/40" : "border-border/70"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-steel-100">
                      {ex.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {ex.sets.length} sets · Target: {ex.repTarget}
                    </p>
                  </div>
                  <ExerciseGuideButton exerciseId={ex.id} exerciseName={ex.name} />
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    allDone
                      ? "border-mint-500/50 bg-mint-500/15 text-mint-400"
                      : "border-border bg-charcoal-850 text-muted-foreground"
                  )}
                >
                  {allDone ? "DONE" : `${exDone}/${ex.sets.length} sets`}
                </span>
              </div>

              {allTwelvePrev ? (
                <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-mint-500/30 bg-mint-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-mint-300">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    You hit 12 reps on every set last week — add the smallest jump
                    (+2.5–5 lb) and drop back to 8 reps.
                  </span>
                </div>
              ) : null}

              {/* Set rows */}
              <div className="mt-3 space-y-2">
                {ex.sets.map((set) => (
                  <SetRow
                    key={set.set_number}
                    exerciseName={ex.name}
                    usesWeight={ex.usesWeight}
                    repTarget={ex.repTarget}
                    restLabel={restLabel}
                    restSeconds={restSeconds}
                    merged={set}
                    showPr={set.set_number === prSetNumber && exBest > 0}
                    onInput={(patch) =>
                      updateSetInput(
                        currentWeek,
                        selectedDay,
                        routine,
                        ex.id,
                        set.set_number,
                        patch
                      )
                    }
                    onCheck={() => handleCheck(ex.id, ex.name, set.set_number, set)}
                    onRest={() =>
                      startRestTimer(
                        restSeconds,
                        `Set ${set.set_number} · ${ex.name}`
                      )
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetRow({
  exerciseName,
  usesWeight,
  repTarget,
  restLabel,
  restSeconds,
  merged,
  showPr,
  onInput,
  onCheck,
  onRest,
}: {
  exerciseName: string;
  usesWeight: boolean;
  repTarget: string;
  restLabel: string;
  restSeconds: number;
  merged: MergedSet;
  showPr: boolean;
  onInput: (patch: {
    weight_used_lbs?: number;
    reps_completed?: number;
    note?: string;
  }) => void;
  onCheck: () => void;
  onRest: () => void;
}) {
  const locked = merged.is_completed;
  const note = typeof merged.note === "string" ? merged.note : "";
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note);
  const num = (raw: string): number => {
    const v = Number(raw);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };

  const openNote = () => {
    setNoteDraft(note);
    setNoteOpen(true);
  };

  const commitNote = () => {
    setNoteOpen(false);
    if (noteDraft.trim() !== note) onInput({ note: noteDraft });
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 transition-colors",
        locked
          ? "border-mint-500/40 bg-mint-500/[0.07]"
          : "border-border/70 bg-charcoal-850"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-charcoal-800 text-[11px] font-bold tabular-nums text-steel-300">
          {merged.set_number}
        </span>
        <span className="text-xs text-muted-foreground">
          Target: <span className="font-medium text-steel-300">{repTarget}</span>
        </span>
        <button
          type="button"
          onClick={onRest}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-steel-500/30 bg-steel-600/15 px-2 py-1 text-[11px] font-medium text-steel-300 transition hover:border-steel-400/60 hover:bg-steel-600/25"
          aria-label={`Start ${restSeconds} second rest timer for set ${merged.set_number} of ${exerciseName}`}
          title={`Start rest timer (${restSeconds}s)`}
        >
          <Timer className="h-3 w-3" aria-hidden="true" />
          {restLabel}
        </button>
        <button
          type="button"
          onClick={noteOpen ? commitNote : openNote}
          aria-label={
            note
              ? `Edit note for set ${merged.set_number} of ${exerciseName}: ${note}`
              : `Add a note to set ${merged.set_number} of ${exerciseName}`
          }
          aria-expanded={noteOpen}
          title="Set note"
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md border transition",
            note
              ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
              : "border-border bg-charcoal-800 text-slate-500 hover:border-steel-500/50 hover:text-steel-300"
          )}
        >
          <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {merged.fromHistory ? (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-border bg-charcoal-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
            title="Pre-filled from your last logged session"
          >
            last wk
          </span>
        ) : null}
        {showPr ? (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-mint-500/50 bg-mint-500/15 px-1.5 py-0.5 text-[10px] font-bold text-mint-400"
            title="Your heaviest completed set on this exercise"
          >
            🏆 PR
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {usesWeight ? (
          <label className="min-w-0 flex-1">
            <span className="sr-only">Weight in lbs for set {merged.set_number} of {exerciseName}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={2.5}
              disabled={locked}
              value={merged.weight_used_lbs || ""}
              placeholder="lbs"
              onChange={(e) => onInput({ weight_used_lbs: num(e.target.value) })}
              className="h-11 w-full rounded-lg border border-border bg-charcoal-900 px-2.5 text-center text-base font-semibold tabular-nums text-steel-100 placeholder:text-slate-500 focus:border-steel-500/60 disabled:opacity-50"
            />
          </label>
        ) : (
          <div className="grid h-11 min-w-0 flex-1 place-items-center rounded-lg border border-border bg-charcoal-900 text-xs font-medium text-muted-foreground">
            Bodyweight
          </div>
        )}
        <label className="min-w-0 flex-1">
          <span className="sr-only">
            {usesWeight ? "Reps" : "Seconds held"} for set {merged.set_number} of {exerciseName}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            disabled={locked}
            value={merged.reps_completed || ""}
            placeholder={usesWeight ? "reps" : "sec"}
            onChange={(e) => onInput({ reps_completed: num(e.target.value) })}
            className="h-11 w-full rounded-lg border border-border bg-charcoal-900 px-2.5 text-center text-base font-semibold tabular-nums text-steel-100 placeholder:text-slate-500 focus:border-steel-500/60 disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          onClick={onCheck}
          aria-pressed={locked}
          aria-label={
            locked
              ? `Unlog set ${merged.set_number} of ${exerciseName}`
              : `Log set ${merged.set_number} of ${exerciseName}`
          }
          className={cn(
            "grid h-11 w-12 shrink-0 place-items-center rounded-lg border transition-all active:scale-95",
            locked
              ? "border-mint-500/60 bg-mint-500/20 text-mint-400 shadow-[0_0_14px_rgba(61,255,168,0.25)]"
              : "border-border bg-charcoal-800 text-slate-500 hover:border-mint-500/40 hover:text-mint-400"
          )}
        >
          {locked ? (
            <Lock className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {locked ? (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-mint-400/80">
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
          Logged &amp; locked — tap the lock to edit.
        </p>
      ) : null}

      {/* Per-set note: collapsible editor + saved display */}
      {noteOpen ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="mt-2 flex items-center gap-1.5">
            <label className="min-w-0 flex-1">
              <span className="sr-only">
                Note for set {merged.set_number} of {exerciseName}
              </span>
              <input
                type="text"
                autoFocus
                maxLength={SET_NOTE_MAX_CHARS}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNote();
                  if (e.key === "Escape") setNoteOpen(false);
                }}
                placeholder={`e.g. felt heavy, RPE 9 (max ${SET_NOTE_MAX_CHARS})`}
                className="h-9 w-full rounded-lg border border-amber-500/40 bg-charcoal-900 px-2.5 text-xs font-medium text-steel-100 placeholder:text-slate-500 focus:border-amber-500/60"
              />
            </label>
            <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
              {noteDraft.length}/{SET_NOTE_MAX_CHARS}
            </span>
            <button
              type="button"
              onClick={commitNote}
              aria-label="Save note"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-mint-500/40 bg-mint-500/10 text-mint-400 transition hover:bg-mint-500/20"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              aria-label="Close note editor without saving"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-charcoal-800 text-slate-400 transition hover:text-steel-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      ) : note ? (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] italic leading-relaxed text-amber-500/90">
          <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          {note}
        </p>
      ) : null}
    </div>
  );
}
