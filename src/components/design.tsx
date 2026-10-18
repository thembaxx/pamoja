"use client";

import {
  ArrowDown,
  ArrowRight,
  CaretLeft,
  CaretRight,
  Check,
  House,
  QrCode,
  Receipt,
  SquaresFour,
} from "@phosphor-icons/react";
import { Squircle } from "@squircle-js/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { money } from "@/lib/money";
import type { Pool } from "@/lib/types";
import { useApp } from "./provider";
import { LiveLabel } from "./ui";

export function useDesign() {
  const params = useSearchParams();
  const glass = params.get("style") === "glass";
  const href = (path: string) =>
    glass ? `${path}${path.includes("?") ? "&" : "?"}style=glass` : path;
  return { glass, href };
}

export function MotionRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const { ready } = useApp();
  const { glass } = useDesign();
  useEffect(() => {
    if (!ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.animate(
            [
              { opacity: 0, transform: "translateY(14px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 550, easing: "cubic-bezier(.2,.75,.2,1)", fill: "backwards" },
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08 },
    );
    ref.current.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [path, glass]);
  return (
    <div
      ref={ref}
      data-ready={ready}
      className={`design-root design-${glass ? "glass" : "ledger"}`}
      key={`${path}-${glass}`}
    >
      {children}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Squircle
      cornerRadius={28}
      cornerSmoothing={1}
      className={`ref-glass ${className}`}
      data-reveal
    >
      {children}
    </Squircle>
  );
}

export function DisplayMoney({
  amount,
  serif = false,
  currency,
  animate = true,
}: {
  amount: number;
  serif?: boolean;
  currency?: string;
  animate?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(amount);
  useEffect(() => {
    if (
      previous.current === amount ||
      !animate ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    ref.current?.animate(
      [
        { transform: "translateY(5px)", opacity: 0.4 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: 350, easing: "ease-out" },
    );
    previous.current = amount;
  }, [amount, animate]);
  const [whole, cents] = money(amount, currency).split(".");
  return (
    <span className={`ref-money ${serif ? "serif" : ""}`} ref={ref}>
      {whole}
      <span className="money-cents">.{cents}</span>
    </span>
  );
}

export function shortName(name: string) {
  const words = name.split(" ");
  return `${words[0]}${words.length > 1 ? ` ${words.at(-1)?.[0]}.` : ""}`;
}
export function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
}
export function productName(pool: Pick<Pool, "name" | "unit">) {
  return `${pool.name} ${pool.unit.replace(/\s(?=kg|L)/g, "")}`;
}
export function dayDate(date: string, month = false) {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  return `${day} ${d.getUTCDate()}${month ? ` ${d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}` : ""}`;
}
export function closeLabel(date: string) {
  const d = new Date(date);
  return `${d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function PhoneHeader({
  title,
  back = "/",
  right,
  glass = false,
  onTitleClick,
}: {
  title?: string;
  back?: string;
  right?: ReactNode;
  glass?: boolean;
  onTitleClick?: () => void;
}) {
  const { href } = useDesign();
  const { ready, syncError } = useApp();
  return (
    <header className={`phone-header ${glass ? "glass-header" : ""}`}>
      <Squircle asChild cornerRadius={glass ? 80 : 5} cornerSmoothing={1}>
        <Link className="phone-back" href={href(back)} aria-label="Go back">
          <CaretLeft size={22} />
        </Link>
      </Squircle>
      {title ? (
        onTitleClick ? (
          <button className="phone-header-title" onClick={onTitleClick} aria-label="Pool actions">
            {title}
          </button>
        ) : (
          <span className="phone-header-title">{title}</span>
        )
      ) : null}
      {right ?? (glass ? <LiveLabel paused={!ready || !!syncError}>Live</LiveLabel> : <span />)}
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { href } = useDesign();
  return (
    <nav className="ref-bottom-nav" aria-label="Mobile navigation">
      {[
        { to: "/", label: "Home", Icon: House },
        { to: "/pools", label: "Pools", Icon: SquaresFour },
        { to: "/orders", label: "Orders", Icon: Receipt },
        { to: "/pickups", label: "Pickup", Icon: QrCode },
      ].map(({ to, label, Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link
            key={to}
            href={href(to)}
            aria-current={active ? "page" : undefined}
            className={active ? "active" : ""}
          >
            <Icon size={23} weight="regular" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SwapArrow() {
  return (
    <span className="ref-swap-arrow" aria-hidden="true">
      <ArrowDown size={21} />
    </span>
  );
}

export function DateStrip({
  date,
  count = 4,
  onChange,
  selected = 0,
}: {
  date: string;
  count?: number;
  selected?: number;
  onChange?: (index: number) => void;
}) {
  return (
    <div className="ref-date-strip" aria-label="Pickup dates">
      {Array.from({ length: count }, (_, index) => {
        const d = new Date(date);
        d.setUTCDate(d.getUTCDate() + [0, 1, 7, 14][index]);
        return (
          <Squircle asChild cornerRadius={5} cornerSmoothing={1} key={index}>
            <button
              className={selected === index ? "selected" : ""}
              onClick={() => onChange?.(index)}
              aria-pressed={selected === index}
            >
              <span>{d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
              <strong>{String(d.getUTCDate()).padStart(2, "0")}</strong>
            </button>
          </Squircle>
        );
      })}
    </div>
  );
}

export function OrderStages({ delivered = false }: { delivered?: boolean }) {
  return (
    <div className="ref-order-stages">
      {[
        ["Funds", delivered ? "Paid" : "Held"],
        ["Order", "Now"],
        ["Deliver", "Fri"],
        ["Release", "Sat"],
      ].map(([label, value], index) => (
        <Squircle cornerRadius={5} key={label} className={index === 0 ? "selected" : ""}>
          <span>{label}</span>
          <strong>{value}</strong>
        </Squircle>
      ))}
    </div>
  );
}

export function SlideConfirm({
  label,
  pendingLabel = "Confirming…",
  onConfirm,
  disabled,
  pending = false,
}: {
  label: string;
  pendingLabel?: string;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
  pending?: boolean;
}) {
  const [value, setValue] = useState(0);
  const lock = useRef(false);
  async function confirm() {
    if (lock.current || disabled) return;
    lock.current = true;
    setValue(100);
    try {
      await onConfirm();
    } finally {
      lock.current = false;
      setValue(0);
    }
  }
  return (
    <div
      className={`ref-slide ${pending ? "is-pending" : ""}`}
      style={{ "--slide": value / 100 } as CSSProperties}
    >
      <span className="ref-slide-label">{pending ? pendingLabel : label}</span>
      <span className="ref-slide-fill" />
      <span className="ref-slide-thumb" aria-hidden="true">
        {pending ? (
          <span className="tiny-spinner" />
        ) : value === 100 ? (
          <Check size={23} />
        ) : (
          <CaretRight size={23} />
        )}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        aria-label={label}
        disabled={disabled || pending}
        onChange={(event) => {
          const n = Number(event.target.value);
          setValue(n);
          if (n >= 98) void confirm();
        }}
        onPointerUp={() => {
          if (value < 98) setValue(0);
        }}
      />
      <button
        className="sr-only sr-only-focusable"
        disabled={disabled || pending}
        onClick={() => void confirm()}
      >
        Confirm {label.toLowerCase().replace("slide to ", "")}
      </button>
    </div>
  );
}

export function Celebrate({ active = true }: { active?: boolean }) {
  return active ? (
    <span className="celebration" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} style={{ "--i": i } as CSSProperties} />
      ))}
    </span>
  ) : null;
}

export function ArrowCTA({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ArrowRight size={20} />
    </>
  );
}
