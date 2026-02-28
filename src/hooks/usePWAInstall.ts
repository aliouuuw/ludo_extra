"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_DISMISSED_KEY = "ludo-extra-install-dismissed";
const INSTALL_ACCEPTED_KEY = "ludo-extra-install-accepted";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days before re-prompting

export type InstallState =
  | "idle"
  | "available"
  | "installed"
  | "dismissed"
  | "unsupported";

export function usePWAInstall() {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed as standalone
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setInstallState("installed");
      return;
    }

    // User previously accepted
    if (localStorage.getItem(INSTALL_ACCEPTED_KEY) === "true") {
      setInstallState("installed");
      return;
    }

    // User dismissed recently — check cooldown
    const dismissedAt = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_COOLDOWN_MS) {
        setInstallState("dismissed");
        return;
      }
      localStorage.removeItem(INSTALL_DISMISSED_KEY);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState("available");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect install via appinstalled event
    const installedHandler = () => {
      setInstallState("installed");
      setDeferredPrompt(null);
      localStorage.setItem(INSTALL_ACCEPTED_KEY, "true");
    };
    window.addEventListener("appinstalled", installedHandler);

    // If no prompt fires after a reasonable delay, mark unsupported
    const timeout = setTimeout(() => {
      setInstallState((prev) => (prev === "idle" ? "unsupported" : prev));
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      clearTimeout(timeout);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setInstallState("installed");
      localStorage.setItem(INSTALL_ACCEPTED_KEY, "true");
    } else {
      setInstallState("dismissed");
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setInstallState("dismissed");
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setDeferredPrompt(null);
  }, []);

  return {
    installState,
    promptInstall,
    dismissPrompt,
    isInstallable: installState === "available",
  };
}
