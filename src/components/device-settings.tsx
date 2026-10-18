"use client";

import { useRef } from "react";
import { CheckCircle, Desktop, DownloadSimple, Moon, Sun, X } from "@phosphor-icons/react";
import type { ThemePreference } from "@/lib/theme";
import { useDevice } from "./pwa-provider";
import { Button } from "./ui";

const themes = [
  { value: "system", label: "System", icon: Desktop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useDevice();
  const index = themes.findIndex((item) => item.value === theme);
  const current = themes[index];
  const next = themes[(index + 1) % themes.length];
  const Icon = current.icon;
  return (
    <button
      className="icon-button theme-toggle"
      aria-label={`Theme: ${current.label}. Switch to ${next.label.toLowerCase()} mode`}
      title={`Theme: ${current.label}`}
      onClick={() => setTheme(next.value)}
    >
      <Icon size={20} />
    </button>
  );
}

export function InstallButton({ className = "" }: { className?: string }) {
  const { installed, install } = useDevice();
  const help = useRef<HTMLDialogElement>(null);
  if (installed)
    return (
      <span className={`installed-label ${className}`}>
        <CheckCircle size={18} />
        Pamoja is installed
      </span>
    );
  return (
    <>
      <Button
        className={className}
        variant="secondary"
        onClick={() =>
          void install().then((handled) => {
            if (!handled) help.current?.showModal();
          })
        }
      >
        <DownloadSimple size={18} />
        Install Pamoja
      </Button>
      <dialog ref={help} className="modal install-help" aria-label="Install Pamoja">
        <div className="modal-heading">
          <h2>Make room for together.</h2>
          <button
            className="icon-button"
            aria-label="Close installation help"
            onClick={() => help.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <p>
          Add Pamoja to your home screen for a dedicated app window and quick access to your pools.
        </p>
        <ol>
          <li>
            <strong>iPhone or iPad:</strong> open the browser’s Share menu, then choose “Add to Home
            Screen” and “Open as Web App” if offered.
          </li>
          <li>
            <strong>Android:</strong> open your browser’s menu and choose “Install app” or “Add to
            Home screen”.
          </li>
          <li>
            <strong>Desktop:</strong> use the install icon in the address bar, or your browser’s app
            menu. Some browsers only offer a bookmark.
          </li>
        </ol>
        <p className="field-note">
          Installation requires HTTPS or localhost. Availability depends on your browser.
        </p>
        <Button onClick={() => help.current?.close()}>Got it</Button>
      </dialog>
    </>
  );
}

export function DeviceSettings() {
  const { theme, setTheme, installed, offlineReady, workerError, updateReady, applyUpdate } =
    useDevice();
  return (
    <section className="panel simple-panel device-settings">
      <p className="eyebrow">MADE FOR YOUR DEVICE</p>
      <h2>A little more at home.</h2>
      <p>Match your screen, keep Pamoja close, and pick up where you left off.</p>
      <fieldset className="theme-options">
        <legend>Appearance</legend>
        {themes.map(({ value, label, icon: Icon }) => (
          <label key={value}>
            <input
              type="radio"
              name="appearance"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value as ThemePreference)}
            />
            <Icon size={20} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <div className="device-install-row">
        <div>
          <h3>
            {installed ? "Your community, one tap away." : "Your community. On your home screen."}
          </h3>
          <p>
            {workerError
              ? "Offline support couldn’t start. Reconnect and reload to try again."
              : offlineReady
                ? "Offline launch screen ready. Payments and verification stay online."
                : "Offline support becomes available after your first visit to the production app."}
          </p>
        </div>
        <InstallButton />
      </div>
      {updateReady ? <Button onClick={applyUpdate}>Update & reload</Button> : null}
    </section>
  );
}
