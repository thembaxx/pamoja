"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Buildings,
  CalendarBlank,
  CaretDown,
  CirclesThree,
  GearSix,
  Handshake,
  House,
  List,
  Plus,
  QrCode,
  Receipt,
  SquaresFour,
  UsersThree,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { Squircle } from "@squircle-js/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useApp } from "./provider";
import { ActionLink, LiveLabel, Modal, TextLink } from "./ui";
import { Brand } from "./brand";
import { InstallButton, ThemeToggle } from "./device-settings";

const navigation = [
  { href: "/", label: "Dashboard", icon: SquaresFour },
  { href: "/pools", label: "Pools", icon: CirclesThree },
  { href: "/members", label: "Members", icon: UsersThree },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/pickups", label: "Pickups", icon: QrCode },
  { href: "/suppliers", label: "Suppliers", icon: Buildings },
];
export function Shell({ children, onNewPool }: { children: ReactNode; onNewPool: () => void }) {
  const { data, syncError, ready } = useApp();
  const path = usePathname();
  const supplier = path.startsWith("/supplier/") || path === "/supplier";
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const label = supplier
    ? "Supplier console"
    : navigation.find((item) => (item.href === "/" ? path === "/" : path.startsWith(item.href)))
        ?.label || "Settings";
  return (
    <div className="workspace">
      {menu ? (
        <button
          className="sidebar-backdrop"
          onClick={() => setMenu(false)}
          aria-label="Close navigation"
        />
      ) : null}
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand light />
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={22} />
          </button>
        </div>
        <Link href="/settings" className="workspace-selector">
          <Squircle cornerRadius={10} className="community-avatar">
            <House size={20} />
          </Squircle>
          <span>
            <strong>{data.groupName.split(" ")[0]}</strong>
            <small>{supplier ? "Supplier workspace" : "Leader workspace"}</small>
          </span>
          <CaretDown size={14} />
        </Link>
        <p className="nav-caption">{supplier ? "SUPPLIER" : "WORKSPACE"}</p>
        <nav aria-label="Main navigation">
          {supplier ? (
            <>
              <Link
                className={`nav-link ${path === "/supplier" ? "active" : ""}`}
                href="/supplier"
                onClick={() => setMenu(false)}
              >
                <Receipt size={21} />
                <span>Incoming orders</span>
                <span className="nav-count">
                  {data.orders.filter((order) => order.status === "Placed").length}
                </span>
              </Link>
              <Link
                className={`nav-link ${path.startsWith("/supplier/delivery") ? "active" : ""}`}
                href={data.orders[0] ? `/supplier/delivery/${data.orders[0].id}` : "/supplier"}
                onClick={() => setMenu(false)}
              >
                <QrCode size={21} />
                <span>Delivery</span>
              </Link>
            </>
          ) : (
            navigation.map(({ href, label: name, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${(href === "/" ? path === "/" : path.startsWith(href)) ? "active" : ""}`}
                onClick={() => setMenu(false)}
                aria-current={
                  (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined
                }
              >
                <Icon
                  size={21}
                  weight={
                    (href === "/" ? path === "/" : path.startsWith(href)) ? "fill" : "regular"
                  }
                />
                <span>{name}</span>
                {href === "/pools" ? (
                  <span className="nav-count">
                    {data.pools.filter((pool) => pool.status === "Open").length}
                  </span>
                ) : null}
              </Link>
            ))
          )}
        </nav>
        <div className="sidebar-bottom">
          <InstallButton className="sidebar-install" />
          <div className="together-note">
            <Handshake size={26} weight="light" />
            <p>
              A little each.
              <br />
              <strong>A lot together.</strong>
            </p>
            <Link href={supplier ? "/" : "/join/maize"}>
              {supplier ? "Back to leader view" : "Explore member view"}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link href="/settings" className="nav-link settings-link">
            <GearSix size={21} />
            <span>Settings</span>
          </Link>
          <Link href="/settings" className="profile">
            <Squircle cornerRadius={13} className="profile-avatar">
              {data.leaderName.slice(0, 2).toUpperCase()}
            </Squircle>
            <span>
              <strong>{data.leaderName} M.</strong>
              <small>Community leader</small>
            </span>
            <CaretDown size={14} />
          </Link>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <List size={24} />
            </button>
            <span className="breadcrumb-workspace">
              Workspace<span>/</span>
            </span>
            <span>{label}</span>
            <span className="demo-badge">Demo</span>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <LiveLabel paused={!ready || !!syncError}>
              {syncError ? "Sync paused" : ready ? "Workspace synced" : "Connecting"}
            </LiveLabel>
            <span className="topbar-divider" />
            <Link href={supplier ? "/" : "/supplier"} className="role-switch">
              {supplier ? "Leader view" : "Supplier view"}
              <ArrowUpRight size={14} />
            </Link>
            <button
              className="notification-button icon-button"
              aria-label="View recent activity"
              onClick={() => setNotifications(true)}
            >
              <Bell size={21} />
              <span />
            </button>
            <Squircle cornerRadius={11} className="topbar-avatar">
              {data.leaderName.slice(0, 1)}
            </Squircle>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {syncError ? (
            <div className="connection-banner" role="alert">
              {syncError} <button onClick={() => window.location.reload()}>Reconnect</button>
            </div>
          ) : null}
          {children}
        </main>
        <footer className="workspace-footer">
          <Link href="/about">Pamoja · Together, for less.</Link>
          <span>Sample data · USD · No real payments</span>
        </footer>
      </div>
      {!supplier ? (
        <nav className="bottom-navigation" aria-label="Mobile navigation">
          {[
            { href: "/", icon: House, label: "Home" },
            { href: "/pools", icon: CirclesThree, label: "Pools" },
            { href: "/orders", icon: Receipt, label: "Orders" },
            { href: "/pickups", icon: QrCode, label: "Pickup" },
          ].map(({ href, icon: Icon, label: name }) => (
            <Link
              href={href}
              key={href}
              className={(href === "/" ? path === "/" : path.startsWith(href)) ? "active" : ""}
            >
              <Icon size={23} />
              <span>{name}</span>
            </Link>
          ))}
          <button onClick={onNewPool} aria-label="Create a new pool">
            <Plus size={24} />
          </button>
        </nav>
      ) : null}
      <Modal
        open={notifications}
        onClose={() => setNotifications(false)}
        title="Latest activity"
        description="Updates from your community workspace."
      >
        <div className="modal-activity">
          {data.activity.slice(0, 8).map((activity) => (
            <article key={activity.id}>
              <span className="activity-marker">
                <ArrowRight size={17} />
              </span>
              <div>
                <strong>{activity.title}</strong>
                <p>{activity.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="modal-footer">
          <TextLink href="/payments">View escrow ledger</TextLink>
          <ActionLink href="/pools" variant="secondary">
            View pools
          </ActionLink>
        </div>
      </Modal>
    </div>
  );
}
export function WorkspaceDate() {
  const { now } = useApp();
  return (
    <span className="workspace-date">
      <CalendarBlank size={17} />
      {new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(now))}
    </span>
  );
}
