"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/** True after hydration — without setState-in-effect (lint-safe). */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/**
 * Dark / light toggle.
 * - Shows the icon of the theme you will switch TO (sun in dark mode)
 * - Dynamic aria-label announces the action, not the state (WCAG 4.1.2)
 * - Renders a stable placeholder until mounted to avoid hydration mismatch
 *   (next-themes only knows the resolved theme on the client)
 * - 40px+ touch target with a visible focus ring from the global base style
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-charcoal-850 text-steel-300 transition-colors hover:border-steel-500/50 hover:text-steel-200 active:scale-95"
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Moon className="h-5 w-5" aria-hidden="true" />
        )
      ) : (
        <span className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
