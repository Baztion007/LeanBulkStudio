"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Flame,
  Scale,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useLeanBulk } from "@/lib/fitness/store";
import {
  GAIN_RATE_MAX_PCT,
  GAIN_RATE_MIN_PCT,
} from "@/lib/fitness/constants";
import {
  formatKg,
  prettyDate,
  toISODate,
  weightTrend,
} from "@/lib/fitness/utils";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { TipCallout } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GUIDANCE: Record<
  string,
  { title: string; body: string; tone: "mint" | "steel" }
> = {
  "on-track": {
    title: "On track ✅",
    body: "You're gaining inside the lean-bulk window (+0.25–0.5% of body weight per week). Keep calories where they are.",
    tone: "mint",
  },
  "too-fast": {
    title: "Gaining a little fast",
    body: "Above the lean-bulk window — some of this is likely fat. Trim roughly 100–150 kcal from your daily intake.",
    tone: "steel",
  },
  "too-slow": {
    title: "Gaining a little slow",
    body: "Below the lean-bulk window — add roughly 100–150 kcal to your daily intake and re-check next week.",
    tone: "steel",
  },
  insufficient: {
    title: "Log weekly for trend feedback",
    body: "Weigh in at least once a week — after ~7 days of span the app scores your gain rate against the lean-bulk window.",
    tone: "steel",
  },
};

export function WeightTrendCard() {
  const weightLog = useLeanBulk((s) => s.weightLog);
  const bodyWeightKg = useLeanBulk((s) => s.bodyWeightKg);
  const logWeight = useLeanBulk((s) => s.logWeight);
  const deleteWeightEntry = useLeanBulk((s) => s.deleteWeightEntry);
  const chart = useChartTheme();
  const { toast } = useToast();

  const trend = weightTrend(weightLog);
  const latestStr = String(trend.latestKg ?? bodyWeightKg);
  const [draft, setDraft] = useState<string>(latestStr);
  const [syncedWith, setSyncedWith] = useState<string>(latestStr);

  /* Keep the input in sync when the latest entry changes (log/import/delete).
     Adjusting state during render (not in an effect) avoids cascading renders. */
  if (syncedWith !== latestStr) {
    setSyncedWith(latestStr);
    setDraft(latestStr);
  }

  const commit = () => {
    const v = Number(draft);
    if (!Number.isFinite(v) || v < 30 || v > 400) {
      toast({
        title: "Enter a valid weight",
        description: "Body weight must be between 30 and 400 kg.",
      });
      return;
    }
    logWeight(toISODate(), v);
    toast({
      title: "Weight logged 🎯",
      description: `${formatKg(v)} recorded for today — calorie targets updated.`,
    });
  };

  const recent = [...trend.entries].reverse().slice(0, 5);
  const guidance = GUIDANCE[trend.status] ?? GUIDANCE.insufficient;
  const rateLabel =
    trend.weeklyRateKg === null
      ? "—"
      : `${trend.weeklyRateKg >= 0 ? "+" : ""}${trend.weeklyRateKg.toFixed(2)} kg/wk`;

  /* Healthy-gain window scales with the user's actual body weight */
  const refBw = trend.latestKg ?? bodyWeightKg;
  const targetMin = (refBw * GAIN_RATE_MIN_PCT).toFixed(2);
  const targetMax = (refBw * GAIN_RATE_MAX_PCT).toFixed(2);

  return (
    <section aria-label="Body weight trend">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-steel-500/30 bg-steel-600/15">
              <Scale className="h-4 w-4 text-steel-300" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-steel-200">
                Body Weight Trend
              </h2>
              <p className="text-[11px] text-muted-foreground">
                The lean-bulk feedback loop — aim for +0.25–0.5% per week
              </p>
            </div>
          </div>
          <span className="rounded-full border border-border bg-charcoal-850 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {trend.entries.length} {trend.entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-mint-500/30 bg-mint-500/10 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Current
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-mint-400 text-glow-mint">
              {formatKg(trend.latestKg ?? bodyWeightKg)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {trend.latestDate ? `weigh-in ${prettyDate(trend.latestDate)}` : "no weigh-ins yet"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3">
            <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              Rate
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-steel-200">
              {rateLabel}
            </p>
            <p className="text-[10px] text-muted-foreground">avg over logged span</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-charcoal-850 p-3">
            <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Flame className="h-3 w-3" aria-hidden="true" />
              Target
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-steel-200">
              +{targetMin}–{targetMax}
            </p>
            <p className="text-[10px] text-muted-foreground">
              kg/week @ {formatKg(refBw)} BW
            </p>
          </div>
        </div>

        <TipCallout variant={guidance.tone}>
          <strong>{guidance.title}</strong> — {guidance.body}
        </TipCallout>

        {/* Log input */}
        <div className="mt-3 flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Today&apos;s weight (kg)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={30}
              max={400}
              step={0.1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
              }}
              aria-label="Today's body weight in kilograms"
              className="h-11 w-full rounded-xl border border-border bg-charcoal-900 px-3 text-base font-semibold tabular-nums text-steel-100 focus:border-steel-500/60"
            />
          </label>
          <button
            type="button"
            onClick={commit}
            className="inline-flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-mint-500 px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-mint-600/20 transition hover:bg-mint-400 focus-visible:outline-2 focus-visible:outline-mint-400 active:scale-[0.98]"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Log weigh-in
          </button>
        </div>

        {/* Chart */}
        <div className="mt-4 h-[180px] w-full">
          {trend.entries.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend.entries}
                margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
              >
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: chart.tick, fontSize: 10 }}
                  axisLine={{ stroke: chart.axisLine }}
                  tickLine={false}
                  tickFormatter={(v: string) => prettyDate(v)}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: chart.tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    borderRadius: 10,
                    fontSize: 12,
                    color: chart.tooltipText,
                  }}
                  formatter={(value) => [formatKg(Number(value)), "Body weight"]}
                  labelFormatter={(label) => prettyDate(String(label))}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke={chart.line}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: chart.dotFill, stroke: chart.line, strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: chart.line }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
              Log two or more weigh-ins and your body-weight curve appears here.
            </div>
          )}
        </div>

        {/* Recent entries */}
        {recent.length > 0 ? (
          <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {recent.map((e) => (
              <motion.div
                key={e.date}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-charcoal-850 px-2.5 py-1.5"
              >
                <span className="text-xs font-medium text-steel-200">
                  {prettyDate(e.date)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-bold tabular-nums text-mint-400">
                    {formatKg(e.kg)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteWeightEntry(e.date)}
                    aria-label={`Delete weigh-in from ${prettyDate(e.date)}`}
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-foreground/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              </motion.div>
            ))}
          </div>
        ) : null}

        <p className={cn("mt-2 text-[11px] text-muted-foreground")}>
          Weigh-ins sync to the calorie calculator (Tools tab) automatically.
        </p>
      </div>
    </section>
  );
}
