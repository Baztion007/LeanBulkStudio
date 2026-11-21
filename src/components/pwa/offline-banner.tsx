"use client";

import { WifiOff } from "lucide-react";
import { usePwa } from "@/lib/pwa-store";

/**
 * Floating pill shown while the device is offline. Sits just above the fixed
 * tab bar and respects the bottom safe area. `role="status"` + aria-live so
 * screen readers announce the transition without interrupting.
 */
export function OfflineBanner() {
  const online = usePwa((s) => s.online);
  const swReady = usePwa((s) => s.swReady);
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{
        bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <p className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-amber-500/40 bg-charcoal-900/95 px-4 py-2 text-xs font-semibold text-amber-400 shadow-xl shadow-black/40 backdrop-blur">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        {swReady
          ? "You're offline — workouts still save to this device"
          : "You're offline — reconnect once to finish offline setup"}
      </p>
    </div>
  );
}
