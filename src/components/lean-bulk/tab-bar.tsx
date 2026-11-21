"use client";

import { CalendarDays, ClipboardList, Dumbbell, TrendingUp, Calculator } from "lucide-react";
import { motion } from "framer-motion";
import type { TabId } from "@/lib/fitness/types";
import { useLeanBulk } from "@/lib/fitness/store";
import { cn } from "@/lib/utils";

const TABS: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
  { id: "dashboard", label: "Today", icon: CalendarDays },
  { id: "workout", label: "Workout", icon: Dumbbell },
  { id: "program", label: "Program", icon: ClipboardList },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "tools", label: "Tools", icon: Calculator },
];

export function TabBar() {
  const activeTab = useLeanBulk((s) => s.activeTab);
  const setActiveTab = useLeanBulk((s) => s.setActiveTab);

  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-charcoal-950/90 pb-safe backdrop-blur-md"
    >
      <div className="mx-auto grid w-full max-w-3xl grid-cols-5 px-1">
        {TABS.map(({ id, label, icon: Icon }, i) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={active ? "page" : undefined}
              title={`${label} (shortcut: ${i + 1})`}
              aria-keyshortcuts={String(i + 1)}
              className="relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 py-2"
            >
              {active ? (
                <motion.span
                  layoutId="tab-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-x-1.5 inset-y-1 rounded-xl border border-steel-500/30 bg-steel-600/20"
                  aria-hidden="true"
                />
              ) : null}
              <Icon
                className={cn(
                  "relative z-10 h-5 w-5 transition-colors",
                  active ? "text-mint-400" : "text-slate-400"
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "relative z-10 text-[11px] font-medium transition-colors",
                  active ? "text-steel-200" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
