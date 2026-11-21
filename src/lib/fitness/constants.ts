import type {
  DayName,
  PhaseId,
  RoutineDef,
  RoutineId,
  WeeklySchedule,
} from "./types";

/* ---------------------------------- Days ---------------------------------- */

export const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DAY_SHORT: Record<DayName, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export const DAY_INITIAL: Record<DayName, string> = {
  Monday: "M",
  Tuesday: "T",
  Wednesday: "W",
  Thursday: "T",
  Friday: "F",
  Saturday: "S",
  Sunday: "S",
};

export function dayIndex(name: DayName): number {
  return DAYS.indexOf(name);
}

/** Monday-first "today" */
export function todayName(): DayName {
  const idx = (new Date().getDay() + 6) % 7;
  return DAYS[idx];
}

/** Monday & Thursday = Upper (A), Tuesday & Friday = Lower (B), else rest */
export const DEFAULT_SCHEDULE: WeeklySchedule = {
  Monday: "A",
  Tuesday: "B",
  Wednesday: null,
  Thursday: "A",
  Friday: "B",
  Saturday: null,
  Sunday: null,
};

/* --------------------------- Program builder caps --------------------------- */

export const ROUTINE_NAME_MAX = 40;
export const ROUTINE_SHORT_MAX = 16;
export const ROUTINE_FOCUS_MAX = 60;
export const EXERCISE_NAME_MAX = 60;
export const EXERCISE_REP_TARGET_MAX = 30;
export const EXERCISES_PER_ROUTINE_MAX = 12;

/* ------------------------- Program defaults (seed) -------------------------- */

export const DEFAULT_ROUTINES: Record<RoutineId, RoutineDef> = {
  A: {
    id: "A",
    name: "Routine A: Upper Body",
    shortName: "Upper (A)",
    focus: "Push · Pull · Shoulders",
    restSeconds: 90,
    exercises: [
      { id: "floor-press", name: "Dumbbell Floor Press", sets: 3, repTarget: "8–12 reps", usesWeight: true },
      { id: "single-arm-row", name: "Dumbbell Single-Arm Row", sets: 3, repTarget: "8–12 reps", usesWeight: true },
      { id: "overhead-press", name: "Dumbbell Overhead Shoulder Press", sets: 3, repTarget: "8–12 reps", usesWeight: true },
      { id: "bicep-curls", name: "Dumbbell Bicep Curls", sets: 2, repTarget: "8–12 reps", usesWeight: true },
      { id: "tricep-extension", name: "Dumbbell Overhead Tricep Extension", sets: 2, repTarget: "8–12 reps", usesWeight: true },
    ],
  },
  B: {
    id: "B",
    name: "Routine B: Lower Body & Core",
    shortName: "Lower (B)",
    focus: "Legs · Glutes · Core",
    restSeconds: 120,
    exercises: [
      { id: "goblet-squat", name: "Goblet Squat", sets: 3, repTarget: "8–12 reps", usesWeight: true },
      { id: "romanian-deadlift", name: "Dumbbell Romanian Deadlift", sets: 3, repTarget: "8–12 reps", usesWeight: true },
      { id: "split-squat", name: "Dumbbell Bulgarian Split Squat", sets: 3, repTarget: "8–12 reps / leg", usesWeight: true },
      { id: "calf-raises", name: "Dumbbell Standing Calf Raises", sets: 3, repTarget: "8–12 reps", usesWeight: true },
      { id: "plank", name: "Plank", sets: 3, repTarget: "30–60 sec hold", usesWeight: false },
    ],
  },
};

export function routineTotalSets(routine: RoutineDef): number {
  return routine.exercises.reduce((acc, ex) => acc + ex.sets, 0);
}

/* --------------------------------- Phases --------------------------------- */

export interface PhaseDef {
  id: PhaseId;
  name: string;
  weeks: [number, number];
  effort: string;
  tag: string;
}

export const PHASES: PhaseDef[] = [
  {
    id: 1,
    name: "Foundation",
    weeks: [1, 2],
    effort: "2 RIR",
    tag: "🎯 Effort: 2 Reps in Reserve (2 RIR). Establish baseline weights where 8-10 reps feel challenging.",
  },
  {
    id: 2,
    name: "Volume & Rep Progression",
    weeks: [3, 4],
    effort: "1 RIR",
    tag: "🔥 Effort: 1 Rep in Reserve (1 RIR). Keep the same weights, but try to force 1 to 2 extra reps per set compared to Phase 1.",
  },
  {
    id: 3,
    name: "Intensity & Load Progression",
    weeks: [5, 6],
    effort: "0 RIR",
    tag: "⚡ Effort: Technical Failure (0 RIR) on the final set. If you hit 12 reps on all sets last week, increase the weight and drop reps to 8.",
  },
];

export function phaseForWeek(week: number): PhaseId {
  if (week <= 2) return 1;
  if (week <= 4) return 2;
  return 3;
}

/* ------------------------------ Nutrition & water -------------------------- */

export const SURPLUS_KCAL = 400;
export const PROGRAM_WEEKS = 6;

/** Scheduled training sessions per program week (Mon·A, Tue·B, Thu·A, Fri·B) */
export const PLANNED_SESSIONS_PER_WEEK = 4;

/** Healthy lean-bulk pace: gain +0.25–0.5 % of body weight per week */
export const GAIN_RATE_MIN_PCT = 0.0025;
export const GAIN_RATE_MAX_PCT = 0.005;

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: "Sedentary", hint: "Desk life, little exercise" },
  { value: 1.375, label: "Lightly Active", hint: "1–3 sessions / week" },
  { value: 1.55, label: "Moderately Active", hint: "3–5 sessions / week" },
];

export const WATER_BOXES = 8;
export const WATER_BOX_ML = 350;
export const WATER_GOAL_ML = WATER_BOXES * WATER_BOX_ML;

/* ------------------------------ Rest timer defaults ------------------------ */

/** Rest-timer override window (Tools → Rest Timer), on a 15 s grid */
export const REST_SECONDS_MIN = 30;
export const REST_SECONDS_MAX = 300;
export const REST_SECONDS_STEP = 15;
export const REST_PRESETS = [60, 90, 120, 150, 180];

/** Hard cap on a per-set note's length */
export const SET_NOTE_MAX_CHARS = 80;

/* ------------------------------ Plate inventory ---------------------------- */

/** Hard cap so the plate solver's exhaustive search stays instant (2^16 subsets) */
export const MAX_KIT_PLATES = 16;

/** Custom plates clamp to this weight window, on a 0.25 lb grid */
export const PLATE_WEIGHT_MIN_LBS = 0.5;
export const PLATE_WEIGHT_MAX_LBS = 100;
export const HANDLE_WEIGHT_MIN_LBS = 1;
export const HANDLE_WEIGHT_MAX_LBS = 30;

export const DEFAULT_HANDLES = [
  { id: "handle_1", name: "Left Dumbbell Handle", empty_weight_lbs: 5.0 },
  { id: "handle_2", name: "Right Dumbbell Handle", empty_weight_lbs: 5.0 },
];

export const DEFAULT_PLATES = [
  { plate_id: "p5_1", weight_lbs: 5.0, assigned_to_handle: "handle_1", status: "attached" },
  { plate_id: "p5_2", weight_lbs: 5.0, assigned_to_handle: "handle_1", status: "attached" },
  { plate_id: "p5_3", weight_lbs: 5.0, assigned_to_handle: "handle_2", status: "attached" },
  { plate_id: "p5_4", weight_lbs: 5.0, assigned_to_handle: "handle_2", status: "attached" },
  { plate_id: "p25_1", weight_lbs: 2.5, assigned_to_handle: "handle_1", status: "attached" },
  { plate_id: "p25_2", weight_lbs: 2.5, assigned_to_handle: "handle_1", status: "attached" },
  { plate_id: "p25_3", weight_lbs: 2.5, assigned_to_handle: "handle_2", status: "attached" },
  { plate_id: "p25_4", weight_lbs: 2.5, assigned_to_handle: "handle_2", status: "attached" },
] as const;
