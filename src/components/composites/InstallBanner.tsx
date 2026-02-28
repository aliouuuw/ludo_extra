"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { usePWAInstall } from "../../hooks/usePWAInstall";
import { PWA_COPY } from "../../copy";

const ANIMATION_DURATION_MS = 300;

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  return isIOS && isWebkit && !isChrome;
}

export function InstallBanner() {
  const { installState, promptInstall, dismissPrompt, isInstallable } =
    usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      const timer = setTimeout(() => setVisible(true), ANIMATION_DURATION_MS);
      return () => clearTimeout(timer);
    }

    if (installState === "unsupported" && isIOSSafari()) {
      const dismissed = localStorage.getItem("ludo-extra-ios-hint-dismissed");
      if (!dismissed) {
        const timer = setTimeout(() => setShowIOSHint(true), ANIMATION_DURATION_MS);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable, installState]);

  const dismissIOSHint = () => {
    setShowIOSHint(false);
    localStorage.setItem("ludo-extra-ios-hint-dismissed", "true");
  };

  if (installState === "installed" || installState === "dismissed") {
    return null;
  }

  // iOS Safari fallback: show manual instructions
  if (showIOSHint) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: "var(--space-4)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            margin: "0 auto",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            transform: showIOSHint ? "translateY(0)" : "translateY(100%)",
            transition: `transform ${ANIMATION_DURATION_MS}ms ease-out`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <Share size={20} style={{ color: "var(--color-neutral-600)" }} />
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "var(--text-base)",
                  color: "var(--color-neutral-900)",
                }}
              >
                {PWA_COPY.installTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={dismissIOSHint}
              aria-label="Fermer"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "var(--space-1)",
                color: "var(--color-neutral-500)",
              }}
            >
              <X size={18} />
            </button>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--color-neutral-600)",
              lineHeight: 1.5,
            }}
          >
            {PWA_COPY.iosInstructions}
          </p>
        </div>
      </div>
    );
  }

  // Standard install banner (Chrome, Edge, etc.)
  if (!isInstallable || !visible) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "var(--space-4)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: `transform ${ANIMATION_DURATION_MS}ms ease-out`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Download size={20} style={{ color: "var(--color-neutral-600)" }} />
            <span
              style={{
                fontWeight: 600,
                fontSize: "var(--text-base)",
                color: "var(--color-neutral-900)",
              }}
            >
              {PWA_COPY.installTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissPrompt}
            aria-label="Fermer"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "var(--space-1)",
              color: "var(--color-neutral-500)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            color: "var(--color-neutral-600)",
            lineHeight: 1.5,
          }}
        >
          {PWA_COPY.installDescription}
        </p>

        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={dismissPrompt}
            style={{
              fontSize: "var(--text-sm)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: "var(--color-neutral-600)",
            }}
          >
            {PWA_COPY.dismissButton}
          </button>
          <button
            type="button"
            onClick={promptInstall}
            style={{
              fontSize: "var(--text-sm)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: "var(--color-neutral-900)",
              color: "var(--color-neutral-100)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {PWA_COPY.installButton}
          </button>
        </div>
      </div>
    </div>
  );
}
