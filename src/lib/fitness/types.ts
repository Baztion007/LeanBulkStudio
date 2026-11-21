/* Lean Bulk Studio — core data schema types (mirrors the APPENDIX schema) */

export type DayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type RoutineId = "A" | "B";
export type TabId = "dashboard" | "workout" | "program" | "progress" | "tools";
export type PhaseId = 1 | 2 | 3;

/* ------------------------------ Program builder ----------------------------- */

export interface ExerciseDef {
  id: string;
  name: string;
  sets: number;
  /** free-text target, e.g. "8–12 reps" or "30–60 sec hold" */
  repTarget: string;
  usesWeight: boolean;
}

export interface RoutineDef {
  id: RoutineId;
  name: string;
  /** compact label for segmented controls / chips (user-editable) */
  shortName: string;
  focus: string;
  /** per-routine rest-timer default in seconds (15 s grid) */
  restSeconds: number;
  exercises: ExerciseDef[];
}

/** Which routine runs on each weekday; null = scheduled rest day */
export type WeeklySchedule = Record<DayName, RoutineId | null>;

export interface SetLog {
  set_number: number;
  weight_used_lbs: number;
  reps_completed: number;
  is_completed: boolean;
  /** optional per-set form note, ≤80 chars ("felt heavy", "RPE 9") */
  note?: string;
}

export interface ExerciseLog {
  exercise_id: string;
  exercise_name: string;
  sets: SetLog[];
}

export interface WorkoutSession {
  session_id: string;
  week_number: number;
  day_name: DayName;
  routine: RoutineId;
  exercise_logs: ExerciseLog[];
}

export interface DumbbellHandle {
  id: string;
  name: string;
  empty_weight_lbs: number;
}

export type PlateStatus = "attached" | "storage";

export interface Plate {
  plate_id: string;
  weight_lbs: number;
  assigned_to_handle: string | null;
  status: PlateStatus;
}

export interface MacroTargets {
  maintenance: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface RestTimerState {
  label: string;
  totalSeconds: number;
  /** epoch ms when the timer ends (ignored while paused) */
  endAt: number;
  /** when paused, the frozen remaining time in ms */
  pausedRemainingMs: number | null;
}

/* ----------------------------- Body weight log ----------------------------- */

/** Key = local ISO date "YYYY-MM-DD" → measured body weight in kg */
export type WeightLog = Record<string, number>;

export interface WeightTrendPoint {
  date: string;
  kg: number;
}

export type WeightTrendStatus =
  | "on-track"
  | "too-fast"
  | "too-slow"
  | "insufficient";

export interface WeightTrendResult {
  entries: WeightTrendPoint[];
  latestKg: number | null;
  latestDate: string | null;
  /** average kg gained (lost) per week across the logged span */
  weeklyRateKg: number | null;
  status: WeightTrendStatus;
}

/* ------------------------------ Session history ---------------------------- */

export interface HistoryExerciseSummary {
  id: string;
  name: string;
  usesWeight: boolean;
  weight: number;
  reps: number[];
  /** non-empty notes on completed sets, annotated with their set number */
  notePairs: { set: number; note: string }[];
  logged: boolean;
}

export interface HistoryRow {
  key: string;
  week: number;
  day: DayName;
  routine: RoutineId;
  done: number;
  total: number;
  complete: boolean;
  exercises: HistoryExerciseSummary[];
}

export interface WeekConsistency {
  week: number;
  done: number;
  planned: number;
}

/* --------------------------------- Backup ---------------------------------- */

/** The full persisted slice — identical to what zustand writes to localStorage */
export interface BackupData {
  currentWeek: number;
  selectedPhase: PhaseId;
  bodyWeightKg: number;
  activityFactor: number;
  water: Record<DayName, number>;
  sessions: Record<string, WorkoutSession>;
  weightLog: WeightLog;
  handles: DumbbellHandle[];
  plates: Plate[];
  /** rest-timer override in seconds; null = use the per-routine defaults */
  restOverrideSec: number | null;
  /** user-customized program (schema 5+; older files fall back to defaults) */
  routines: Record<RoutineId, RoutineDef>;
  schedule: WeeklySchedule;
}

export interface BackupFile {
  app: "lean-bulk-studio";
  schema: 5;
  exportedAt: string;
  data: BackupData;
}

/* ------------------------------ Personal records ---------------------------- */

export interface PRDetail {
  weightLbs: number;
  reps: number;
  week: number;
  day: DayName;
}

export interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  routine: RoutineId;
  /** heaviest completed set ever logged */
  best: PRDetail | null;
  /** best estimated 1-rep max (Epley) across completed sets */
  e1rm: (PRDetail & { valueLbs: number }) | null;
  /** single completed set that moved the most total weight (lb × reps) */
  bestVolume: (PRDetail & { volumeLbs: number }) | null;
  totalCompletedSets: number;
}

/* ------------------------------ Volume analytics ----------------------------- */

export interface WeeklyVolumePoint {
  week: number;
  /** lb moved across every completed set in the week (weight × reps) */
  volumeLbs: number;
  /** completed sets, including bodyweight work (plank) */
  sets: number;
}

export type MuscleGroup = "push" | "pull" | "legs" | "core";

export interface MuscleGroupSlice {
  group: MuscleGroup;
  label: string;
  sets: number;
  volumeLbs: number;
}

/* ------------------------------- Plate solver -------------------------------- */

export interface PlateHandleSolution {
  handleId: string;
  handleName: string;
  emptyLbs: number;
  plates: Plate[];
  totalLbs: number;
}

export type PlateSolverResult =
  | {
      ok: true;
      targetLbs: number;
      handles: PlateHandleSolution[];
      leftovers: Plate[];
      /** plate_id → handle_id (leftover plates map to null = storage) */
      assignments: Record<string, string>;
    }
  | {
      ok: false;
      targetLbs: number;
      reason: "too-light" | "too-heavy" | "not-achievable";
      minTargetLbs: number;
      maxTargetLbs: number;
      /** nearest achievable targets below/above the requested one */
      suggestions: number[];
      /** every target weight the current inventory can produce */
      achievable: number[];
    };

/* --------------------------------- Cloud sync -------------------------------- */

export interface SyncSaveResponse {
  ok: boolean;
  error?: string;
  savedAt?: string;
}

export interface SyncLoadResponse {
  ok: boolean;
  error?: string;
  /** the stored BackupData snapshot (already sanitized server-side) */
  data?: BackupData;
  updatedAt?: string;
}
