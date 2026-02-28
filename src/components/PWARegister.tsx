"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          console.log("SW registered:", registration);
        } catch (error) {
          console.error("SW registration failed:", error);
        }
      };

      registerSW();
    }
  }, []);

  return null;
}
