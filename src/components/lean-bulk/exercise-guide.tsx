"use client";

import { BookOpen } from "lucide-react";
import { EXERCISE_GUIDES } from "@/lib/fitness/exercise-guides";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * "How to perform" button + dialog for one exercise: ordered execution cues
 * and the most common mistake. Text-only by design (no images), so guides
 * weigh nothing and stay available offline.
 */
export function ExerciseGuideButton({
  exerciseId,
  exerciseName,
}: {
  exerciseId: string;
  exerciseName: string;
}) {
  const guide = EXERCISE_GUIDES[exerciseId];

  /* Unknown exercise id (custom or older persisted data) → no button */
  if (!guide) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`How to perform ${exerciseName}`}
          title={`How to perform ${exerciseName}`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-steel-500/30 bg-steel-600/15 text-steel-300 transition hover:border-steel-400/60 hover:bg-steel-600/25 hover:text-steel-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel-400"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-border bg-charcoal-900 p-0 sm:max-w-md">
        <DialogHeader className="space-y-0 p-0">
          <DialogTitle className="sr-only">
            Form guide: {exerciseName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Step-by-step instructions for performing {exerciseName} with proper
            form, plus the most common mistake to avoid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 p-4 sm:p-5">
          <p className="text-sm font-bold text-steel-100">
            How to perform{" "}
            <span className="text-mint-400">{exerciseName}</span>
          </p>

          <ol className="space-y-2" aria-label="Execution steps">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-steel-500/40 bg-steel-600/15 text-[10px] font-bold tabular-nums text-steel-300"
                >
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>

          <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.07] px-3 py-2.5">
            <p className="flex items-start gap-1.5 text-[11px] font-semibold leading-relaxed text-amber-500">
              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Avoid: {guide.mistake}
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Form always comes first — if you swing your body or cheat the range
            of motion, your muscles do less work and growth stops.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
