"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { useLeanBulk, useStoreHydration } from "@/lib/fitness/store";
import { todayName } from "@/lib/fitness/constants";
import type { TabId } from "@/lib/fitness/types";
import { AppHeader } from "@/components/lean-bulk/app-header";
import { TabBar } from "@/components/lean-bulk/tab-bar";
import { RestTimerOverlay } from "@/components/lean-bulk/rest-timer-overlay";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { DashboardTab } from "@/components/lean-bulk/dashboard-tab";
import { WorkoutTab } from "@/components/lean-bulk/workout-tab";
import { ProgramTab } from "@/components/lean-bulk/program-tab";
import { ProgressTab } from "@/components/lean-bulk/progress-tab";
import { ToolsTab } from "@/components/lean-bulk/tools-tab";

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl border border-steel-500/30 bg-steel-600/15">
        <Dumbbell className="h-7 w-7 text-steel-300" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground">Loading Lean Bulk Studio…</p>
    </div>
  );
}

export default function Home() {
  const hydrated = useStoreHydration();
  const activeTab = useLeanBulk((s) => s.activeTab);

  /* Always open on the real "today" after the persisted store rehydrates */
  useEffect(() => {
    if (!hydrated) return;
    const t = todayName();
    if (useLeanBulk.getState().selectedDay !== t) {
      useLeanBulk.getState().jumpToToday();
    }
  }, [hydrated]);

  /* Reset scroll when switching tabs so each view starts at the top */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  /* Keyboard shortcuts: 1–5 jump between tabs. Ignored while typing in any
     text field or with modifier keys held (WCAG 2.1.4 character-key shortcuts
     safety: single keys never fire inside inputs, and no modifier required
     means a user can still navigate away by other means). */
  useEffect(() => {
    const TAB_ORDER: TabId[] = ["dashboard", "workout", "program", "progress", "tools"];
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      )
        return;
      const idx = ["1", "2", "3", "4", "5"].indexOf(e.key);
      if (idx === -1) return;
      useLeanBulk.getState().setActiveTab(TAB_ORDER[idx]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) return <Splash />;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col">
        {/* WCAG 2.4.1 — bypass blocks: first focusable element skips the nav */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>

        <AppHeader />

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-5 focus-visible:outline-none"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeTab === "dashboard" && <DashboardTab />}
              {activeTab === "workout" && <WorkoutTab />}
              {activeTab === "program" && <ProgramTab />}
              {activeTab === "progress" && <ProgressTab />}
              {activeTab === "tools" && <ToolsTab />}
            </motion.div>
          </AnimatePresence>
        </main>

      {/* Sticky footer: mt-auto pins it to the bottom on short screens and is
          pushed down naturally when content overflows; bottom padding clears
          the fixed tab bar (+ safe area) */}
        <footer
          className="mt-auto border-t border-border px-4 pt-4 text-center"
          style={{
            paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <p className="text-[11px] leading-relaxed text-slate-500">
            Lean Bulk Studio · 6-week Double Progression program · 50 kg lifter
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> · </span>
            All data stays on your device (localStorage) — back it up in Tools
            <span className="hidden md:inline">
              {' '}
              · Keyboard: press <kbd className="rounded border border-border bg-charcoal-850 px-1 font-sans text-[10px]">1</kbd>–
              <kbd className="rounded border border-border bg-charcoal-850 px-1 font-sans text-[10px]">5</kbd> to switch tabs
            </span>
          </p>
        </footer>

        <TabBar />
        <RestTimerOverlay />
        <PwaProvider />
      </div>
    </MotionConfig>
  );
}
