"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Layers } from "lucide-react";
import { useLeanBulk } from "@/lib/fitness/store";
import { muscleGroupSplit, weeklyVolumeSeries } from "@/lib/fitness/utils";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { SectionHeading } from "./shared";
import { cn } from "@/lib/utils";

/* Accessible fixed hues for the four muscle-group bars (theme-verified AA) */
const GROUP_BAR: Record<string, string> = {
  push: "bg-steel-500/80",
  pull: "bg-steel-400/80",
  legs: "bg-mint-500/80",
  core: "bg-mint-600/80",
};

/**
 * Volume analytics — weekly tonnage bar chart plus a Push / Pull / Legs /
 * Core split, computed from COMPLETED sets only (pre-seeded values never
 * fabricate volume).
 */
export function VolumeAnalyticsCard() {
  const sessions = useLeanBulk((s) => s.sessions);
  const chart = useChartTheme();

  const series = useMemo(() => weeklyVolumeSeries(sessions), [sessions]);
  const split = useMemo(() => muscleGroupSplit(sessions), [sessions]);

  const hasData = series.some((p) => p.sets > 0);
  const totalSets = split.reduce((acc, s) => acc + s.sets, 0);
  const totalVolume = split.reduce((acc, s) => acc + s.volumeLbs, 0);

  const chartData = series.map((p) => ({
    week: `W${p.week}`,
    volume: p.volumeLbs,
    sets: p.sets,
  }));

  return (
    <section aria-label="Volume analytics">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <SectionHeading
          icon={BarChart3}
          title="Volume Analytics"
          subtitle={
            hasData
              ? `${totalSets} sets · ${totalVolume.toLocaleString()} lb moved this cycle`
              : "Weekly tonnage & muscle-group split"
          }
        />

        {/* Weekly tonnage chart */}
        <div className="mt-4 h-[200px] w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: -14 }}
              >
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: chart.tick, fontSize: 11 }}
                  axisLine={{ stroke: chart.axisLine }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chart.tick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: chart.grid, opacity: 0.5 }}
                  contentStyle={{
                    backgroundColor: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    borderRadius: 10,
                    fontSize: 12,
                    color: chart.tooltipText,
                  }}
                  formatter={(value, name) =>
                    name === "volume"
                      ? [`${Number(value).toLocaleString()} lb`, "Volume"]
                      : [String(value), "Sets"]
                  }
                  labelFormatter={(label) => `Week ${String(label).replace("W", "")}`}
                />
                <Bar
                  dataKey="volume"
                  fill={chart.line}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
              Complete sets in the Workout tab and your weekly tonnage will
              appear here.
            </div>
          )}
        </div>

        {/* Muscle-group split */}
        {hasData ? (
          <div className="mt-4 space-y-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Muscle-group split (completed sets)
            </p>
            <div
              role="list"
              aria-label="Volume split by muscle group"
              className="space-y-2"
            >
              {split.map((slice) => {
                const pct =
                  totalSets > 0 ? Math.round((slice.sets / totalSets) * 100) : 0;
                return (
                  <div
                    key={slice.group}
                    role="listitem"
                    className="rounded-lg border border-border/70 bg-charcoal-850 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-steel-200">
                        {slice.label}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {slice.sets} set{slice.sets === 1 ? "" : "s"} · {pct}%
                        {slice.volumeLbs > 0
                          ? ` · ${slice.volumeLbs.toLocaleString()} lb`
                          : ""}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-charcoal-800"
                      role="img"
                      aria-label={`${slice.label}: ${slice.sets} sets, ${pct} percent of total volume`}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-500",
                          GROUP_BAR[slice.group] ?? "bg-steel-500/80"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
