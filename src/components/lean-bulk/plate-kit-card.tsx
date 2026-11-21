"use client";

import { useMemo, useState } from "react";
import {
  Layers,
  Minus,
  PackageOpen,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { DumbbellHandle, Plate } from "@/lib/fitness/types";
import { useLeanBulk as useStore } from "@/lib/fitness/store";
import {
  HANDLE_WEIGHT_MAX_LBS,
  HANDLE_WEIGHT_MIN_LBS,
  MAX_KIT_PLATES,
  PLATE_WEIGHT_MAX_LBS,
  PLATE_WEIGHT_MIN_LBS,
} from "@/lib/fitness/constants";
import { achievablePlateTargets } from "@/lib/fitness/utils";
import { SectionHeading, TipCallout } from "./shared";
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

const fmt = (n: number): string => (n % 1 === 0 ? String(n) : n.toFixed(2).replace(/0$/, ""));

const QUICK_WEIGHTS = [1.25, 2.5, 5, 10, 25];

interface DenomGroup {
  weight: number;
  count: number;
  /** one removable plate id — storage first so loaded dumbbells keep their plates */
  removableId: string | null;
}

/** Group plates by weight; removal prefers plates sitting in storage. */
function groupByWeight(plates: Plate[]): DenomGroup[] {
  const map = new Map<number, Plate[]>();
  for (const p of plates) {
    const list = map.get(p.weight_lbs);
    if (list) list.push(p);
    else map.set(p.weight_lbs, [p]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([weight, list]) => {
      const storage = list.find((p) => p.status !== "attached");
      return { weight, count: list.length, removableId: (storage ?? list[0]).plate_id };
    });
}

function HandleWeightInput({ handle }: { handle: DumbbellHandle }) {
  const setHandleWeight = useStore((s) => s.setHandleWeight);
  const [draft, setDraft] = useState(String(handle.empty_weight_lbs));

  const commit = () => {
    const v = Number(draft);
    if (Number.isFinite(v) && v > 0) {
      setHandleWeight(handle.id, v);
      setDraft(
        String(
          Math.round(
            Math.min(HANDLE_WEIGHT_MAX_LBS, Math.max(HANDLE_WEIGHT_MIN_LBS, v)) * 4
          ) / 4
        )
      );
    } else {
      setDraft(String(handle.empty_weight_lbs));
    }
  };

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {handle.id === "handle_1" ? "Left handle" : "Right handle"} (bare, lb)
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={HANDLE_WEIGHT_MIN_LBS}
        max={HANDLE_WEIGHT_MAX_LBS}
        step={0.5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        aria-label={`${handle.name} bare weight in pounds`}
        className="h-11 w-full rounded-xl border border-border bg-charcoal-900 px-3 text-base font-semibold tabular-nums text-steel-100 focus:border-steel-500/60"
      />
    </label>
  );
}

/**
 * Plate Kit Customizer — the inventory is no longer a fixed 8-plate set.
 * Add plates by denomination or a custom weight, remove them, retune the
 * bare handle weights, or restore the starter kit. Changes feed straight
 * into the inventory, plate-math solver and backups.
 */
export function PlateKitCard() {
  const handles = useStore((s) => s.handles);
  const plates = useStore((s) => s.plates);
  const addPlates = useStore((s) => s.addPlates);
  const removePlate = useStore((s) => s.removePlate);
  const resetPlateKit = useStore((s) => s.resetPlateKit);
  const { toast } = useToast();

  const [customDraft, setCustomDraft] = useState("");

  const groups = useMemo(() => groupByWeight(plates), [plates]);
  const kitFull = plates.length >= MAX_KIT_PLATES;

  const maxBoth = useMemo(() => {
    const t = achievablePlateTargets(handles, plates, "both");
    return t.length > 0 ? t[t.length - 1] : null;
  }, [handles, plates]);
  const maxSingle = useMemo(() => {
    const t = achievablePlateTargets(handles, plates, "single");
    return t.length > 0 ? t[t.length - 1] : null;
  }, [handles, plates]);

  const addOne = (weight: number) => {
    if (kitFull) {
      toast({
        title: "Plate kit is full",
        description: `A kit holds up to ${MAX_KIT_PLATES} plates. Remove one first, or keep your real-life kit lean.`,
      });
      return;
    }
    addPlates(weight, 1);
  };

  const addCustom = () => {
    const v = Number(customDraft);
    if (!Number.isFinite(v) || v < PLATE_WEIGHT_MIN_LBS || v > PLATE_WEIGHT_MAX_LBS) {
      toast({
        title: "Enter a weight between 0.5 and 100 lb",
        description: "Custom plates snap to the nearest 0.25 lb step.",
      });
      return;
    }
    addOne(v);
    setCustomDraft("");
  };

  return (
    <section aria-label="Plate kit customizer">
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <SectionHeading
          icon={Layers}
          title="Plate Kit Customizer"
          subtitle="Match the inventory to your real adjustable dumbbell kit"
          action={
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums",
                kitFull
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  : "border-border bg-charcoal-850 text-muted-foreground"
              )}
              aria-label={`${plates.length} of ${MAX_KIT_PLATES} plates in kit`}
            >
              {plates.length}/{MAX_KIT_PLATES} plates
            </span>
          }
        />

        {/* Handle bare weights */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {handles.map((h) => (
            <HandleWeightInput key={h.id} handle={h} />
          ))}
        </div>

        {/* Denomination rows */}
        <div
          className="mt-4 space-y-1.5"
          role="list"
          aria-label="Plates grouped by weight"
          aria-live="polite"
        >
          {groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              Empty kit — add a plate below to get started.
            </p>
          ) : (
            groups.map((g) => {
              const small = g.weight <= 2.5;
              return (
                <div
                  key={g.weight}
                  role="listitem"
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-charcoal-850 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "w-1.5 rounded-sm",
                        small ? "h-5 bg-mint-500/70" : "h-8 bg-steel-500/70"
                      )}
                    />
                    <span className="font-mono text-sm font-bold tabular-nums text-steel-200">
                      {fmt(g.weight)} lb
                    </span>
                    <span className="text-xs text-muted-foreground">× {g.count}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => g.removableId && removePlate(g.removableId)}
                      disabled={!g.removableId}
                      aria-label={`Remove one ${fmt(g.weight)} lb plate`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-charcoal-900 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => addOne(g.weight)}
                      disabled={kitFull}
                      aria-label={`Add one more ${fmt(g.weight)} lb plate`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-steel-500/30 bg-steel-600/15 text-steel-300 transition hover:border-steel-400/60 hover:bg-steel-600/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Add new plates */}
        <div className="mt-4 rounded-xl border border-border/70 bg-charcoal-850 p-3">
          <p className="text-xs font-semibold text-steel-200">Add plates</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_WEIGHTS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => addOne(w)}
                disabled={kitFull}
                aria-label={`Add a ${w} lb plate`}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border bg-charcoal-900 px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-steel-300 transition hover:border-steel-500/50 hover:bg-steel-600/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                {fmt(w)} lb
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Custom plate weight (lb)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={PLATE_WEIGHT_MIN_LBS}
                max={PLATE_WEIGHT_MAX_LBS}
                step={0.25}
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustom();
                }}
                placeholder="e.g. 7.5"
                aria-label="Custom plate weight in pounds"
                className="h-11 w-full rounded-xl border border-border bg-charcoal-900 px-3 text-base font-semibold tabular-nums text-steel-100 focus:border-steel-500/60"
              />
            </label>
            <button
              type="button"
              onClick={addCustom}
              disabled={kitFull}
              className="inline-flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-steel-600 px-3.5 text-xs font-bold text-white shadow-md shadow-steel-700/25 transition hover:bg-steel-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Add plate
            </button>
          </div>
        </div>

        {/* Kit capability summary */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Max per dumbbell
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-steel-200">
              {maxSingle != null ? `${fmt(maxSingle)} lb` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Max both matched
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-mint-400">
              {maxBoth != null ? `${fmt(maxBoth)} lb` : "—"}
            </p>
          </div>
        </div>

        {kitFull ? (
          <div className="mt-3">
            <TipCallout variant="mint">
              Kit is at the {MAX_KIT_PLATES}-plate cap — that keeps the plate-math
              solver instant. Remove a plate to make room.
            </TipCallout>
          </div>
        ) : null}

        {/* Reset to starter kit */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            New plates start in storage — attach them from the inventory above
            or let the Plate Math Solver place them.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-steel-500/40 hover:text-steel-300"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Starter kit
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border bg-charcoal-900">
              <AlertDialogHeader>
                <AlertDialogTitle>Restore the starter kit?</AlertDialogTitle>
                <AlertDialogDescription>
                  This replaces your current inventory with the original two
                  handles and eight plates (4 × 5 lb, 4 × 2.5 lb). Custom plates
                  and handle weights will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-steel-600 text-white hover:bg-steel-500"
                  onClick={() => {
                    resetPlateKit();
                    toast({
                      title: "Starter kit restored",
                      description: "Back to the original 8-plate, 2-handle setup.",
                    });
                  }}
                >
                  <PackageOpen className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Restore kit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  );
}
