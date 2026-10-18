"use client";

import {
  ArrowUpRight,
  Buildings,
  CreditCard,
  House,
  Info,
  List,
  QrCode,
  Receipt,
  SquaresFour,
  Truck,
  User,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useDesign, BottomNav, MotionRoot } from "./design";
import { useApp } from "./provider";
import { ThemeToggle, InstallButton } from "./device-settings";
import { LiveLabel, Modal } from "./ui";

const navigation = [
  { href: "/", label: "Dashboard", icon: House },
  { href: "/pools", label: "Pools", icon: SquaresFour },
  { href: "/members", label: "Members", icon: User },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/pickups", label: "Pickups", icon: QrCode },
  { href: "/suppliers", label: "Suppliers", icon: Buildings },
];
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`ref-brand ${light ? "brand-light" : ""}`} aria-label="Pamoja home">
      pamoja
    </Link>
  );
}
export function WorkspaceMenu({ supplier = false }: { supplier?: boolean }) {
  const [open, setOpen] = useState(false);
  const { glass } = useDesign();
  return (
    <>
      <button
        className="ref-profile"
        onClick={() => setOpen(true)}
        aria-label={`${supplier ? "AW" : "TM"} · Open workspace menu`}
      >
        {supplier ? "AW" : "TM"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Your Pamoja workspace"
        description="Explore the leader, supplier and member experiences. Payments in this workspace are simulated."
      >
        <div className="ref-device-tools">
          <span>Appearance</span>
          <ThemeToggle />
          <InstallButton />
        </div>
        <div className="ref-menu-links">
          <Link href={glass ? "/?style=glass" : "/"} onClick={() => setOpen(false)}>
            Leader dashboard
            <ArrowUpRight size={18} />
          </Link>
          <Link href="/supplier" onClick={() => setOpen(false)}>
            Supplier console
            <ArrowUpRight size={18} />
          </Link>
          <Link href="/join/maize" onClick={() => setOpen(false)}>
            Member join & pay
            <ArrowUpRight size={18} />
          </Link>
          <Link href={glass ? "/" : "/?style=glass"} onClick={() => setOpen(false)}>
            {glass ? "Direction B · Ledger" : "Direction A · Glass"}
            <ArrowUpRight size={18} />
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            About Pamoja
            <ArrowUpRight size={18} />
          </Link>
          <Link href="/settings" onClick={() => setOpen(false)}>
            Workspace settings
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </Modal>
    </>
  );
}
export function BoardTopbar({ title, supplier = false }: { title: string; supplier?: boolean }) {
  const { ready, syncError } = useApp();
  return (
    <div className="ref-board-topbar">
      <span>{title}</span>
      <div>
        {supplier ? null : <LiveLabel paused={!ready || !!syncError}>Live</LiveLabel>}
        <WorkspaceMenu supplier={supplier} />
      </div>
    </div>
  );
}
export function Shell({ children }: { children: ReactNode; onNewPool?: () => void }) {
  const { syncError } = useApp();
  const path = usePathname();
  const search = useSearchParams();
  const { href } = useDesign();
  const supplier = path === "/supplier" || path.startsWith("/supplier/");
  const driver = path.startsWith("/supplier/delivery/");
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const custom = path === "/" || path === "/supplier";
  const mobileNav = ["/pools", "/members", "/payments", "/suppliers", "/settings"].includes(path);
  const links = supplier
    ? [
        { href: "/supplier", label: "Orders", icon: Receipt },
        { href: "/supplier?tab=catalogue", label: "Catalogue", icon: SquaresFour },
        { href: "/supplier?tab=deliveries", label: "Deliveries", icon: Truck },
        { href: "/supplier?tab=payouts", label: "Payouts", icon: CreditCard },
        { href: "/supplier?tab=leaders", label: "Leaders", icon: User },
      ]
    : navigation;
  const title =
    navigation.find((item) => item.href !== "/" && path.startsWith(item.href))?.label || "Settings";
  return (
    <MotionRoot>
      <div
        className={`ref-workspace ${supplier ? "supplier-workspace" : ""} ${custom ? "custom-layout" : ""} ${driver ? "driver-workspace" : ""}`}
      >
        {menu ? (
          <button
            className="ref-sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        ) : null}
        <aside className={`ref-sidebar ${menu ? "is-open" : ""}`}>
          <div className="ref-sidebar-brand">
            <Brand />
            {supplier ? <small>supply</small> : null}
            <button
              className="ref-close-menu"
              aria-label="Close navigation"
              onClick={() => setMenu(false)}
            >
              <X size={22} />
            </button>
          </div>
          <nav aria-label="Main navigation">
            {links.map(({ href: to, label, icon: Icon }) => (
              <Link
                key={to}
                href={href(to)}
                className={
                  (
                    supplier
                      ? to.includes("?tab=")
                        ? search.get("tab") === to.split("?tab=")[1]
                        : !search.get("tab") && path === "/supplier"
                      : to === "/"
                        ? path === "/"
                        : path.startsWith(to)
                  )
                    ? "active"
                    : ""
                }
                onClick={() => setMenu(false)}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="ref-sidebar-bottom">
            <button onClick={() => setHelp(true)}>
              <Info size={17} />
              Help
            </button>
            <button onClick={() => setHelp(true)}>
              <Receipt size={17} />
              Terms & privacy
            </button>
          </div>
        </aside>
        <main id="main-content" className="ref-main">
          {!custom && !driver ? (
            <>
              <div className="ref-desktop-header">
                <BoardTopbar title={title} supplier={supplier} />
              </div>
              <button
                className="ref-mobile-menu"
                onClick={() => setMenu(true)}
                aria-label="Open navigation"
              >
                <List size={22} />
              </button>
            </>
          ) : null}
          {syncError ? (
            <div className="connection-banner" role="alert">
              {syncError}
              <button onClick={() => window.location.reload()}>Reconnect</button>
            </div>
          ) : null}
          <div
            className={
              !custom && !driver
                ? `ref-standard-content ${mobileNav ? "with-mobile-nav" : ""}`
                : "ref-custom-content"
            }
          >
            {children}
          </div>
          {mobileNav ? <BottomNav /> : null}
        </main>
        <Modal
          open={help}
          onClose={() => setHelp(false)}
          title="Together, for less."
          description="Pamoja brings a community's demand together to unlock wholesale prices."
        >
          <div className="form-stack">
            <p>
              This is an interactive demo. Payments, escrow, refunds and supplier payouts are
              simulated. Your sample workspace uses a private session cookie, and pickup passes
              expire after 30 minutes.
            </p>
            <p>
              Invite a neighbour, close a funded pool, confirm delivery, then scan the member's pass
              at pickup. A pickup can only be released once.
            </p>
            <Link className="text-link" href="/settings" onClick={() => setHelp(false)}>
              Workspace settings
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </Modal>
      </div>
    </MotionRoot>
  );
}
export function WorkspaceDate() {
  const { now } = useApp();
  return (
    <span>
      {new Date(now).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })}
    </span>
  );
}
