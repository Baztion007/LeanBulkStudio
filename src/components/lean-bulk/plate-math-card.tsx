"use client";

import { useMemo, useState } from "react";
import { Check, Scale, TriangleAlert, Wand2, X } from "lucide-react";
import type { Plate, PlateSolverResult } from "@/lib/fitness/types";
import { useLeanBulk } from "@/lib/fitness/store";
import { achievablePlateTargets, solvePlates } from "@/lib/fitness/utils";
import { SectionHeading } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const fmt = (n: number): string => (n % 1 === 0 ? String(n) : n.toFixed(1));

function PlateChip({ plate, onRemove }: { plate: Plate; onRemove?: () => void }) {
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
      {fmt(plate.weight_lbs)} lb
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${fmt(plate.weight_lbs)} lb plate`}
          className="grid h-6 w-6 place-items-center rounded transition hover:bg-foreground/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

/**
 * Plate Math Solver — type a target dumbbell weight and get the EXACT plate
 * setup for each handle from the real inventory, then apply it in one tap.
 */
export function PlateMathCard() {
  const handles = useLeanBulk((s) => s.handles);
  const plates = useLeanBulk((s) => s.plates);
  const applyPlateAssignment = useLeanBulk((s) => s.applyPlateAssignment);
  const { toast } = useToast();

  const [mode, setMode] = useState<"both" | "single">("both");
  const [targetDraft, setTargetDraft] = useState("15");

  const target = Number(targetDraft);
  const validTarget = Number.isFinite(target) && target > 0;

  const achievable = useMemo(
    () => achievablePlateTargets(handles, plates, mode),
    [handles, plates, mode]
  );

  const result = useMemo<PlateSolverResult | null>(() => {
    if (!validTarget) return null;
    return solvePlates(target, handles, plates, mode);
  }, [validTarget, target, handles, plates, mode]);

  const apply = (r: PlateSolverResult) => {
    if (!r.ok) return;
    applyPlateAssignment(r.assignments);
    toast({
      title: "Dumbbells loaded 🏋️",
      description:
        mode === "both"
          ? `Both handles set up to ${fmt(r.targetLbs)} lb — plates matched your inventory.`
          : `Left handle set up to ${fmt(r.targetLbs)} lb — remaining plates re-racked to storage.`,
    });
  };

  return (
    <section aria-label="Plate math solver">
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <SectionHeading
          icon={Scale}
          title="Plate Math Solver"
          subtitle="Target weight → exact plate setup from your inventory"
        />

        {/* Mode selector */}
        <div
          className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-charcoal-850 p-1"
          role="group"
          aria-label="Solver mode"
        >
          {(
            [
              { id: "both", label: "Both dumbbells", hint: "same weight each" },
              { id: "single", label: "One dumbbell", hint: "left handle only" },
            ] as const
          ).map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => setMode(m.id)}
                className={cn(
                  "min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                  active
                    ? "bg-steel-600 text-white shadow-md shadow-steel-700/30"
                    : "text-slate-400 hover:bg-charcoal-800 hover:text-steel-300"
                )}
              >
                {m.label}
                <span className="ml-1.5 hidden text-[10px] font-normal opacity-75 sm:inline">
                  {m.hint}
                </span>
              </button>
            );
          })}
        </div>

        {/* Target input + quick chips */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-start">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Target per dumbbell (lb)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={200}
              step={2.5}
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              aria-label="Target weight per dumbbell in pounds"
              className="h-11 w-full rounded-xl border border-border bg-charcoal-900 px-3 text-base font-semibold tabular-nums text-steel-100 focus:border-steel-500/60"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Achievable with your plates
            </span>
            <div className="flex flex-wrap gap-1.5">
              {achievable.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTargetDraft(String(t))}
                  aria-label={`Set target to ${fmt(t)} pounds`}
                  aria-pressed={validTarget && target === t}
                  className={cn(
                    "min-h-[36px] rounded-lg border px-2.5 py-1 font-mono text-xs font-bold tabular-nums transition",
                    validTarget && target === t
                      ? "border-mint-500/50 bg-mint-500/15 text-mint-400"
                      : "border-border bg-charcoal-900 text-steel-300 hover:border-steel-500/50 hover:bg-steel-600/15"
                  )}
                >
                  {fmt(t)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        <div aria-live="polite" className="mt-4">
          {!result || !validTarget ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              Enter a target weight to solve the plate setup.
            </p>
          ) : result.ok ? (
            <div className="space-y-3 rounded-xl border border-mint-500/30 bg-mint-500/[0.06] p-3.5">
              {result.handles.map((h) => (
                <div
                  key={h.handleId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-charcoal-900 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-steel-200">
                      {h.handleName}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {h.plates.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">
                          No plates — handle alone
                        </span>
                      ) : (
                        h.plates.map((p) => <PlateChip key={p.plate_id} plate={p} />)
                      )}
                    </div>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="font-mono text-lg font-bold tabular-nums text-mint-400">
                      {fmt(h.totalLbs)}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">lb</span>
                  </p>
                </div>
              ))}

              <p className="text-[11px] text-muted-foreground">
                Left in storage:{" "}
                {result.leftovers.length === 0
                  ? "nothing — every plate is in use"
                  : result.leftovers.map((p) => `${fmt(p.weight_lbs)} lb`).join(", ")}
              </p>

              <button
                type="button"
                onClick={() => apply(result)}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-mint-500 px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-mint-600/20 transition hover:bg-mint-400 focus-visible:outline-2 focus-visible:outline-mint-400 active:scale-[0.98] sm:w-auto"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Apply to inventory
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.07] p-3.5">
              <p className="flex items-start gap-1.5 text-xs font-semibold text-amber-500">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {result.reason === "too-heavy"
                  ? `${fmt(result.targetLbs)} lb is beyond your inventory — the most you can load is ${fmt(result.maxTargetLbs)} lb.`
                  : result.reason === "too-light"
                    ? `${fmt(result.targetLbs)} lb is below the bare handle (${fmt(result.minTargetLbs)} lb).`
                    : `${fmt(result.targetLbs)} lb isn't possible with your current plate sizes — try the nearest achievable weights below.`}
              </p>
              {result.suggestions.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Try:</span>
                  {result.suggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTargetDraft(String(t))}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-mint-500/40 bg-mint-500/10 px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-mint-300 transition hover:bg-mint-500/20"
                      aria-label={`Retry with ${fmt(t)} pounds`}
                    >
                      <Wand2 className="h-3 w-3" aria-hidden="true" />
                      {fmt(t)} lb
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
