"use client";

import { Squircle } from "@squircle-js/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Drop,
  Grains,
  HandSoap,
  Package,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Category, Pool } from "@/lib/types";

export const categoryNames: Record<Category, string> = {
  maize: "Maize meal",
  oil: "Cooking oil",
  rice: "Long-grain rice",
  soap: "Laundry soap",
};
export function ProductIcon({ category, size = 22 }: { category: Category; size?: number }) {
  const Icon = { maize: Grains, oil: Drop, rice: Package, soap: HandSoap }[category];
  return <Icon size={size} weight="regular" aria-hidden="true" />;
}
export function ProductTile({ category, large = false }: { category: Category; large?: boolean }) {
  return (
    <Squircle
      cornerRadius={large ? 22 : 12}
      cornerSmoothing={1}
      className={`product-tile category-${category} ${large ? "large" : ""}`}
    >
      <ProductIcon category={category} size={large ? 42 : 24} />
    </Squircle>
  );
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "dark" | "ghost" | "danger";
}) {
  return (
    <Squircle asChild cornerRadius={6} cornerSmoothing={1}>
      <button {...props} className={`button button-${variant} ${className}`}>
        {children}
      </button>
    </Squircle>
  );
}
export function ActionLink({
  children,
  href,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "dark" | "ghost";
  className?: string;
}) {
  return (
    <Squircle asChild cornerRadius={6} cornerSmoothing={1}>
      <Link href={href} className={`button button-${variant} ${className}`}>
        {children}
      </Link>
    </Squircle>
  );
}
export function LiveLabel({
  children = "Auto sync",
  paused = false,
}: {
  children?: ReactNode;
  paused?: boolean;
}) {
  return (
    <span
      className={`live-label ${paused ? "paused" : ""}`}
      title={paused ? "Waiting for connection" : "Updates refresh every 10 seconds"}
    >
      <span className="live-dot" />
      {children}
    </span>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${["Open", "PickupOpen", "Delivered", "Settled", "Collected", "Funded · held"].includes(status) ? "badge-green" : status === "Cancelled" ? "badge-grey" : "badge-amber"}`}
    >
      <span />
      {status === "PickupOpen" ? "Pickup open" : status}
    </span>
  );
}
export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <progress
      className="progress-track"
      aria-label={label}
      max={Math.max(1, max)}
      value={Math.min(value, max)}
    />
  );
}
export function SectionHeading({
  title,
  children,
  subtitle,
}: {
  title: string;
  children?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children ? <div className="heading-actions">{children}</div> : null}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Package size={36} weight="light" />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" onCancel={onClose} aria-labelledby={titleId}>
      <div className="modal-heading">
        <div>
          <p className="eyebrow">PAMOJA · TOGETHER, FOR LESS</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      {description ? <p className="modal-description">{description}</p> : null}
      {children}
    </dialog>
  );
}
export function StageStrip({ stages, current }: { stages: string[]; current: number }) {
  return (
    <ol className="stage-strip">
      {stages.map((stage, index) => (
        <li
          key={stage}
          className={index <= current ? "complete" : ""}
          aria-current={index === current ? "step" : undefined}
        >
          <span>{index < current ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span>
          {stage}
          {index < stages.length - 1 ? <ArrowRight size={14} /> : null}
        </li>
      ))}
    </ol>
  );
}
export function PoolTitle({ pool }: { pool: Pool }) {
  return (
    <span className="pool-title">
      <ProductTile category={pool.category} />
      <span>
        <strong>{pool.name}</strong>
        <small>{pool.unit}</small>
      </span>
    </span>
  );
}
