"use client";

import { useEffect } from "react";
import {
  usePwa,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-store";
import { OfflineBanner } from "./offline-banner";

/**
 * Mounts once: registers /sw.js, mirrors connection + install-prompt state
 * into the PWA store and renders the offline banner. Safe no-op in browsers
 * without service-worker support.
 */
export function PwaProvider() {
  useEffect(() => {
    const store = () => usePwa.getState();

    if (typeof navigator !== "undefined") {
      store().setOnline(navigator.onLine);
      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari exposes navigator.standalone
        (navigator as Navigator & { standalone?: boolean }).standalone === true
      ) {
        store().setInstalled(true);
      }
    }

    const goOnline = () => store().setOnline(true);
    const goOffline = () => store().setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const onInstallPrompt = (e: Event) => {
      e.preventDefault(); // keep our custom install flow
      store().setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      store().setInstalled(true);
      store().setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const cleanupDom = () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };

    /* ---- service worker ---- */
    if ("serviceWorker" in navigator) {
      // Already controlled (repeat visit) → offline is ready
      if (navigator.serviceWorker.controller) {
        store().setSwReady(true);
      }
      const onControllerChange = () => store().setSwReady(true);
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange
      );

      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // First visit: the installing worker becomes active + claims pages
          reg.installing?.addEventListener("statechange", () => {
            if (reg.installing?.state === "activated") {
              store().setSwReady(true);
            }
          });
        })
        .catch(() => {
          /* SW unavailable (e.g. hardened privacy mode) — app still works */
        });

      return () => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange
        );
        cleanupDom();
      };
    }

    return cleanupDom;
  }, []);

  return <OfflineBanner />;
}
