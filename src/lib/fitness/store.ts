"use client";

import { useCallback, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import type {
  DayName,
  ExerciseDef,
  PhaseId,
  RestTimerState,
  RoutineDef,
  RoutineId,
  TabId,
  WeeklySchedule,
  WorkoutSession,
  DumbbellHandle,
  Plate,
  BackupData,
  WeightLog,
} from "./types";
import {
  DEFAULT_HANDLES,
  DEFAULT_PLATES,
  DEFAULT_ROUTINES,
  DEFAULT_SCHEDULE,
  DAYS,
  EXERCISES_PER_ROUTINE_MAX,
  EXERCISE_NAME_MAX,
  EXERCISE_REP_TARGET_MAX,
  HANDLE_WEIGHT_MAX_LBS,
  HANDLE_WEIGHT_MIN_LBS,
  MAX_KIT_PLATES,
  PHASES,
  PLATE_WEIGHT_MAX_LBS,
  PLATE_WEIGHT_MIN_LBS,
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  ROUTINE_FOCUS_MAX,
  ROUTINE_NAME_MAX,
  ROUTINE_SHORT_MAX,
  SET_NOTE_MAX_CHARS,
  WATER_BOXES,
  phaseForWeek,
  todayName,
} from "./constants";
import {
  genId,
  getLatestPriorSession,
  sanitizeRoutines,
  sanitizeSchedule,
  sessionKey,
} from "./utils";

/** Strip control chars, trim, and hard-cap a text field from the builder. */
function clampTextField(raw: string, max: number): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

/** Snap a builder rest value onto the 15 s grid inside [30, 300]. */
function clampRestSeconds(seconds: number): number {
  return Math.min(
    REST_SECONDS_MAX,
    Math.max(REST_SECONDS_MIN, Math.round(seconds / 15) * 15)
  );
}

interface LeanBulkState {
  /* navigation & program context */
  activeTab: TabId;
  selectedDay: DayName;
  currentWeek: number;
  selectedPhase: PhaseId;
  routineOverride: RoutineId | null;

  /* calculator inputs */
  bodyWeightKg: number;
  activityFactor: number;

  /* per-day hydration (0-8 boxes) */
  water: Record<DayName, number>;

  /* body weight log: key = local ISO date "YYYY-MM-DD" → kg */
  weightLog: WeightLog;

  /* workout history: key = `${week}:${day}:${routine}` */
  sessions: Record<string, WorkoutSession>;

  /* dumbbell inventory */
  handles: DumbbellHandle[];
  plates: Plate[];

  /* user-customized program (Program Builder): routines + weekly schedule */
  routines: Record<RoutineId, RoutineDef>;
  schedule: WeeklySchedule;

  /* cloud sync key (device-local; never included in backups) */
  syncCode: string | null;

  /** Rest-timer override in seconds; null = use each routine's default */
  restOverrideSec: number | null;

  /* transient rest timer (not persisted) */
  restTimer: RestTimerState | null;

  /* actions */
  setActiveTab: (tab: TabId) => void;
  selectDay: (day: DayName) => void;
  setWeek: (week: number) => void;
  selectPhase: (phase: PhaseId) => void;
  setRoutineOverride: (routine: RoutineId) => void;
  setBodyWeight: (kg: number) => void;
  setActivityFactor: (factor: number) => void;
  setWaterCount: (day: DayName, count: number) => void;
  logWeight: (dateISO: string, kg: number) => void;
  deleteWeightEntry: (dateISO: string) => void;
  importBackupData: (data: BackupData) => void;
  updateSetInput: (
    week: number,
    day: DayName,
    routine: RoutineId,
    exerciseId: string,
    setNumber: number,
    patch: {
      weight_used_lbs?: number;
      reps_completed?: number;
      note?: string;
    }
  ) => void;
  toggleSetComplete: (
    week: number,
    day: DayName,
    routine: RoutineId,
    exerciseId: string,
    setNumber: number
  ) => { completed: boolean; sessionComplete: boolean } | null;
  resetSession: (week: number, day: DayName, routine: RoutineId) => void;
  attachPlate: (plateId: string, handleId: string) => void;
  detachPlate: (plateId: string) => void;
  /** Bulk re-rack: plate_id → handle_id (null = storage). One atomic update. */
  applyPlateAssignment: (assignment: Record<string, string | null>) => void;
  /** Plate-kit customizer: append N plates of one weight (clamped to the kit cap). */
  addPlates: (weightLbs: number, count?: number) => void;
  /** Plate-kit customizer: permanently delete one plate by id. */
  removePlate: (plateId: string) => void;
  /** Restore the starter 2-handle / 8-plate kit exactly as shipped. */
  resetPlateKit: () => void;
  /** Edit a handle's empty (bare) weight in place. */
  setHandleWeight: (handleId: string, lbs: number) => void;
  /** Program Builder: edit a routine's meta (name, short label, focus, rest). */
  updateRoutine: (
    routineId: RoutineId,
    patch: {
      name?: string;
      shortName?: string;
      focus?: string;
      restSeconds?: number;
    }
  ) => void;
  /** Program Builder: edit one exercise inside a routine. */
  updateExercise: (
    routineId: RoutineId,
    exerciseId: string,
    patch: {
      name?: string;
      repTarget?: string;
      sets?: number;
      usesWeight?: boolean;
    }
  ) => void;
  /** Program Builder: append a blank exercise (no-op at the cap). */
  addExercise: (routineId: RoutineId) => void;
  /** Program Builder: delete an exercise (no-op when it's the only one). */
  removeExercise: (routineId: RoutineId, exerciseId: string) => void;
  /** Program Builder: reorder an exercise by one position. */
  moveExercise: (
    routineId: RoutineId,
    exerciseId: string,
    direction: -1 | 1
  ) => void;
  /** Program Builder: assign a weekday to a routine, or null for a rest day. */
  setSchedule: (day: DayName, routine: RoutineId | null) => void;
  /** Program Builder: restore the shipped routines + weekly schedule. */
  resetProgram: () => void;
  setSyncCode: (code: string | null) => void;
  /** Rest-timer override (15 s grid, 30–300 s); null restores routine defaults */
  setRestOverride: (seconds: number | null) => void;
  startRestTimer: (seconds: number, label: string) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  bumpRestTimer: (seconds: number) => void;
  cancelRestTimer: () => void;
  jumpToToday: () => void;
  startNextCycle: () => void;
  resetAll: () => void;
}

function createInitialState() {
  return {
    activeTab: "dashboard" as TabId,
    selectedDay: "Monday" as DayName,
    currentWeek: 1,
    selectedPhase: 1 as PhaseId,
    routineOverride: null as RoutineId | null,
    bodyWeightKg: 50,
    activityFactor: 1.55,
    water: Object.fromEntries(DAYS.map((d) => [d, 0])) as Record<DayName, number>,
    weightLog: {} as WeightLog,
    sessions: {} as Record<string, WorkoutSession>,
    handles: DEFAULT_HANDLES.map((h) => ({ ...h })),
    plates: DEFAULT_PLATES.map((p) => ({ ...p })),
    routines: {
      A: { ...DEFAULT_ROUTINES.A, exercises: DEFAULT_ROUTINES.A.exercises.map((ex) => ({ ...ex })) },
      B: { ...DEFAULT_ROUTINES.B, exercises: DEFAULT_ROUTINES.B.exercises.map((ex) => ({ ...ex })) },
    },
    schedule: { ...DEFAULT_SCHEDULE },
    syncCode: null as string | null,
    restOverrideSec: null as number | null,
    restTimer: null as RestTimerState | null,
  };
}

type PersistedSlice = Pick<
  LeanBulkState,
  | "currentWeek"
  | "selectedPhase"
  | "bodyWeightKg"
  | "activityFactor"
  | "water"
  | "weightLog"
  | "sessions"
  | "handles"
  | "plates"
  | "syncCode"
  | "restOverrideSec"
  | "routines"
  | "schedule"
>;

/**
 * Creates the session skeleton if missing, seeding every set with the most
 * recent previous session's numbers so pre-filled values are never silently
 * lost when the user starts logging.
 */
function ensureSession(
  state: Pick<LeanBulkState, "sessions" | "routines">,
  week: number,
  day: DayName,
  routine: RoutineId
): Record<string, WorkoutSession> {
  const key = sessionKey(week, day, routine);
  if (state.sessions[key]) return state.sessions;
  const prior = getLatestPriorSession(state.sessions, week, day, routine);
  const priorLogs = new Map(
    prior?.exercise_logs.map((l) => [l.exercise_id, l]) ?? []
  );
  const def = state.routines[routine] ?? DEFAULT_ROUTINES[routine];
  const session: WorkoutSession = {
    session_id: genId(),
    week_number: week,
    day_name: day,
    routine,
    exercise_logs: def.exercises.map((ex) => ({
      exercise_id: ex.id,
      exercise_name: ex.name,
      sets: Array.from({ length: ex.sets }, (_, i) => {
        const p = priorLogs.get(ex.id)?.sets.find((st) => st.set_number === i + 1);
        return {
          set_number: i + 1,
          weight_used_lbs: p?.weight_used_lbs ?? 0,
          reps_completed: p?.reps_completed ?? 0,
          is_completed: false,
        };
      }),
    })),
  };
  return { ...state.sessions, [key]: session };
}

/**
 * Hardened localStorage wrapper: a corrupted/truncated payload must never
 * crash hydration (which would leave the app stuck on the splash screen).
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name);
      if (raw == null) return null;
      JSON.parse(raw); // validate before zustand parses it
      return raw;
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* storage full or unavailable — state stays in memory */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const useLeanBulk = create<LeanBulkState>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      setActiveTab: (tab) => set({ activeTab: tab }),

      selectDay: (day) => set({ selectedDay: day, routineOverride: null }),

      setWeek: (week) => {
        const clamped = Math.min(6, Math.max(1, week));
        set({ currentWeek: clamped, selectedPhase: phaseForWeek(clamped) });
      },

      selectPhase: (phase) => {
        const def = PHASES.find((p) => p.id === phase);
        set({
          selectedPhase: phase,
          currentWeek: def ? def.weeks[0] : get().currentWeek,
        });
      },

      setRoutineOverride: (routine) => set({ routineOverride: routine }),

      setBodyWeight: (kg) => set({ bodyWeightKg: Math.max(0, kg) }),

      setActivityFactor: (factor) => set({ activityFactor: factor }),

      setWaterCount: (day, count) =>
        set((s) => ({
          water: {
            ...s.water,
            [day]: Math.min(WATER_BOXES, Math.max(0, count)),
          },
        })),

      logWeight: (dateISO, kg) =>
        set((s) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return {};
          const clamped = Math.min(400, Math.max(30, kg));
          if (!Number.isFinite(clamped) || clamped <= 0) return {};
          return {
            weightLog: { ...s.weightLog, [dateISO]: clamped },
            // keep calorie targets in sync with the newest measurement
            bodyWeightKg: clamped,
          };
        }),

      deleteWeightEntry: (dateISO) =>
        set((s) => {
          if (!(dateISO in s.weightLog)) return {};
          const next = { ...s.weightLog };
          delete next[dateISO];
          return { weightLog: next };
        }),

      importBackupData: (data) =>
        set((s) => ({
          ...data,
          // Legacy snapshots/backups (pre Program Builder) lack routines and
          // schedule — sanitizeRoutines/Schedule rebuild them from defaults
          // instead of spreading undefined into state (which would crash).
          routines: sanitizeRoutines(data.routines),
          schedule: sanitizeSchedule(data.schedule),
          // navigation & transient state stay local to this device/session
          activeTab: s.activeTab,
          selectedDay: todayName(),
          routineOverride: null,
          restTimer: null,
        })),

      updateSetInput: (week, day, routine, exerciseId, setNumber, patch) =>
        set((s) => {
          const sessions = ensureSession(s, week, day, routine);
          const key = sessionKey(week, day, routine);
          const session = { ...sessions[key] };
          session.exercise_logs = session.exercise_logs.map((log) => {
            if (log.exercise_id !== exerciseId) return log;
            return {
              ...log,
              sets: log.sets.map((st) =>
                st.set_number === setNumber
                  ? {
                      ...st,
                      ...(patch.weight_used_lbs !== undefined
                        ? { weight_used_lbs: Math.max(0, patch.weight_used_lbs) }
                        : {}),
                      ...(patch.reps_completed !== undefined
                        ? { reps_completed: Math.max(0, patch.reps_completed) }
                        : {}),
                      ...(patch.note !== undefined
                        ? {
                            note:
                              patch.note.trim().length > 0
                                ? patch.note
                                    .trim()
                                    // strip control characters, cap length
                                    .replace(/[\u0000-\u001f\u007f]/g, "")
                                    .slice(0, SET_NOTE_MAX_CHARS)
                                : undefined,
                          }
                        : {}),
                    }
                  : st
              ),
            };
          });
          return {
            sessions: { ...sessions, [key]: session },
          };
        }),

      toggleSetComplete: (week, day, routine, exerciseId, setNumber) => {
        // Seed FIRST so a "check" on a pre-filled (not yet typed) set works.
        const sessions = ensureSession(get(), week, day, routine);
        const key = sessionKey(week, day, routine);
        const session = sessions[key];
        const targetSet = session.exercise_logs
          .find((l) => l.exercise_id === exerciseId)
          ?.sets.find((st) => st.set_number === setNumber);
        const nextCompleted = !(targetSet?.is_completed ?? false);
        if (nextCompleted && (targetSet?.reps_completed ?? 0) <= 0) {
          return null; // blocked — caller shows a toast
        }

        let sessionComplete = false;
        set(() => {
          const nextSession: WorkoutSession = {
            ...session,
            exercise_logs: session.exercise_logs.map((log) => {
              if (log.exercise_id !== exerciseId) return log;
              return {
                ...log,
                sets: log.sets.map((st) =>
                  st.set_number === setNumber
                    ? { ...st, is_completed: nextCompleted }
                    : st
                ),
              };
            }),
          };
          sessionComplete = nextSession.exercise_logs.every((ex) =>
            ex.sets.every((st) => st.is_completed)
          );
          return { sessions: { ...sessions, [key]: nextSession } };
        });
        return { completed: nextCompleted, sessionComplete };
      },

      resetSession: (week, day, routine) =>
        set((s) => {
          const key = sessionKey(week, day, routine);
          if (!s.sessions[key]) return {};
          const next = { ...s.sessions };
          delete next[key];
          return { sessions: next };
        }),

      attachPlate: (plateId, handleId) =>
        set((s) => ({
          plates: s.plates.map((p) =>
            p.plate_id === plateId
              ? { ...p, assigned_to_handle: handleId, status: "attached" as const }
              : p
          ),
        })),

      detachPlate: (plateId) =>
        set((s) => ({
          plates: s.plates.map((p) =>
            p.plate_id === plateId
              ? { ...p, assigned_to_handle: null, status: "storage" as const }
              : p
          ),
        })),

      applyPlateAssignment: (assignment) =>
        set((s) => ({
          plates: s.plates.map((p) => {
            const handle = assignment[p.plate_id];
            return handle
              ? { ...p, assigned_to_handle: handle, status: "attached" as const }
              : { ...p, assigned_to_handle: null, status: "storage" as const };
          }),
        })),

      addPlates: (weightLbs, count = 1) =>
        set((s) => {
          const weight =
            Math.round(
              Math.min(PLATE_WEIGHT_MAX_LBS, Math.max(PLATE_WEIGHT_MIN_LBS, weightLbs)) * 4
            ) / 4;
          if (!Number.isFinite(weight) || count < 1) return {};
          const room = MAX_KIT_PLATES - s.plates.length;
          if (room <= 0) return {};
          const n = Math.min(Math.floor(count), room);
          const stamp = Date.now();
          const fresh: Plate[] = Array.from({ length: n }, (_, i) => ({
            plate_id: `custom_${stamp}_${i}_${Math.random().toString(36).slice(2, 8)}`,
            weight_lbs: weight,
            assigned_to_handle: null,
            status: "storage" as const,
          }));
          return { plates: [...s.plates, ...fresh] };
        }),

      removePlate: (plateId) =>
        set((s) =>
          s.plates.some((p) => p.plate_id === plateId)
            ? { plates: s.plates.filter((p) => p.plate_id !== plateId) }
            : {}
        ),

      resetPlateKit: () =>
        set({
          handles: DEFAULT_HANDLES.map((h) => ({ ...h })),
          plates: DEFAULT_PLATES.map((p) => ({ ...p })),
        }),

      setHandleWeight: (handleId, lbs) =>
        set((s) => ({
          handles: s.handles.map((h) =>
            h.id === handleId
              ? {
                  ...h,
                  empty_weight_lbs:
                    Math.round(
                      Math.min(
                        HANDLE_WEIGHT_MAX_LBS,
                        Math.max(HANDLE_WEIGHT_MIN_LBS, lbs)
                      ) * 4
                    ) / 4,
                }
              : h
          ),
        })),

      /* ----------------------------- Program Builder ----------------------------- */

      updateRoutine: (routineId, patch) =>
        set((s) => {
          const def = s.routines[routineId];
          if (!def) return {};
          const next: RoutineDef = { ...def };
          if (patch.name !== undefined) {
            const t = clampTextField(patch.name, ROUTINE_NAME_MAX);
            if (t) next.name = t;
          }
          if (patch.shortName !== undefined) {
            const t = clampTextField(patch.shortName, ROUTINE_SHORT_MAX);
            if (t) next.shortName = t;
          }
          if (patch.focus !== undefined) {
            const t = clampTextField(patch.focus, ROUTINE_FOCUS_MAX);
            // focus is decorative — allow clearing it entirely
            next.focus = t;
          }
          if (patch.restSeconds !== undefined) {
            next.restSeconds = clampRestSeconds(patch.restSeconds);
          }
          return {
            routines: { ...s.routines, [routineId]: next },
          };
        }),

      updateExercise: (routineId, exerciseId, patch) =>
        set((s) => {
          const def = s.routines[routineId];
          if (!def) return {};
          const idx = def.exercises.findIndex((ex) => ex.id === exerciseId);
          if (idx === -1) return {};
          const cur = def.exercises[idx];
          const next: (typeof cur) = { ...cur };
          if (patch.name !== undefined) {
            const t = clampTextField(patch.name, EXERCISE_NAME_MAX);
            if (t) next.name = t;
          }
          if (patch.repTarget !== undefined) {
            const t = clampTextField(patch.repTarget, EXERCISE_REP_TARGET_MAX);
            if (t) next.repTarget = t;
          }
          if (patch.sets !== undefined) {
            next.sets = Math.min(12, Math.max(1, Math.round(patch.sets)));
          }
          if (patch.usesWeight !== undefined) {
            next.usesWeight = patch.usesWeight;
          }
          const exercises = def.exercises.slice();
          exercises[idx] = next;
          return {
            routines: {
              ...s.routines,
              [routineId]: { ...def, exercises },
            },
          };
        }),

      addExercise: (routineId) =>
        set((s) => {
          const def = s.routines[routineId];
          if (!def || def.exercises.length >= EXERCISES_PER_ROUTINE_MAX) {
            return {};
          }
          const fresh: ExerciseDef = {
            id: `ex_${routineId.toLowerCase()}_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            name: "New Exercise",
            sets: 3,
            repTarget: "8–12 reps",
            usesWeight: true,
          };
          return {
            routines: {
              ...s.routines,
              [routineId]: { ...def, exercises: [...def.exercises, fresh] },
            },
          };
        }),

      removeExercise: (routineId, exerciseId) =>
        set((s) => {
          const def = s.routines[routineId];
          if (!def || def.exercises.length <= 1) return {}; // never empty a routine
          const exercises = def.exercises.filter((ex) => ex.id !== exerciseId);
          if (exercises.length === def.exercises.length) return {};
          return {
            routines: {
              ...s.routines,
              [routineId]: { ...def, exercises },
            },
          };
        }),

      moveExercise: (routineId, exerciseId, direction) =>
        set((s) => {
          const def = s.routines[routineId];
          if (!def) return {};
          const idx = def.exercises.findIndex((ex) => ex.id === exerciseId);
          const target = idx + direction;
          if (idx === -1 || target < 0 || target >= def.exercises.length) {
            return {};
          }
          const exercises = def.exercises.slice();
          const [moved] = exercises.splice(idx, 1);
          exercises.splice(target, 0, moved);
          return {
            routines: {
              ...s.routines,
              [routineId]: { ...def, exercises },
            },
          };
        }),

      setSchedule: (day, routine) =>
        set((s) => ({
          schedule: { ...s.schedule, [day]: routine },
        })),

      resetProgram: () =>
        set({
          routines: {
            A: { ...DEFAULT_ROUTINES.A, exercises: DEFAULT_ROUTINES.A.exercises.map((ex) => ({ ...ex })) },
            B: { ...DEFAULT_ROUTINES.B, exercises: DEFAULT_ROUTINES.B.exercises.map((ex) => ({ ...ex })) },
          },
          schedule: { ...DEFAULT_SCHEDULE },
        }),

      setSyncCode: (code) =>
        set({
          syncCode:
            code == null
              ? null
              : code
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 12) || null,
        }),

      setRestOverride: (seconds) =>
        set({
          restOverrideSec:
            seconds == null
              ? null
              : Math.min(
                  REST_SECONDS_MAX,
                  Math.max(REST_SECONDS_MIN, Math.round(seconds / 15) * 15)
                ),
        }),

      startRestTimer: (seconds, label) =>
        set({
          restTimer: {
            label,
            totalSeconds: seconds,
            endAt: Date.now() + seconds * 1000,
            pausedRemainingMs: null,
          },
        }),

      pauseRestTimer: () =>
        set((s) => {
          if (!s.restTimer || s.restTimer.pausedRemainingMs !== null) return {};
          const remaining = Math.max(0, s.restTimer.endAt - Date.now());
          return {
            restTimer: { ...s.restTimer, pausedRemainingMs: remaining },
          };
        }),

      resumeRestTimer: () =>
        set((s) => {
          if (!s.restTimer || s.restTimer.pausedRemainingMs === null) return {};
          return {
            restTimer: {
              ...s.restTimer,
              endAt: Date.now() + s.restTimer.pausedRemainingMs,
              pausedRemainingMs: null,
            },
          };
        }),

      bumpRestTimer: (seconds) =>
        set((s) => {
          if (!s.restTimer) return {};
          const t = s.restTimer;
          if (t.pausedRemainingMs !== null) {
            return {
              restTimer: {
                ...t,
                totalSeconds: t.totalSeconds + seconds,
                pausedRemainingMs: t.pausedRemainingMs + seconds * 1000,
              },
            };
          }
          return {
            restTimer: {
              ...t,
              totalSeconds: t.totalSeconds + seconds,
              endAt: t.endAt + seconds * 1000,
            },
          };
        }),

      cancelRestTimer: () => set({ restTimer: null }),

      jumpToToday: () =>
        set({ selectedDay: todayName(), routineOverride: null }),

      /**
       * Graduation: archive the finished cycle (user is prompted to export a
       * backup first) and rewind to a fresh Week 1. Body-weight history,
       * calculator inputs and the plate inventory are intentionally kept.
       */
      startNextCycle: () =>
        set({
          sessions: {},
          currentWeek: 1,
          selectedPhase: 1,
          water: Object.fromEntries(DAYS.map((d) => [d, 0])) as Record<
            DayName,
            number
          >,
        }),

      resetAll: () =>
        set((s) => ({
          ...createInitialState(),
          // keep the user where they are; navigation is transient
          activeTab: s.activeTab,
          selectedDay: todayName(),
        })),
    }),
    {
      name: "lean-bulk-studio-v1",
      version: 6,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s): PersistedSlice => ({
        currentWeek: s.currentWeek,
        selectedPhase: s.selectedPhase,
        bodyWeightKg: s.bodyWeightKg,
        activityFactor: s.activityFactor,
        water: s.water,
        weightLog: s.weightLog,
        sessions: s.sessions,
        handles: s.handles,
        plates: s.plates,
        syncCode: s.syncCode,
        restOverrideSec: s.restOverrideSec,
        routines: s.routines,
        schedule: s.schedule,
      }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          // v1 keyed sessions by `${week}:${day}` — re-key with routine.
          const old = p.sessions as Record<string, WorkoutSession> | undefined;
          if (old && typeof old === "object") {
            const next: Record<string, WorkoutSession> = {};
            for (const session of Object.values(old)) {
              if (session && session.week_number && session.day_name && session.routine) {
                next[sessionKey(session.week_number, session.day_name, session.routine)] =
                  session;
              }
            }
            p.sessions = next;
          }
        }
        if (version < 3) {
          // v3 introduces the body-weight log.
          if (!p.weightLog || typeof p.weightLog !== "object") p.weightLog = {};
        }
        if (version < 4) {
          // v4 introduces cloud sync (device-local code, not part of backups).
          if (typeof p.syncCode !== "string") p.syncCode = null;
        }
        if (version < 5) {
          // v5 introduces the rest-timer override (null = routine defaults).
          if (typeof p.restOverrideSec !== "number") p.restOverrideSec = null;
        }
        if (version < 6) {
          // v6 introduces the Program Builder (custom routines + schedule).
          p.routines = sanitizeRoutines(p.routines);
          p.schedule = sanitizeSchedule(p.schedule);
        }
        return p as PersistedSlice;
      },
    }
  )
);

/** Snapshot of the persisted slice for backup export (Tools → Backup & Restore). */
export function exportPersistedSlice(): BackupData {
  const s = useLeanBulk.getState();
  return {
    currentWeek: s.currentWeek,
    selectedPhase: s.selectedPhase,
    bodyWeightKg: s.bodyWeightKg,
    activityFactor: s.activityFactor,
    water: s.water,
    weightLog: s.weightLog,
    sessions: s.sessions,
    handles: s.handles,
    plates: s.plates,
    restOverrideSec: s.restOverrideSec,
    routines: s.routines,
    schedule: s.schedule,
  };
}

/** Avoids hydration mismatches: true once the persisted store has rehydrated. */
export function useStoreHydration(): boolean {
  const subscribe = useCallback((notify: () => void) => {
    const unsub = useLeanBulk.persist.onFinishHydration(notify);
    return unsub;
  }, []);
  const getSnapshot = useCallback(() => useLeanBulk.persist.hasHydrated(), []);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
