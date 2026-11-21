"use client";

import { create } from "zustand";

/**
 * Minimal client store for PWA runtime state (never persisted):
 * connection status, service-worker readiness and the captured
 * `beforeinstallprompt` event used by the custom install button.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  online: boolean;
  /** true once a service worker is active AND controlling this page */
  swReady: boolean;
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
  setOnline: (v: boolean) => void;
  setSwReady: (v: boolean) => void;
  setInstallEvent: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: (v: boolean) => void;
}

export const usePwa = create<PwaState>((set) => ({
  online: true,
  swReady: false,
  installEvent: null,
  installed: false,
  setOnline: (online) => set({ online }),
  setSwReady: (swReady) => set({ swReady }),
  setInstallEvent: (installEvent) => set({ installEvent }),
  setInstalled: (installed) => set({ installed }),
}));
