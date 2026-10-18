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
import { ArrowClockwise, WifiSlash } from "@phosphor-icons/react";
import { themeColors, themeStorageKey, type ThemePreference } from "@/lib/theme";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type DeviceContext = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  installed: boolean;
  canInstall: boolean;
  install: () => Promise<boolean>;
  offlineReady: boolean;
  workerError: boolean;
  updateReady: boolean;
  applyUpdate: () => void;
};
const Context = createContext<DeviceContext | null>(null);

function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = themeColors[resolved];
    meta.removeAttribute("media");
  });
  return resolved;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const preference = useRef<ThemePreference>("system");
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [offline, setOffline] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [workerError, setWorkerError] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const refreshing = useRef(false);

  const setTheme = useCallback((value: ThemePreference) => {
    preference.current = value;
    updateTheme(value);
    setResolvedTheme(applyTheme(value));
    try {
      localStorage.setItem(themeStorageKey, value);
    } catch {
      /* Theme still works in this tab. */
    }
  }, []);

  useEffect(() => {
    const readPreference = () => {
      let value: string | null = null;
      try {
        value = localStorage.getItem(themeStorageKey);
      } catch {
        /* Use the system preference. */
      }
      preference.current = value === "light" || value === "dark" ? value : "system";
      updateTheme(preference.current);
      setResolvedTheme(applyTheme(preference.current));
    };
    readPreference();
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => setResolvedTheme(applyTheme(preference.current));
    const onStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null) readPreference();
    };
    system.addEventListener("change", onSystem);
    window.addEventListener("storage", onStorage);
    return () => {
      system.removeEventListener("change", onSystem);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const checkInstalled = () =>
      setInstalled(
        display.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const didInstall = () => {
      setInstalled(true);
      setPrompt(null);
    };
    const network = () => setOffline(!navigator.onLine);
    checkInstalled();
    network();
    display.addEventListener("change", checkInstalled);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", didInstall);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    return () => {
      display.removeEventListener("change", checkInstalled);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", didInstall);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let disposed = false;
    let worker: ServiceWorker | null = null;
    let reg: ServiceWorkerRegistration | null = null;
    const stateChanged = () => {
      if (disposed || worker?.state !== "installed") return;
      if (navigator.serviceWorker.controller) setUpdateReady(true);
    };
    const updateFound = () => {
      worker?.removeEventListener("statechange", stateChanged);
      worker = reg?.installing || null;
      worker?.addEventListener("statechange", stateChanged);
    };
    const controllerChanged = () => {
      if (refreshing.current) window.location.reload();
    };
    const checkUpdate = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void reg?.update().catch(() => {});
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (value) => {
        if (disposed) return;
        reg = value;
        registration.current = value;
        setUpdateReady(!!value.waiting);
        value.addEventListener("updatefound", updateFound);
        if (value.installing) updateFound();
        await navigator.serviceWorker.ready;
        if (!disposed) setOfflineReady(true);
      })
      .catch(() => {
        if (!disposed) setWorkerError(true);
      });
    document.addEventListener("visibilitychange", checkUpdate);
    window.addEventListener("online", checkUpdate);
    return () => {
      disposed = true;
      reg?.removeEventListener("updatefound", updateFound);
      worker?.removeEventListener("statechange", stateChanged);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
      document.removeEventListener("visibilitychange", checkUpdate);
      window.removeEventListener("online", checkUpdate);
    };
  }, []);

  async function install() {
    if (!prompt) return false;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      return true;
    } catch {
      return false;
    } finally {
      setPrompt(null);
    }
  }
  function applyUpdate() {
    if (!registration.current?.waiting) return;
    refreshing.current = true;
    registration.current.waiting.postMessage({ type: "SKIP_WAITING" });
  }
  return (
    <Context.Provider
      value={{
        theme,
        setTheme,
        installed,
        canInstall: !!prompt,
        install,
        offlineReady,
        workerError,
        updateReady,
        applyUpdate,
      }}
    >
      <link rel="manifest" href={`/manifest.webmanifest?theme=${resolvedTheme}`} />
      {children}
      <div className="app-notices">
        {offline ? (
          <output className="app-notice">
            <WifiSlash size={20} />
            <span>You’re offline. Payments and pass verification need a connection.</span>
          </output>
        ) : null}
        {updateReady ? (
          <output className="app-notice">
            <ArrowClockwise size={20} />
            <span>A fresh Pamoja is ready. Finish your current task, then update.</span>
            <button onClick={applyUpdate}>Update & reload</button>
          </output>
        ) : null}
      </div>
    </Context.Provider>
  );
}

export function useDevice() {
  const context = useContext(Context);
  if (!context) throw new Error("Device controls need PwaProvider.");
  return context;
}
