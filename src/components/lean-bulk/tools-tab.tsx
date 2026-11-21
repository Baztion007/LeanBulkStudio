"use client";

import { useState } from "react";
import {
  Beef,
  Calculator,
  Flame,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Wheat,
  X,
} from "lucide-react";
import type { Plate } from "@/lib/fitness/types";
import { useLeanBulk as useStore } from "@/lib/fitness/store";
import {
  ACTIVITY_LEVELS,
  SURPLUS_KCAL,
  WATER_GOAL_ML,
} from "@/lib/fitness/constants";
import { computeTargets, formatMl } from "@/lib/fitness/utils";
import { SectionHeading, StatTile } from "./shared";
import { BackupCard } from "./backup-card";
import { CloudSyncCard } from "./cloud-sync-card";
import { PlateKitCard } from "./plate-kit-card";
import { PlateMathCard } from "./plate-math-card";
import { PwaCard } from "./pwa-card";
import { RestTimerCard } from "./rest-timer-card";
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

export function ToolsTab() {
  const bodyWeightKg = useStore((s) => s.bodyWeightKg);
  const setBodyWeight = useStore((s) => s.setBodyWeight);
  const activityFactor = useStore((s) => s.activityFactor);
  const setActivityFactor = useStore((s) => s.setActivityFactor);
  const resetAll = useStore((s) => s.resetAll);
  const { toast } = useToast();

  const [bwDraft, setBwDraft] = useState<string>(String(bodyWeightKg));

  const targets = computeTargets(bodyWeightKg, activityFactor);

  const commitBodyWeight = (raw: string) => {
    setBwDraft(raw);
    const v = Number(raw);
    if (Number.isFinite(v) && v > 0) setBodyWeight(Math.min(400, v));
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        icon={Calculator}
        title="Calories, Tools & Plate Inventory"
        subtitle="Your analytical backend workspace"
      />

      {/* 1. Calorie & macronutrient calculator */}
      <section aria-label="Calorie and macronutrient calculator">
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-steel-200">
              Calorie &amp; Macronutrient Intake Calculator
            </h2>
            <span className="rounded-full border border-mint-500/40 bg-mint-500/10 px-2 py-0.5 text-[11px] font-bold text-mint-400">
              +{SURPLUS_KCAL} kcal lean bulk surplus (fixed)
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Current body weight (kg)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={30}
                max={400}
                step={0.5}
                value={bwDraft}
                onChange={(e) => commitBodyWeight(e.target.value)}
                onBlur={() => setBwDraft(String(bodyWeightKg))}
                aria-label="Current body weight in kilograms"
                className="h-11 w-full rounded-xl border border-border bg-charcoal-900 px-3 text-base font-semibold tabular-nums text-steel-100 focus:border-steel-500/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Activity level
              </span>
              <select
                value={activityFactor}
                onChange={(e) => setActivityFactor(Number(e.target.value))}
                aria-label="Activity level"
                className="h-11 w-full rounded-xl border border-border bg-charcoal-900 px-3 text-base font-medium text-steel-100 focus:border-steel-500/60"
              >
                {ACTIVITY_LEVELS.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label} (×{lvl.value}) — {lvl.hint}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Real-time metric cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon={Flame}
              label="Bulking Calories"
              value={targets.calories.toLocaleString()}
              unit="kcal"
              hint={`Maintenance ≈ ${targets.maintenance.toLocaleString()} kcal + ${SURPLUS_KCAL}`}
              tone="mint"
            />
            <StatTile
              icon={Beef}
              label="Protein"
              value={targets.protein}
              unit="g"
              hint="1.8 g/kg (range 1.6–2.2)"
            />
            <StatTile
              icon={Flame}
              label="Fats"
              value={targets.fat}
              unit="g"
              hint="25% of energy profile"
            />
            <StatTile
              icon={Wheat}
              label="Carbs"
              value={targets.carbs}
              unit="g"
              hint="Remaining calories"
            />
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Hydration goal from these metrics: {formatMl(WATER_GOAL_ML)}/day ·
            Updates targets across the Dashboard in real time.
          </p>
        </div>
      </section>

      {/* 2. Permanent form & safety blueprint cards */}
      <section aria-label="Form and safety blueprints" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-mint-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-steel-100">
              Don&apos;t Rush the Weight
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Form always comes first. If you swing your body or cheat the range of
            motion, your muscles do less work, stopping growth.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-steel-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-steel-100">
              Adjustable Plate Setup
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Use your 2.5 lb plates for small incremental adjustments on upper body
            movements, and your 5 lb plates for lower body jumps.
          </p>
        </div>
      </section>

      {/* 2b. Rest timer preference */}
      <RestTimerCard />

      {/* 3. Plate inventory */}
      <PlateInventory />

      {/* 3b. Plate kit customizer (add/remove plates + handle weights) */}
      <PlateKitCard />

      {/* 3c. Plate math solver (uses the inventory above) */}
      <PlateMathCard />

      {/* 4. Backup & restore */}
      <BackupCard />

      {/* 4b. Cloud sync (server snapshots) */}
      <CloudSyncCard />

      {/* 4c. Offline mode & PWA install */}
      <PwaCard />

      {/* 5. Danger zone */}
      <section aria-label="Reset app data" className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-steel-200">Reset app data</h3>
            <p className="text-[11px] text-muted-foreground">
              Clears all locally stored workouts, hydration, calculator inputs and
              the plate inventory.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Reset everything
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border bg-charcoal-900">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all app data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every logged workout, water intake record, calculator setting and
                  the plate inventory will be erased from this device. This cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => {
                    useStore.persist.clearStorage();
                    resetAll();
                    toast({
                      title: "App data reset",
                      description: "Lean Bulk Studio is back to a fresh start.",
                    });
                  }}
                >
                  Erase everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------- Inventory --------------------------------- */

function PlateInventory() {
  const handles = useStore((s) => s.handles);
  const plates = useStore((s) => s.plates);
  const attachPlate = useStore((s) => s.attachPlate);
  const detachPlate = useStore((s) => s.detachPlate);

  const storagePlates = plates
    .filter((p) => p.status !== "attached")
    .sort((a, b) => b.weight_lbs - a.weight_lbs);

  return (
    <section aria-label="Dumbbell plate inventory">
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-steel-200">
            Dumbbell Plate Inventory
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Tap × to detach a plate · + to attach
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {handles.map((handle) => {
            const attached = plates
              .filter((p) => p.assigned_to_handle === handle.id)
              .sort((a, b) => b.weight_lbs - a.weight_lbs);
            const total =
              handle.empty_weight_lbs +
              attached.reduce((acc, p) => acc + p.weight_lbs, 0);
            return (
              <div
                key={handle.id}
                className="rounded-xl border border-border/70 bg-charcoal-850 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-steel-200">{handle.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    handle {handle.empty_weight_lbs} lb
                  </p>
                </div>

                {/* Mini dumbbell preview */}
                <div className="mt-3 flex h-12 items-center justify-center gap-0.5">
                  <PlateRects plates={attached.filter((_, i) => i % 2 === 0)} side="left" />
                  <div className="h-1.5 w-8 rounded-full bg-charcoal-600" aria-hidden="true" />
                  <PlateRects plates={attached.filter((_, i) => i % 2 === 1)} side="right" />
                </div>

                <p className="mt-2 text-center">
                  <span className="font-mono text-xl font-bold tabular-nums text-mint-400">
                    {total % 1 === 0 ? total : total.toFixed(1)}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">lb loaded</span>
                </p>

                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {attached.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">Empty handle</span>
                  ) : (
                    attached.map((p) => (
                      <PlateChip key={p.plate_id} plate={p} onDetach={() => detachPlate(p.plate_id)} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Storage pool */}
        <div className="mt-4 rounded-xl border border-dashed border-border p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Plates in storage
          </p>
          {storagePlates.length === 0 ? (
            <p className="mt-2 text-xs text-mint-400">
              All plates attached — both dumbbells fully loaded 💪
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {storagePlates.map((p) => (
                <div
                  key={p.plate_id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-charcoal-900 px-2.5 py-1.5"
                >
                  <span className="text-xs font-medium text-steel-200">
                    {p.weight_lbs} lb plate
                  </span>
                  <span className="flex items-center gap-1.5">
                    {handles.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => attachPlate(p.plate_id, h.id)}
                        className="inline-flex min-h-[36px] items-center gap-0.5 rounded-md border border-steel-500/30 bg-steel-600/15 px-2 text-[11px] font-semibold text-steel-300 transition hover:border-steel-400/60 hover:bg-steel-600/25"
                        aria-label={`Attach ${p.weight_lbs} lb plate to ${h.name}`}
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        {h.id === "handle_1" ? "Left" : "Right"}
                      </button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PlateChip({ plate, onDetach }: { plate: Plate; onDetach: () => void }) {
  const small = plate.weight_lbs <= 2.5;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] font-bold tabular-nums",
        small
          ? "border-mint-500/40 bg-mint-500/10 text-mint-300"
          : "border-steel-500/40 bg-steel-600/15 text-steel-200"
      )}
    >
      {plate.weight_lbs} lb
      <button
        type="button"
        onClick={onDetach}
        aria-label={`Detach ${plate.weight_lbs} lb plate`}
        className="grid h-6 w-6 place-items-center rounded transition hover:bg-foreground/10 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

function PlateRects({ plates, side }: { plates: Plate[]; side: "left" | "right" }) {
  return (
    <div
      className={cn("flex items-center gap-0.5", side === "right" && "flex-row-reverse")}
      aria-hidden="true"
    >
      {plates.map((p) => (
        <div
          key={p.plate_id}
          className={cn(
            "w-1.5 rounded-sm",
            p.weight_lbs <= 2.5
              ? "h-5 bg-mint-500/70"
              : "h-8 bg-steel-500/70"
          )}
        />
      ))}
    </div>
  );
}
