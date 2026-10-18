"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import type { ApiResult, Snapshot } from "@/lib/types";

export async function api<T>(path: string, body?: unknown, key?: string): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined
        ? undefined
        : { "Content-Type": "application/json", "Idempotency-Key": key || crypto.randomUUID() },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || result.error)
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result.data as T;
}
type AppContext = {
  data: Snapshot;
  ready: boolean;
  pending: boolean;
  syncError: string;
  now: number;
  refresh: () => Promise<void>;
  mutate: <T>(path: string, body?: unknown) => Promise<T>;
  toast: (message: string, error?: boolean) => void;
};
const Context = createContext<AppContext | null>(null);
export function AppProvider({ initial, children }: { initial: Snapshot; children: ReactNode }) {
  const [data, setData] = useState(initial);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [notification, setNotification] = useState<{ message: string; error: boolean } | null>(
    null,
  );
  const keys = useRef(new Map<string, string>());
  const active = useRef(new Map<string, Promise<unknown>>());
  const toast = useCallback(
    (message: string, error = false) => setNotification({ message, error }),
    [],
  );
  const refresh = useCallback(async () => {
    try {
      const snapshot = await api<Snapshot>("snapshot");
      setData(snapshot);
      setSyncError("");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "Updates are paused. Check your connection.",
      );
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const invite = new URLSearchParams(window.location.search).get("invite");
        const snapshot = await api<Snapshot>("session", invite ? { invite } : {});
        if (!cancelled) {
          setData(snapshot);
          setReady(true);
          setSyncError("");
        }
      } catch (error) {
        if (!cancelled)
          setSyncError(error instanceof Error ? error.message : "Could not open your workspace.");
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [ready, refresh]);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SIGNALR_URL;
    if (!url || !ready) return;
    let disposed = false;
    let stop: (() => Promise<void>) | undefined;
    void import("@microsoft/signalr").then(async ({ HubConnectionBuilder, LogLevel }) => {
      if (disposed) return;
      const connection = new HubConnectionBuilder()
        .withUrl(url)
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(LogLevel.Error)
        .build();
      [
        "MemberJoined",
        "TierUnlocked",
        "EscrowFunded",
        "OrderStatusChanged",
        "PickupVerified",
      ].forEach((event) => connection.on(event, () => void refresh()));
      stop = () => connection.stop();
      try {
        await connection.start();
        if (disposed) await connection.stop();
      } catch {
        /* Polling remains available while the optional hub is offline. */
      }
    });
    return () => {
      disposed = true;
      void stop?.();
    };
  }, [ready, refresh]);
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5500);
    return () => clearTimeout(timer);
  }, [notification]);
  const mutate = useCallback(
    <T,>(path: string, body: unknown = {}): Promise<T> => {
      const fingerprint = JSON.stringify({ path, body });
      const existing = active.current.get(fingerprint);
      if (existing) return existing as Promise<T>;
      const key = keys.current.get(fingerprint) || crypto.randomUUID();
      keys.current.set(fingerprint, key);
      setPending(true);
      const promise = api<T>(path, body, key)
        .then(async (result) => {
          keys.current.delete(fingerprint);
          await refresh();
          return result;
        })
        .catch((error: unknown) => {
          toast(error instanceof Error ? error.message : "Please try again.", true);
          throw error;
        })
        .finally(() => {
          active.current.delete(fingerprint);
          setPending(active.current.size > 0);
        });
      active.current.set(fingerprint, promise);
      return promise;
    },
    [refresh, toast],
  );
  return (
    <Context.Provider
      value={{ data, ready, pending, syncError, now: data.asOf, refresh, mutate, toast }}
    >
      {children}
      {notification ? (
        <div
          className={`toast ${notification.error ? "toast-error" : ""}`}
          role={notification.error ? "alert" : "status"}
        >
          {notification.error ? (
            <WarningCircle size={22} />
          ) : (
            <CheckCircle size={22} weight="fill" />
          )}
          <span>{notification.message}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotification(null)}>
            <X size={18} />
          </button>
        </div>
      ) : null}
    </Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("Pamoja components need AppProvider.");
  return context;
}
