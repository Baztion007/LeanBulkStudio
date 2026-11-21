"use client";

import { CheckCircle2, Download, MonitorSmartphone, Wifi, WifiOff } from "lucide-react";
import { usePwa } from "@/lib/pwa-store";
import { SectionHeading } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function StatusRow({
  label,
  ok,
  okText,
  pendingText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  pendingText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-charcoal-850 px-3 py-2.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold",
          ok ? "text-mint-400" : "text-amber-400"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            ok ? "bg-mint-400" : "bg-amber-400 animate-pulse"
          )}
        />
        {ok ? okText : pendingText}
      </span>
    </div>
  );
}

/**
 * Tools → "Offline & Install": live connection / offline-readiness status and
 * a one-tap install button when the browser exposes beforeinstallprompt.
 */
export function PwaCard() {
  const online = usePwa((s) => s.online);
  const swReady = usePwa((s) => s.swReady);
  const installed = usePwa((s) => s.installed);
  const installEvent = usePwa((s) => s.installEvent);
  const setInstallEvent = usePwa((s) => s.setInstallEvent);
  const { toast } = useToast();

  const install = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        toast({
          title: "App installed 🎉",
          description:
            "Lean Bulk Studio now lives on your home screen and works offline.",
        });
      }
    } catch {
      /* user dismissed or browser refused — nothing to do */
    } finally {
      setInstallEvent(null); // the prompt is single-use
    }
  };

  return (
    <section aria-label="Offline mode and app install">
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <SectionHeading
          icon={MonitorSmartphone}
          title="Offline &amp; Install"
          subtitle="Install as an app · keeps working without a network"
        />

        <div className="mt-4 space-y-2" role="list" aria-label="App capability status">
          <div role="listitem">
            <StatusRow
              label="Connection"
              ok={online}
              okText="Online"
              pendingText="Offline — data saves locally"
            />
          </div>
          <div role="listitem">
            <StatusRow
              label="Offline mode"
              ok={swReady}
              okText="Ready — app shell cached on device"
              pendingText="Completes after your first visit"
            />
          </div>
          <div role="listitem">
            <StatusRow
              label="Installed as app"
              ok={installed}
              okText="Installed — running standalone"
              pendingText="Not installed yet"
            />
          </div>
        </div>

        {installed ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-mint-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            You&apos;re using the installed app — launch it from your home screen.
          </p>
        ) : installEvent ? (
          <button
            type="button"
            onClick={install}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-steel-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-steel-700/25 transition hover:bg-steel-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel-400 active:scale-[0.98] sm:w-auto"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Install Lean Bulk Studio
          </button>
        ) : (
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0 text-steel-400" aria-hidden="true" />
            To install: use your browser menu → &ldquo;Install app&rdquo; (Chrome/Edge),
            or Share → &ldquo;Add to Home Screen&rdquo; on iPhone/iPad.
          </p>
        )}

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {online ? (
            <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-400" aria-hidden="true" />
          ) : (
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
          )}
          All workout, nutrition and inventory data lives on this device and keeps
          working offline — use Backup or Cloud Sync before switching devices.
        </p>
      </div>
    </section>
  );
}
