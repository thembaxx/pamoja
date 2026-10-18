"use client";

import { useEffect } from "react";

// Keep the collection camera awake while visible; release immediately on close.
export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let disposed = false;
    let lock: WakeLockSentinel | undefined;
    let requesting = false;
    const request = async () => {
      if (
        disposed ||
        requesting ||
        (lock && !lock.released) ||
        document.visibilityState !== "visible"
      )
        return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed) await next.release();
        else lock = next;
      } catch {
        /* Power saving or browser policy may deny a wake lock. */
      } finally {
        requesting = false;
      }
    };
    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, [enabled]);
}
