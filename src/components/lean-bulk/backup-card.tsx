"use client";

import { useRef, useState } from "react";
import {
  DatabaseBackup,
  Download,
  FileUp,
  Loader2,
} from "lucide-react";
import type { BackupData } from "@/lib/fitness/types";
import {
  useLeanBulk,
  exportPersistedSlice,
} from "@/lib/fitness/store";
import {
  buildBackup,
  parseBackup,
  prettyDate,
  toISODate,
} from "@/lib/fitness/utils";
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

/**
 * Download the full persisted slice as a JSON file (all data stays on-device;
 * this is the user's own escape hatch from localStorage wipes).
 */
function downloadBackup(data: BackupData): void {
  const file = buildBackup(data);
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lean-bulk-backup-${toISODate()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function BackupCard() {
  const importBackupData = useLeanBulk((s) => s.importBackupData);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{
    data: BackupData;
    exportedAt: string | null;
    sessions: number;
    weighIns: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    try {
      downloadBackup(exportPersistedSlice());
      toast({
        title: "Backup downloaded 💾",
        description: "Keep the JSON file somewhere safe — it restores everything.",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Your browser blocked the download. Try again or use another browser.",
      });
    }
  };

  const handleFile = async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = parseBackup(raw);
      if (!parsed.ok) {
        toast({ title: "Import failed", description: parsed.error });
        return;
      }
      setPending({
        data: parsed.data,
        exportedAt: safeExportedAt(raw),
        sessions: Object.keys(parsed.data.sessions).length,
        weighIns: Object.keys(parsed.data.weightLog).length,
      });
    } catch {
      toast({ title: "Import failed", description: "Could not read that file." });
    } finally {
      // allow re-selecting the same file later
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    setImporting(true);
    try {
      importBackupData(pending.data);
      toast({
        title: "Backup restored ✅",
        description: `${pending.sessions} sessions and ${pending.weighIns} weigh-ins are back on this device.`,
      });
    } catch {
      toast({
        title: "Restore failed",
        description: "Something went wrong applying the backup.",
      });
    } finally {
      setImporting(false);
      setPending(null);
    }
  };

  return (
    <section aria-label="Backup and restore">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <SectionHeading
          icon={DatabaseBackup}
          title="Backup & Restore"
          subtitle="Your data lives only in this browser — export it regularly"
        />

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-steel-500/40 bg-steel-600/15 px-4 py-2 text-sm font-bold text-steel-200 transition hover:border-steel-400/60 hover:bg-steel-600/25 active:scale-[0.98]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export backup
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-charcoal-850 px-4 py-2 text-sm font-bold text-steel-200 transition hover:border-mint-500/40 hover:text-mint-300 active:scale-[0.98]"
          >
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Import backup
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose a Lean Bulk Studio backup file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Export saves workouts, weigh-ins, hydration, calculator settings and the
          plate inventory as one JSON file. Import replaces everything on this
          device with the file&apos;s contents — you&apos;ll be asked to confirm first.
        </p>
      </div>

      {/* Import confirmation */}
      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="border-border bg-charcoal-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <span className="block">
                  Everything currently on this device will be{" "}
                  <strong className="text-foreground">overwritten</strong> by the
                  backup file.
                </span>
                {pending ? (
                  <span className="block rounded-lg border border-border bg-charcoal-850 px-3 py-2 text-xs">
                    {pending.exportedAt
                      ? `Exported ${prettyDate(pending.exportedAt.slice(0, 10))}`
                      : "Export date unknown"}
                    <br />
                    {pending.sessions} workout sessions · {pending.weighIns} weigh-ins
                  </span>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "bg-mint-500 font-bold text-primary-foreground hover:bg-mint-400",
                importing && "pointer-events-none opacity-60"
              )}
              onClick={(e) => {
                e.preventDefault();
                confirmImport();
              }}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Restoring…
                </>
              ) : (
                "Restore backup"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function safeExportedAt(raw: string): string | null {
  try {
    const v = (JSON.parse(raw) as { exportedAt?: unknown }).exportedAt;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}
