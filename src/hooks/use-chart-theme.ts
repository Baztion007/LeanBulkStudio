"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

export interface ChartPalette {
  grid: string;
  axisLine: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  line: string;
  dotFill: string;
}

const DARK: ChartPalette = {
  grid: "#17212c",
  axisLine: "#223041",
  tick: "#8fa0b3",
  tooltipBg: "#111a23",
  tooltipBorder: "rgba(148, 173, 200, 0.2)",
  tooltipText: "#cfe2f1",
  line: "#3dffa8",
  dotFill: "#0c1218",
};

const LIGHT: ChartPalette = {
  grid: "#e2e8f0",
  axisLine: "#cbd5e1",
  tick: "#4f6076",
  tooltipBg: "#ffffff",
  tooltipBorder: "rgba(20, 33, 47, 0.16)",
  tooltipText: "#182430",
  line: "#0a7549",
  dotFill: "#ffffff",
};

/**
 * Recharts takes concrete color strings (not CSS variables), so we derive the
 * palette from the resolved theme. Defaults to dark until mounted to avoid a
 * hydration mismatch; charts re-render once the theme resolves.
 */
export function useChartTheme(): ChartPalette {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) return DARK;
  return resolvedTheme === "light" ? LIGHT : DARK;
}
