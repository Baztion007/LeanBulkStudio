import type {
  BackupData,
  BackupFile,
  DayName,
  DumbbellHandle,
  ExerciseDef,
  ExercisePR,
  HistoryRow,
  MacroTargets,
  MuscleGroupSlice,
  PhaseId,
  Plate,
  PlateSolverResult,
  PRDetail,
  RoutineDef,
  RoutineId,
  SetLog,
  WeekConsistency,
  WeightLog,
  WeightTrendResult,
  WeeklySchedule,
  WeeklyVolumePoint,
  WorkoutSession,
} from "./types";
import {
  ACTIVITY_LEVELS,
  DAYS,
  DEFAULT_HANDLES,
  DEFAULT_PLATES,
  DEFAULT_ROUTINES,
  DEFAULT_SCHEDULE,
  EXERCISES_PER_ROUTINE_MAX,
  EXERCISE_NAME_MAX,
  EXERCISE_REP_TARGET_MAX,
  GAIN_RATE_MAX_PCT,
  GAIN_RATE_MIN_PCT,
  MAX_KIT_PLATES,
  PROGRAM_WEEKS,
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  ROUTINE_FOCUS_MAX,
  ROUTINE_NAME_MAX,
  ROUTINE_SHORT_MAX,
  SET_NOTE_MAX_CHARS,
  SURPLUS_KCAL,
  dayIndex,
} from "./constants";

/* --------------------------------- Calculator ------------------------------ */

/**
 * Mifflin-St Jeor simplified baseline: Weight (kg) * 24 * Activity Factor
 * Target Bulking Calories = round(maintenance + 400)
 */
export function computeTargets(
  weightKg: number,
  activityFactor: number
): MacroTargets {
  const w = weightKg > 0 ? weightKg : 0;
  const maintenance = w * 24 * activityFactor;
  const calories = Math.round(maintenance + SURPLUS_KCAL);
  const protein = Math.round(w * 1.8);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return {
    maintenance: Math.round(maintenance),
    calories,
    protein,
    fat,
    carbs,
  };
}

/* ------------------------------ Session helpers ---------------------------- */

/** Sessions are keyed by week, day AND routine (A/B can share a day). */
export function sessionKey(
  week: number,
  day: DayName,
  routine: RoutineId
): string {
  return `${week}:${day}:${routine}`;
}

/** All sessions (any routine) logged for a given week/day. */
export function getSessionsForDay(
  sessions: Record<string, WorkoutSession>,
  week: number,
  day: DayName
): WorkoutSession[] {
  return Object.values(sessions).filter(
    (s) => s.week_number === week && s.day_name === day
  );
}

export function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Most recent session (same routine) that happened strictly BEFORE the given
 * week/day — used to pre-fill weight/reps inputs ("last week's numbers").
 */
export function getLatestPriorSession(
  sessions: Record<string, WorkoutSession>,
  week: number,
  day: DayName,
  routine: RoutineId
): WorkoutSession | null {
  const candidates = Object.values(sessions)
    .filter(
      (s) =>
        s.routine === routine &&
        (s.week_number < week ||
          (s.week_number === week && dayIndex(s.day_name) < dayIndex(day)))
    )
    .sort(
      (a, b) =>
        a.week_number - b.week_number ||
        dayIndex(a.day_name) - dayIndex(b.day_name)
    );
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

/** Latest session for a given routine inside a week (used by the macro matrix) */
export function getLatestSessionInWeek(
  sessions: Record<string, WorkoutSession>,
  week: number,
  routine: RoutineId
): WorkoutSession | null {
  const inWeek = Object.values(sessions)
    .filter((s) => s.week_number === week && s.routine === routine)
    .sort((a, b) => dayIndex(a.day_name) - dayIndex(b.day_name));
  return inWeek.length > 0 ? inWeek[inWeek.length - 1] : null;
}

export function sessionIsComplete(session: WorkoutSession): boolean {
  return session.exercise_logs.every((ex) =>
    ex.sets.every((st) => st.is_completed)
  );
}

export function countCompletedSets(session: WorkoutSession | undefined): {
  done: number;
  total: number;
} {
  if (!session) return { done: 0, total: 0 };
  let done = 0;
  let total = 0;
  for (const ex of session.exercise_logs) {
    for (const st of ex.sets) {
      total += 1;
      if (st.is_completed) done += 1;
    }
  }
  return { done, total };
}

/**
 * "15 × 10·10·9" style summary for matrix/chart cells.
 * IMPORTANT: only sets that were actually checked off (`is_completed`) count —
 * pre-seeded but unperformed values must never fabricate history.
 */
export function summarizeExerciseSets(
  session: WorkoutSession | null,
  exerciseId: string
): { weight: number; reps: number[]; allTwelve: boolean; logged: boolean } {
  const empty = { weight: 0, reps: [], allTwelve: false, logged: false };
  if (!session) return empty;
  const log = session.exercise_logs.find((e) => e.exercise_id === exerciseId);
  if (!log) return empty;
  const done = log.sets.filter((s) => s.is_completed);
  if (done.length === 0) return empty;
  const weight = Math.max(...done.map((s) => s.weight_used_lbs ?? 0));
  const reps = done.map((s) => s.reps_completed ?? 0);
  const allTwelve = done.every((s) => s.reps_completed === 12);
  return { weight, reps, allTwelve, logged: true };
}

/* --------------------------------- Formatting ------------------------------ */

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatMl(ml: number): string {
  return `${ml.toLocaleString()} ml`;
}

export function formatKcal(kcal: number): string {
  return `${kcal.toLocaleString()} kcal`;
}

export function formatKg(kg: number): string {
  return `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg`;
}

/* ------------------------------- Body weight ------------------------------- */

/** Local-timezone "YYYY-MM-DD" (never use toISOString — it shifts to UTC) */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "2025-01-06" → "Jan 6" in the user's locale */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(dt.getTime())
    ? iso
    : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Body-weight trend for the lean-bulk feedback loop: entries sorted ascending,
 * plus an average weekly gain rate compared against the +0.25–0.5 % BW/week
 * healthy-gain window. Needs ≥ 2 entries spanning ≥ 7 days for a verdict.
 */
export function weightTrend(weightLog: WeightLog): WeightTrendResult {
  const entries = Object.entries(weightLog)
    .filter(([, kg]) => typeof kg === "number" && Number.isFinite(kg) && kg > 0)
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const base = {
    entries,
    latestKg: latest ? latest.kg : null,
    latestDate: latest ? latest.date : null,
    weeklyRateKg: null,
    status: "insufficient" as const,
  };
  const first = entries[0];
  if (entries.length < 2 || !latest || !first) return base;
  const spanDays = Math.round(
    (Date.parse(`${latest.date}T00:00:00`) -
      Date.parse(`${first.date}T00:00:00`)) /
      86_400_000
  );
  if (!Number.isFinite(spanDays) || spanDays < 7) return base;
  const weeklyRateKg = ((latest.kg - first.kg) / spanDays) * 7;
  const status =
    weeklyRateKg > latest.kg * GAIN_RATE_MAX_PCT
      ? ("too-fast" as const)
      : weeklyRateKg < latest.kg * GAIN_RATE_MIN_PCT
        ? ("too-slow" as const)
        : ("on-track" as const);
  return { ...base, weeklyRateKg, status };
}

/* ------------------------------ Session history ----------------------------- */

/**
 * Sessions with at least one completed set, newest first, with summaries.
 * Iterates each session's OWN exercise logs (not the current program) so
 * renaming/deleting exercises in the Program Builder never erases history.
 */
export function buildHistory(
  sessions: Record<string, WorkoutSession>,
  routines: Record<RoutineId, RoutineDef>
): HistoryRow[] {
  return Object.values(sessions)
    .filter((s) =>
      s.exercise_logs.some((ex) => ex.sets.some((st) => st.is_completed))
    )
    .map((s) => {
      const { done, total } = countCompletedSets(s);
      const defById = new Map(
        (routines[s.routine]?.exercises ?? []).map((ex) => [ex.id, ex])
      );
      return {
        key: sessionKey(s.week_number, s.day_name, s.routine),
        week: s.week_number,
        day: s.day_name,
        routine: s.routine,
        done,
        total,
        complete: sessionIsComplete(s),
        exercises: s.exercise_logs.map((log) => {
          const sum = summarizeExerciseSets(s, log.exercise_id);
          const notePairs = log.sets
            .filter(
              (st) =>
                st.is_completed &&
                typeof st.note === "string" &&
                st.note.trim().length > 0
            )
            .map((st) => ({ set: st.set_number, note: (st.note as string).trim() }));
          const def = defById.get(log.exercise_id);
          return {
            id: log.exercise_id,
            name: log.exercise_name,
            usesWeight:
              def?.usesWeight ??
              log.sets.some((st) => (st.weight_used_lbs ?? 0) > 0),
            weight: sum.weight,
            reps: sum.reps,
            notePairs,
            logged: sum.logged,
          };
        }),
      };
    })
    .sort(
      (a, b) =>
        b.week - a.week ||
        dayIndex(b.day) - dayIndex(a.day) ||
        (a.routine < b.routine ? -1 : 1)
    );
}

/**
 * Per-week count of fully-completed scheduled sessions, compared against the
 * number of training days in the user's customized weekly schedule.
 */
export function weeklyConsistency(
  sessions: Record<string, WorkoutSession>,
  schedule: WeeklySchedule,
  programWeeks: number = PROGRAM_WEEKS
): WeekConsistency[] {
  const planned = DAYS.filter((d) => schedule[d] !== null).length;
  const rows: WeekConsistency[] = [];
  for (let w = 1; w <= programWeeks; w++) {
    let done = 0;
    for (const day of DAYS) {
      const routine = schedule[day];
      if (!routine) continue;
      const s = sessions[sessionKey(w, day, routine)];
      if (s && sessionIsComplete(s)) done += 1;
    }
    rows.push({ week: w, done, planned });
  }
  return rows;
}

/**
 * Consecutive fully-completed scheduled sessions counting backwards from
 * today. Today's not-yet-done session never breaks the streak; the first
 * missed scheduled session does. Rest days are transparent.
 */
export function currentStreak(
  sessions: Record<string, WorkoutSession>,
  currentWeek: number,
  today: DayName,
  schedule: WeeklySchedule
): number {
  let streak = 0;
  let atCurrentWeek = true;
  for (let w = currentWeek; w >= 1; w--) {
    const startDay = atCurrentWeek ? dayIndex(today) : DAYS.length - 1;
    for (let d = startDay; d >= 0; d--) {
      const routine = schedule[DAYS[d]];
      if (!routine) continue; // rest day — invisible to the streak
      const s = sessions[sessionKey(w, DAYS[d], routine)];
      if (s && sessionIsComplete(s)) {
        streak += 1;
        continue;
      }
      // Today may still be pending — don't punish it; any earlier miss ends it.
      if (atCurrentWeek && d === dayIndex(today)) continue;
      return streak;
    }
    atCurrentWeek = false;
  }
  return streak;
}

/* ------------------------------- Records & goals --------------------------- */

/**
 * Epley estimated one-rep max: w × (1 + reps / 30).
 * Returns 0 for meaningless inputs (no weight or no reps).
 */
export function estimate1RM(weightLbs: number, reps: number): number {
  if (weightLbs <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightLbs;
  return Math.round(weightLbs * (1 + reps / 30) * 10) / 10;
}

/** Is session (a) strictly more recent than the achievement recorded in detail? */
function isMoreRecent(
  week: number,
  day: DayName,
  d: PRDetail
): boolean {
  return (
    week > d.week ||
    (week === d.week && dayIndex(day) > dayIndex(d.day))
  );
}

/**
 * Personal-record scan across every weighted exercise. Only COMPLETED sets
 * with weight > 0 and reps > 0 count (pre-seeded values never fabricate PRs).
 * Plank is excluded — its "reps" are seconds, so 1RM math doesn't apply.
 */
export function computePRs(
  sessions: Record<string, WorkoutSession>,
  routines: Record<RoutineId, RoutineDef>
): ExercisePR[] {
  const out: ExercisePR[] = [];
  for (const routineId of Object.keys(routines) as RoutineId[]) {
    for (const ex of routines[routineId].exercises) {
      if (!ex.usesWeight) continue;
      let best: PRDetail | null = null;
      let e1rm: (PRDetail & { valueLbs: number }) | null = null;
      let bestVolume: (PRDetail & { volumeLbs: number }) | null = null;
      let totalSets = 0;

      for (const s of Object.values(sessions)) {
        for (const log of s.exercise_logs) {
          if (log.exercise_id !== ex.id) continue;
          for (const st of log.sets) {
            if (!st.is_completed) continue;
            const w = st.weight_used_lbs ?? 0;
            const r = st.reps_completed ?? 0;
            if (w <= 0 || r <= 0) continue;
            totalSets += 1;
            const cand: PRDetail = {
              weightLbs: w,
              reps: r,
              week: s.week_number,
              day: s.day_name,
            };
            if (
              !best ||
              w > best.weightLbs ||
              (w === best.weightLbs && isMoreRecent(s.week_number, s.day_name, best))
            ) {
              best = { ...cand };
            }
            const est = estimate1RM(w, r);
            if (
              !e1rm ||
              est > e1rm.valueLbs ||
              (est === e1rm.valueLbs && isMoreRecent(s.week_number, s.day_name, e1rm))
            ) {
              e1rm = { ...cand, valueLbs: est };
            }
            const vol = Math.round(w * r);
            if (
              !bestVolume ||
              vol > bestVolume.volumeLbs ||
              (vol === bestVolume.volumeLbs && isMoreRecent(s.week_number, s.day_name, bestVolume))
            ) {
              bestVolume = { ...cand, volumeLbs: vol };
            }
          }
        }
      }

      out.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        routine: routineId,
        best,
        e1rm,
        bestVolume,
        totalCompletedSets: totalSets,
      });
    }
  }
  return out;
}

/* ------------------------------ Volume analytics ----------------------------- */

/** Weekly tonnage (lb × reps of completed sets) + completed-set counts, W1–W6. */
export function weeklyVolumeSeries(
  sessions: Record<string, WorkoutSession>
): WeeklyVolumePoint[] {
  const rows: WeeklyVolumePoint[] = Array.from(
    { length: PROGRAM_WEEKS },
    (_, i) => ({ week: i + 1, volumeLbs: 0, sets: 0 })
  );
  for (const s of Object.values(sessions)) {
    if (s.week_number < 1 || s.week_number > PROGRAM_WEEKS) continue;
    const row = rows[s.week_number - 1];
    for (const log of s.exercise_logs) {
      for (const st of log.sets) {
        if (!st.is_completed) continue;
        row.sets += 1;
        row.volumeLbs += (st.weight_used_lbs ?? 0) * (st.reps_completed ?? 0);
      }
    }
  }
  for (const row of rows) row.volumeLbs = Math.round(row.volumeLbs);
  return rows;
}

/** Exercise-id → muscle group for the volume split. */
const MUSCLE_GROUP_BY_EXERCISE: Record<string, "push" | "pull" | "legs" | "core"> = {
  "floor-press": "push",
  "overhead-press": "push",
  "tricep-extension": "push",
  "single-arm-row": "pull",
  "bicep-curls": "pull",
  "goblet-squat": "legs",
  "romanian-deadlift": "legs",
  "split-squat": "legs",
  "calf-raises": "legs",
  plank: "core",
};

const MUSCLE_GROUP_LABEL: Record<"push" | "pull" | "legs" | "core", string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
};

/** Completed sets + tonnage per muscle group across the whole cycle. */
export function muscleGroupSplit(
  sessions: Record<string, WorkoutSession>
): MuscleGroupSlice[] {
  const acc: Record<"push" | "pull" | "legs" | "core", { sets: number; volumeLbs: number }> = {
    push: { sets: 0, volumeLbs: 0 },
    pull: { sets: 0, volumeLbs: 0 },
    legs: { sets: 0, volumeLbs: 0 },
    core: { sets: 0, volumeLbs: 0 },
  };
  for (const s of Object.values(sessions)) {
    for (const log of s.exercise_logs) {
      const group = MUSCLE_GROUP_BY_EXERCISE[log.exercise_id];
      if (!group) continue;
      for (const st of log.sets) {
        if (!st.is_completed) continue;
        acc[group].sets += 1;
        acc[group].volumeLbs +=
          (st.weight_used_lbs ?? 0) * (st.reps_completed ?? 0);
      }
    }
  }
  return (Object.keys(acc) as (keyof typeof acc)[]).map((g) => ({
    group: g,
    label: MUSCLE_GROUP_LABEL[g],
    sets: acc[g].sets,
    volumeLbs: Math.round(acc[g].volumeLbs),
  }));
}

/* -------------------------------- Plate solver ------------------------------- */

const eq = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/**
 * Every target weight the current inventory can produce.
 * - "both": two dumbbells loaded to the SAME target (plates split evenly)
 * - "single": one dumbbell loaded as heavy as possible to that target
 */
export function achievablePlateTargets(
  handles: DumbbellHandle[],
  plates: Plate[],
  mode: "both" | "single"
): number[] {
  const n = plates.length;
  if (handles.length === 0 || n === 0) return [];
  const weights = plates.map((p) => p.weight_lbs);

  // All 2^n subset sums (kit inventories are tiny — this is exhaustive & exact)
  const bySum = new Map<number, number[]>(); // sum → bitmasks
  for (let mask = 0; mask < 1 << n; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sum += weights[i];
    sum = Math.round(sum * 100) / 100;
    const list = bySum.get(sum);
    if (list) list.push(mask);
    else bySum.set(sum, [mask]);
  }

  const targets = new Set<number>();
  if (mode === "single") {
    for (const sum of bySum.keys()) {
      for (const h of handles) targets.add(h.empty_weight_lbs + sum);
    }
  } else {
    // Both handles loaded to the same target: need disjoint subsets with
    // sums (T - e1) and (T - e2).
    const entries = [...bySum.entries()];
    for (const [s1, masks1] of entries) {
      for (const h1 of handles) {
        const target = h1.empty_weight_lbs + s1;
        for (const h2 of handles) {
          if (h2.id === h1.id) continue;
          const need2 = Math.round((target - h2.empty_weight_lbs) * 100) / 100;
          const masks2 = bySum.get(need2);
          if (!masks2) continue;
          const disjoint = masks2.some(
            (m2) => masks1.some((m1) => (m1 & m2) === 0)
          );
          if (disjoint) {
            targets.add(target);
            break;
          }
        }
      }
    }
  }
  return [...targets].sort((a, b) => a - b);
}

/**
 * Exact-load search: can the plate pool produce `targetLbs` per handle?
 * Depth-first over plates (largest first) with suffix-sum pruning — exact for
 * any inventory size the kit can hold, and prefers fewer/larger plates.
 */
function findPlateAssignment(
  plates: Plate[],
  needs: [number, number]
): { a1: Plate[]; a2: Plate[]; leftover: Plate[] } | null {
  const sorted = [...plates].sort((a, b) => b.weight_lbs - a.weight_lbs);
  const [need1, need2] = needs;
  if (need1 < -1e-9 || need2 < -1e-9) return null;

  const suffix = new Array<number>(sorted.length + 1).fill(0);
  for (let i = sorted.length - 1; i >= 0; i--) {
    suffix[i] = suffix[i + 1] + sorted[i].weight_lbs;
  }
  if (need1 + need2 > suffix[0] + 1e-9) return null;

  const a1: Plate[] = [];
  const a2: Plate[] = [];

  const dfs = (i: number, s1: number, s2: number): boolean => {
    if (s1 > need1 + 1e-9 || s2 > need2 + 1e-9) return false;
    if (eq(s1, need1) && eq(s2, need2)) return true;
    if (i >= sorted.length) return false;
    // Remaining plates can't cover the outstanding deficit → prune
    if (need1 - s1 + need2 - s2 > suffix[i] + 1e-9) return false;
    const p = sorted[i];
    // Prefer the heaviest plate on handle 1, then handle 2, then skip —
    // this finds solutions using the fewest, largest plates first.
    a1.push(p);
    if (dfs(i + 1, s1 + p.weight_lbs, s2)) return true;
    a1.pop();
    a2.push(p);
    if (dfs(i + 1, s1, s2 + p.weight_lbs)) return true;
    a2.pop();
    return dfs(i + 1, s1, s2);
  };

  if (!dfs(0, 0, 0)) return null;
  const used = new Set([...a1, ...a2].map((p) => p.plate_id));
  return {
    a1: [...a1].sort((x, y) => y.weight_lbs - x.weight_lbs),
    a2: [...a2].sort((x, y) => y.weight_lbs - x.weight_lbs),
    leftover: plates.filter((p) => !used.has(p.plate_id)),
  };
}

/**
 * Solve "load my dumbbell(s) to X lb" against the REAL inventory.
 * Returns an exact per-handle plate list ready to apply, or a failure with
 * the nearest achievable targets.
 */
export function solvePlates(
  targetLbs: number,
  handles: DumbbellHandle[],
  plates: Plate[],
  mode: "both" | "single"
): PlateSolverResult {
  const achievable = achievablePlateTargets(handles, plates, mode);
  const min = achievable.length > 0 ? achievable[0] : 0;
  const max = achievable.length > 0 ? achievable[achievable.length - 1] : 0;

  if (handles.length === 0 || plates.length === 0 || targetLbs < min) {
    return {
      ok: false,
      targetLbs,
      reason: "too-light",
      minTargetLbs: min,
      maxTargetLbs: max,
      suggestions: achievable.slice(0, 2),
      achievable,
    };
  }
  if (targetLbs > max) {
    return {
      ok: false,
      targetLbs,
      reason: "too-heavy",
      minTargetLbs: min,
      maxTargetLbs: max,
      suggestions: achievable.slice(-2),
      achievable,
    };
  }

  const [h1, h2] = handles;
  const needs: [number, number] =
    mode === "single"
      ? [targetLbs - h1.empty_weight_lbs, 0]
      : [targetLbs - h1.empty_weight_lbs, targetLbs - h2.empty_weight_lbs];

  const solved = findPlateAssignment(plates, needs);
  if (!solved) {
    const below = [...achievable].reverse().find((t) => t < targetLbs);
    const above = achievable.find((t) => t > targetLbs);
    return {
      ok: false,
      targetLbs,
      reason: "not-achievable",
      minTargetLbs: min,
      maxTargetLbs: max,
      suggestions: [below, above].filter((t): t is number => t != null),
      achievable,
    };
  }

  const sum = (list: Plate[]) => list.reduce((acc, p) => acc + p.weight_lbs, 0);
  const assignments: Record<string, string> = {};
  for (const p of solved.a1) assignments[p.plate_id] = h1.id;
  if (mode === "both") for (const p of solved.a2) assignments[p.plate_id] = h2.id;

  const handlesOut = [
    {
      handleId: h1.id,
      handleName: h1.name,
      emptyLbs: h1.empty_weight_lbs,
      plates: solved.a1,
      totalLbs: h1.empty_weight_lbs + sum(solved.a1),
    },
    {
      handleId: h2.id,
      handleName: h2.name,
      emptyLbs: h2.empty_weight_lbs,
      plates: mode === "both" ? solved.a2 : [],
      totalLbs: mode === "both" ? h2.empty_weight_lbs + sum(solved.a2) : h2.empty_weight_lbs,
    },
  ];

  return {
    ok: true,
    targetLbs,
    handles: handlesOut,
    leftovers: solved.leftover.sort((a, b) => b.weight_lbs - a.weight_lbs),
    assignments,
  };
}

/* --------------------------------- Cloud sync -------------------------------- */

/** Unambiguous 10-char code (no 0/O/1/I) for keying a cloud snapshot. */
export function generateSyncCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // 10 chars over a 31-symbol alphabet ≈ 8×10¹⁴ combinations — unguessable
  // even against the server's per-IP rate limit.
  const bytes = new Uint8Array(10);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/* ----------------------- More records (set-level bests) --------------------- */

/**
 * Heaviest weight ever logged on a COMPLETED set for an exercise.
 * Optionally excludes one set (the one currently being graded) so a set can
 * be compared against everything that came before it.
 */
export function bestWeightForExercise(
  sessions: Record<string, WorkoutSession>,
  exerciseId: string,
  exclude?: { sessionKey: string; setNumber: number }
): number {
  let best = 0;
  for (const [key, s] of Object.entries(sessions)) {
    for (const log of s.exercise_logs) {
      if (log.exercise_id !== exerciseId) continue;
      for (const st of log.sets) {
        if (!st.is_completed) continue;
        if (exclude && key === exclude.sessionKey && st.set_number === exclude.setNumber)
          continue;
        const w = st.weight_used_lbs ?? 0;
        if (w > best) best = w;
      }
    }
  }
  return best;
}

/**
 * Whole-program completion (all 24 scheduled sessions across 6 weeks done).
 * Powers the graduation celebration + "start next cycle" flow.
 */
export function programCompletion(
  sessions: Record<string, WorkoutSession>,
  schedule: WeeklySchedule
): { complete: boolean; done: number; planned: number } {
  const rows = weeklyConsistency(sessions, schedule);
  const done = rows.reduce((acc, w) => acc + w.done, 0);
  const planned = rows.reduce((acc, w) => acc + w.planned, 0);
  return { complete: done >= planned, done, planned };
}

/** Total reps + volume (lb × rep) across every completed set — graduation stats. */
export function totalVolume(
  sessions: Record<string, WorkoutSession>
): { sets: number; volumeLbs: number } {
  let sets = 0;
  let volumeLbs = 0;
  for (const s of Object.values(sessions)) {
    for (const log of s.exercise_logs) {
      for (const st of log.sets) {
        if (!st.is_completed) continue;
        sets += 1;
        volumeLbs += (st.weight_used_lbs ?? 0) * (st.reps_completed ?? 0);
      }
    }
  }
  return { sets, volumeLbs: Math.round(volumeLbs) };
}

/* ---------------------------------- Backup --------------------------------- */

export const BACKUP_SCHEMA = 5 as const;

export function buildBackup(data: BackupData): BackupFile {
  return {
    app: "lean-bulk-studio",
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    data,
  };
}

function sanitizeWater(raw: unknown): Record<DayName, number> {
  const src = (raw ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    DAYS.map((day) => {
      const v = src[day];
      return [
        day,
        typeof v === "number" && Number.isFinite(v)
          ? Math.min(8, Math.max(0, Math.round(v)))
          : 0,
      ];
    })
  ) as Record<DayName, number>;
}

/** Snap a lb value onto the 0.25 lb grid inside [min, max]. */
function clampQuarterLb(v: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, v)) * 4) / 4;
}

/** Trim to a hard length cap, stripping control characters. */
function safeText(raw: unknown, max: number, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const t = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return t.length > 0 ? t.slice(0, max) : fallback;
}

/**
 * Defensive sanitizer for user-customized programs (backup import + cloud
 * sync): both routines must exist with at least one exercise, every exercise
 * is rebuilt field-by-field with unique ids, and the schedule maps each day
 * to A, B or null. Anything malformed falls back to the shipped defaults.
 */
export function sanitizeRoutines(raw: unknown): Record<RoutineId, RoutineDef> {
  const out: Record<RoutineId, RoutineDef> = {
    A: {
      ...DEFAULT_ROUTINES.A,
      exercises: DEFAULT_ROUTINES.A.exercises.map((ex) => ({ ...ex })),
    },
    B: {
      ...DEFAULT_ROUTINES.B,
      exercises: DEFAULT_ROUTINES.B.exercises.map((ex) => ({ ...ex })),
    },
  };
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;
  const usedIds = new Set<string>();

  for (const rid of ["A", "B"] as RoutineId[]) {
    const entry = src[rid] as Record<string, unknown> | undefined;
    if (!entry || typeof entry !== "object") continue;

    const exercises: ExerciseDef[] = [];
    if (Array.isArray(entry.exercises)) {
      for (
        const e of entry.exercises.slice(0, EXERCISES_PER_ROUTINE_MAX)
      ) {
        const o = (e ?? {}) as Record<string, unknown>;
        let id =
          typeof o.id === "string" &&
          o.id.trim().length > 0 &&
          o.id.length <= 64 &&
          !usedIds.has(o.id)
            ? o.id
            : "";
        if (!id) {
          id = `ex_${rid.toLowerCase()}_${exercises.length}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;
        }
        usedIds.add(id);
        const sets =
          typeof o.sets === "number" && Number.isFinite(o.sets)
            ? Math.min(12, Math.max(1, Math.round(o.sets)))
            : 3;
        exercises.push({
          id,
          name: safeText(o.name, EXERCISE_NAME_MAX, "Exercise"),
          sets,
          repTarget: safeText(
            o.repTarget,
            EXERCISE_REP_TARGET_MAX,
            "8–12 reps"
          ),
          usesWeight: o.usesWeight !== false,
        });
      }
    }
    // An empty routine would produce vacuous sessions — keep the seed instead.
    if (exercises.length === 0) continue;

    out[rid] = {
      id: rid,
      name: safeText(entry.name, ROUTINE_NAME_MAX, DEFAULT_ROUTINES[rid].name),
      shortName: safeText(
        entry.shortName,
        ROUTINE_SHORT_MAX,
        DEFAULT_ROUTINES[rid].shortName
      ),
      focus: safeText(entry.focus, ROUTINE_FOCUS_MAX, DEFAULT_ROUTINES[rid].focus),
      restSeconds:
        typeof entry.restSeconds === "number" && Number.isFinite(entry.restSeconds)
          ? Math.min(
              REST_SECONDS_MAX,
              Math.max(REST_SECONDS_MIN, Math.round(entry.restSeconds / 15) * 15)
            )
          : DEFAULT_ROUTINES[rid].restSeconds,
      exercises,
    };
  }
  return out;
}

export function sanitizeSchedule(raw: unknown): WeeklySchedule {
  const out: WeeklySchedule = { ...DEFAULT_SCHEDULE };
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;
  for (const day of DAYS) {
    const v = src[day];
    if (v === null || v === "A" || v === "B") out[day] = v;
  }
  return out;
}

/**
 * Defensive set sanitizer (backup import + cloud sync): every set is rebuilt
 * field-by-field so tampered payloads can never inject junk into the log,
 * including free-text notes (control chars stripped, hard length cap).
 */
function sanitizeSets(raw: unknown): SetLog[] {
  if (!Array.isArray(raw)) return [];
  const out: SetLog[] = [];
  for (const entry of raw.slice(0, 12)) {
    const o = (entry ?? {}) as Record<string, unknown>;
    const n = typeof o.set_number === "number" && Number.isFinite(o.set_number)
      ? Math.round(o.set_number)
      : NaN;
    if (!(n >= 1 && n <= 12)) continue;
    const weight =
      typeof o.weight_used_lbs === "number" && Number.isFinite(o.weight_used_lbs)
        ? Math.min(1000, Math.max(0, o.weight_used_lbs))
        : 0;
    const reps =
      typeof o.reps_completed === "number" && Number.isFinite(o.reps_completed)
        ? Math.min(100, Math.max(0, Math.round(o.reps_completed)))
        : 0;
    const note =
      typeof o.note === "string" && o.note.trim().length > 0
        ? o.note
            .trim()
            .replace(/[\u0000-\u001f\u007f]/g, "")
            .slice(0, SET_NOTE_MAX_CHARS)
        : undefined;
    out.push({
      set_number: n,
      weight_used_lbs: weight,
      reps_completed: reps,
      is_completed: o.is_completed === true,
      ...(note ? { note } : {}),
    });
  }
  return out;
}

/**
 * The inventory UI and plate solver are built around exactly TWO handles, so a
 * backup that ships zero, one or three handles would crash the solver. Anything
 * other than a well-formed pair falls back to the starter handles.
 */
function sanitizeHandles(raw: unknown): DumbbellHandle[] {
  if (!Array.isArray(raw) || raw.length !== 2) {
    return DEFAULT_HANDLES.map((h) => ({ ...h }));
  }
  return raw.map((h, i) => {
    const o = (h ?? {}) as Record<string, unknown>;
    const name =
      typeof o.name === "string" && o.name.trim().length > 0 && o.name.length <= 60
        ? o.name.trim()
        : DEFAULT_HANDLES[i].name;
    const empty =
      typeof o.empty_weight_lbs === "number" && Number.isFinite(o.empty_weight_lbs)
        ? clampQuarterLb(o.empty_weight_lbs, 1, 30)
        : DEFAULT_HANDLES[i].empty_weight_lbs;
    return { id: `handle_${i + 1}`, name, empty_weight_lbs: empty };
  });
}

/**
 * Plates are user-extensible now, so a tampered backup must never inject
 * NaN weights, unknown handle ids or an unbounded array (solver safety).
 */
function sanitizePlates(raw: unknown, handles: DumbbellHandle[]): Plate[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_PLATES.map((p) => ({ ...p }));
  }
  const handleIds = new Set(handles.map((h) => h.id));
  const seen = new Set<string>();
  const out: Plate[] = [];
  for (const entry of raw.slice(0, MAX_KIT_PLATES)) {
    const o = (entry ?? {}) as Record<string, unknown>;
    if (typeof o.weight_lbs !== "number" || !Number.isFinite(o.weight_lbs)) continue;
    const weight = clampQuarterLb(o.weight_lbs, 0.5, 100);
    const assigned =
      typeof o.assigned_to_handle === "string" && handleIds.has(o.assigned_to_handle)
        ? o.assigned_to_handle
        : null;
    let id =
      typeof o.plate_id === "string" && o.plate_id.length > 0 && o.plate_id.length <= 64
        ? o.plate_id
        : "";
    if (!id || seen.has(id)) {
      id = `p_${out.length}_${Math.random().toString(36).slice(2, 10)}`;
    }
    seen.add(id);
    out.push({
      plate_id: id,
      weight_lbs: weight,
      assigned_to_handle: assigned,
      status: assigned ? "attached" : "storage",
    });
  }
  return out;
}

/**
 * Defensive backup parser: only accepts well-formed Lean Bulk Studio files and
 * clamps every field into a safe range so a tampered/partial file can never
 * poison app state.
 */
export function parseBackup(
  raw: string
): { ok: true; data: BackupData } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const file = json as Partial<BackupFile> | null;
  if (
    !file ||
    typeof file !== "object" ||
    file.app !== "lean-bulk-studio" ||
    !file.data ||
    typeof file.data !== "object"
  ) {
    return {
      ok: false,
      error: "This file isn't a Lean Bulk Studio backup.",
    };
  }
  const d = file.data as unknown as Record<string, unknown>;

  const sessions: Record<string, WorkoutSession> = {};
  if (d.sessions && typeof d.sessions === "object") {
    for (const s of Object.values(d.sessions)) {
      const sess = s as WorkoutSession;
      if (
        sess &&
        typeof sess === "object" &&
        typeof sess.week_number === "number" &&
        sess.week_number >= 1 &&
        sess.week_number <= 6 &&
        DAYS.includes(sess.day_name) &&
        (sess.routine === "A" || sess.routine === "B") &&
        Array.isArray(sess.exercise_logs)
      ) {
        sessions[sessionKey(sess.week_number, sess.day_name, sess.routine)] = {
          ...sess,
          // rebuild every set defensively (weights, reps, notes)
          exercise_logs: sess.exercise_logs.map((log) => ({
            ...log,
            sets: sanitizeSets(log?.sets),
          })),
        };
      }
    }
  }

  const weightLog: WeightLog = {};
  if (d.weightLog && typeof d.weightLog === "object") {
    for (const [k, v] of Object.entries(d.weightLog as Record<string, unknown>)) {
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(k) &&
        typeof v === "number" &&
        Number.isFinite(v) &&
        v > 0 &&
        v <= 500
      ) {
        weightLog[k] = v;
      }
    }
  }

  const clampNum = (
    v: unknown,
    fallback: number,
    min: number,
    max: number
  ): number =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(max, Math.max(min, v))
      : fallback;

  const handles = sanitizeHandles(d.handles);
  const data: BackupData = {
    currentWeek: Math.round(clampNum(d.currentWeek, 1, 1, 6)),
    selectedPhase: Math.round(clampNum(d.selectedPhase, 1, 1, 3)) as PhaseId,
    bodyWeightKg: clampNum(d.bodyWeightKg, 50, 30, 400),
    activityFactor: clampNum(d.activityFactor, 1.55, 1, 3),
    water: sanitizeWater(d.water),
    sessions,
    weightLog,
    handles,
    plates: sanitizePlates(d.plates, handles),
    restOverrideSec:
      typeof d.restOverrideSec === "number" && Number.isFinite(d.restOverrideSec)
        ? Math.min(REST_SECONDS_MAX, Math.max(REST_SECONDS_MIN, Math.round(d.restOverrideSec / 15) * 15))
        : null,
    routines: sanitizeRoutines(d.routines),
    schedule: sanitizeSchedule(d.schedule),
  };
  return { ok: true, data };
}

/* ---------------------------------- Audio ---------------------------------- */

/** Short two-note chime when the rest timer finishes (safe no-op on failure) */
export function playChime(): void {
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [880, 1174.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    });
    window.setTimeout(() => void ctx.close().catch(() => {}), 900);
  } catch {
    /* audio not available — ignore */
  }
}

export { DAYS, ACTIVITY_LEVELS };
