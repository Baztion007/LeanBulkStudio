"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw, TriangleAlert } from "lucide-react";

/**
 * Route-segment error boundary. Renders inside the root layout, so the
 * app's Tailwind theme tokens are available. Offers an in-place retry
 * (re-mounts the crashed segment) and a full-reload escape hatch.
 * Your persisted workout data lives in localStorage and is untouched
 * by render crashes — only this session's UI resets.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Lean Bulk Studio] render error:", error);
  }, [error]);

  return (
    <main
      className="grid min-h-[80vh] place-items-center px-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-charcoal-900 p-6 text-center">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-500/40 bg-amber-500/10"
          aria-hidden="true"
        >
          <TriangleAlert className="h-6 w-6 text-amber-500" />
        </span>

        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-steel-100">
            Something went wrong
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The app hit an unexpected error while rendering. Your logged
            workouts are safe on this device. Try again — if it keeps
            happening, reload the app.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-steel-600 px-4 text-sm font-semibold text-white shadow-md shadow-steel-700/30 transition hover:bg-steel-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel-400"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:border-steel-500/50 hover:text-steel-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel-400"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Back to Today
          </Link>
        </div>

        {error.digest ? (
          <p className="text-[10px] font-medium tabular-nums text-slate-500">
            Error ID: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
