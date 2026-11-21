"use client";

import { useState } from "react";
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Dices,
  Loader2,
} from "lucide-react";
import type { BackupData, SyncLoadResponse, SyncSaveResponse } from "@/lib/fitness/types";
import { useLeanBulk, exportPersistedSlice } from "@/lib/fitness/store";
import { buildBackup, generateSyncCode, prettyDate } from "@/lib/fitness/utils";
import { SectionHeading } from "./shared";
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
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

/**
 * Cloud Sync — save a snapshot of the full app state to the server under a
 * user-chosen device code, then restore it on any device. The code lives in
 * the persisted store (device-local) and is never part of backup files.
 */
export function CloudSyncCard() {
  const syncCode = useLeanBulk((s) => s.syncCode);
  const setSyncCode = useLeanBulk((s) => s.setSyncCode);
  const importBackupData = useLeanBulk((s) => s.importBackupData);
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{
    data: BackupData;
    updatedAt: string;
    sessions: number;
    weighIns: number;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const codeValid = CODE_PATTERN.test(syncCode ?? "");

  const handleSave = async () => {
    if (!codeValid || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: syncCode,
          data: buildBackup(exportPersistedSlice()),
        }),
      });
      const json = (await res.json()) as SyncSaveResponse;
      if (!res.ok || !json.ok || !json.savedAt) {
        throw new Error(json.error ?? "Save failed. Try again.");
      }
      const when = new Date(json.savedAt);
      toast({
        title: "Snapshot saved ☁️",
        description: `Stored for code ${syncCode} at ${when.toLocaleTimeString()}. Use the same code on any device to restore.`,
      });
    } catch (error) {
      toast({
        title: "Cloud save failed",
        description:
          error instanceof Error
            ? error.message
            : "Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async () => {
    if (!codeValid || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(syncCode ?? "")}`);
      const json = (await res.json()) as SyncLoadResponse;
      if (!res.ok || !json.ok || !json.data) {
        toast({
          title: "Nothing to restore",
          description:
            json.error ??
            "No snapshot found for that code. Save one from this or another device first.",
        });
        return;
      }
      setPending({
        data: json.data,
        updatedAt: json.updatedAt ?? "",
        sessions: Object.keys(json.data.sessions ?? {}).length,
        weighIns: Object.keys(json.data.weightLog ?? {}).length,
      });
    } catch {
      toast({
        title: "Cloud restore failed",
        description: "Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmRestore = () => {
    if (!pending) return;
    setRestoring(true);
    try {
      importBackupData(pending.data);
      toast({
        title: "Snapshot restored ✅",
        description: `${pending.sessions} sessions and ${pending.weighIns} weigh-ins pulled from the cloud.`,
      });
      setPending(null);
    } catch {
      toast({
        title: "Restore failed",
        description: "Something went wrong applying the snapshot.",
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <section aria-label="Cloud sync">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <SectionHeading
          icon={Cloud}
          title="Cloud Sync"
          subtitle="One code snapshots your data — restore it on any device"
        />

        {/* Sync code */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Sync code (4–12 letters &amp; numbers)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                value={syncCode ?? ""}
                onChange={(e) => setSyncCode(e.target.value)}
                placeholder="E.g. K7QM2XPB"
                aria-label="Cloud sync code"
                aria-invalid={syncCode != null && syncCode.length > 0 && !codeValid}
                className="h-11 w-full min-w-0 rounded-xl border border-border bg-charcoal-900 px-3 font-mono text-base font-bold uppercase tracking-widest text-steel-100 placeholder:font-sans placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:border-steel-500/60"
              />
              <button
                type="button"
                onClick={() => setSyncCode(generateSyncCode())}
                aria-label="Generate a random sync code"
                title="Generate a random code"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-steel-500/40 bg-steel-600/15 text-steel-300 transition hover:border-steel-400/60 hover:bg-steel-600/25 active:scale-95"
              >
                <Dices className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!codeValid || saving}
            className={cn(
              "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition active:scale-[0.98]",
              codeValid && !saving
                ? "border-steel-500/40 bg-steel-600/15 text-steel-200 hover:border-steel-400/60 hover:bg-steel-600/25"
                : "cursor-not-allowed border-border bg-charcoal-850 text-slate-500 opacity-70"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CloudUpload className="h-4 w-4" aria-hidden="true" />
            )}
            {saving ? "Saving…" : "Save snapshot"}
          </button>
          <button
            type="button"
            onClick={() => void handleLoad()}
            disabled={!codeValid || loading}
            className={cn(
              "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition active:scale-[0.98]",
              codeValid && !loading
                ? "border-mint-500/40 bg-mint-500/10 text-mint-300 hover:bg-mint-500/20"
                : "cursor-not-allowed border-border bg-charcoal-850 text-slate-500 opacity-70"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CloudDownload className="h-4 w-4" aria-hidden="true" />
            )}
            {loading ? "Checking…" : "Restore snapshot"}
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Saving replaces the previous snapshot for that code. The code is the
          only key — anyone who has it can read or overwrite the snapshot. Tap
          the dice for a random 10-character code (kept remembered on this
          device); short or word-like codes are guessable and not recommended.
        </p>
      </div>

      {/* Restore confirmation */}
      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="border-border bg-charcoal-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this cloud snapshot?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <span className="block">
                  Everything currently on this device will be{" "}
                  <strong className="text-foreground">overwritten</strong> by the
                  snapshot stored under code{" "}
                  <strong className="font-mono text-foreground">{syncCode}</strong>.
                </span>
                {pending ? (
                  <span className="block rounded-lg border border-border bg-charcoal-850 px-3 py-2 text-xs">
                    {pending.updatedAt
                      ? `Saved ${prettyDate(pending.updatedAt.slice(0, 10))} · ${new Date(
                          pending.updatedAt
                        ).toLocaleTimeString()}`
                      : "Save time unknown"}
                    <br />
                    {pending.sessions} workout sessions · {pending.weighIns} weigh-ins
                  </span>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "bg-mint-500 font-bold text-primary-foreground hover:bg-mint-400",
                restoring && "pointer-events-none opacity-60"
              )}
              onClick={(e) => {
                e.preventDefault();
                confirmRestore();
              }}
            >
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Restoring…
                </>
              ) : (
                "Restore snapshot"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
