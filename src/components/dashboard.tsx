"use client";

import { ArrowRight, QrCode } from "@phosphor-icons/react";
import { Squircle } from "@squircle-js/react";
import Link from "next/link";
import { useState } from "react";
import { money, nextTier, poolMembers, priceFor } from "@/lib/money";
import { communitySummary } from "@/lib/summary";
import type { Category } from "@/lib/types";
import { BottomNav, DisplayMoney, GlassCard, dayDate, productName, useDesign } from "./design";
import { PoolTable } from "./pool-table";
import { useApp } from "./provider";
import { BoardTopbar, WorkspaceMenu } from "./shell";
import { ActionLink, Button, LiveLabel, Progress } from "./ui";

export function DemandMap({
  amounts = false,
  onCategory,
  category,
}: {
  amounts?: boolean;
  onCategory?: (category: Category) => void;
  category?: Category | null;
}) {
  const { data } = useApp();
  const demand = data.weeklyDemand || { maize: 197600, oil: 130100, rice: 91600, soap: 62700 };
  const total = Object.values(demand).reduce((sum, value) => sum + value, 0);
  return (
    <div className="ref-demand-map" aria-label="Demand by category">
      {(["maize", "oil", "rice", "soap"] as Category[]).map((key) => (
        <Squircle asChild cornerRadius={4} cornerSmoothing={1} key={key}>
          <button
            className={`ref-map-cell map-${key} ${category === key ? "selected" : ""}`}
            onClick={() => onCategory?.(key)}
            aria-pressed={category === key}
            title={`Filter ${{ maize: "Maize", oil: "Cooking oil", rice: "Rice", soap: "Soap" }[key]} pools`}
          >
            <span>
              {{ maize: "Maize", oil: "Cooking oil", rice: "Rice", soap: "Soap" }[key]}
              <span className="map-separator"> · </span>
              <span className="map-percent">{Math.round((demand[key] / total) * 100)}%</span>
            </span>
            {amounts ? (
              <strong>{money(demand[key], data.currency).replace(/\.00$/, "")}</strong>
            ) : null}
          </button>
        </Squircle>
      ))}
    </div>
  );
}

export function Dashboard({
  onNewPool,
  onInvite,
}: {
  onNewPool: () => void;
  onInvite: (poolId?: string) => void;
}) {
  const { data, ready, syncError } = useApp();
  const { glass, href } = useDesign();
  const [category, setCategory] = useState<Category | null>(null);
  const [sort, setSort] = useState("default");
  const { open, people, escrow, collected, collecting, pickup } = communitySummary(data);
  const oil = open.find((pool) => pool.id === "oil");
  const count = oil ? poolMembers(oil.id, data.memberships).length : 0;
  const next = oil ? nextTier(oil.tiers, count) : undefined;
  const short = next ? next.minMembers - count : 0;
  const pending = data.memberships.filter((member) => member.status === "pending").length;
  const first = open[0];
  const poolList = open
    .filter((pool) => !category || pool.category === category)
    .sort((a, b) =>
      sort === "closing"
        ? a.closesAt.localeCompare(b.closesAt)
        : sort === "members"
          ? poolMembers(b.id, data.memberships).length - poolMembers(a.id, data.memberships).length
          : 0,
    );
  const rebates = data.memberships.reduce((sum, member) => sum + member.rebate, 0);
  return (
    <>
      <div className="ref-dashboard desktop-only">
        <section className="ref-dashboard-center">
          <BoardTopbar title="Dashboard" />
          <div className="ref-escrow-overview" data-reveal>
            <div>
              <h1>Held in escrow this week</h1>
              <DisplayMoney amount={escrow} currency={data.currency} />
            </div>
            <div className="ref-stat-tags">
              <Link href="/pools">{open.length} pools</Link>
              <Link href="/members">{people} members</Link>
              <span>This week</span>
            </div>
          </div>
          <DemandMap
            amounts
            category={category}
            onCategory={(key) => setCategory(category === key ? null : key)}
          />
          <section className="ref-live-pools" data-reveal>
            <div className="ref-section-heading">
              <h2>
                Live pools <small>({open.length})</small>
              </h2>
              <label className="ref-sort">
                <span className="sr-only">Sort pools</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="default">Sort by</option>
                  <option value="closing">Closing soon</option>
                  <option value="members">Members</option>
                </select>
              </label>
            </div>
            <PoolTable pools={poolList} compact />
            {category ? (
              <button className="ref-clear-filter" onClick={() => setCategory(null)}>
                Show all categories <ArrowRight size={15} />
              </button>
            ) : null}
          </section>
        </section>
        <aside className="ref-dashboard-rail">
          <div className="ref-rail-label">Quick actions</div>
          <div className="ref-quick-actions">
            <Button variant="dark" onClick={onNewPool}>
              New pool
            </Button>
            <Button variant="secondary" onClick={() => onInvite()}>
              Send invite
            </Button>
          </div>
          <div className="ref-rail-label">
            <span>Upcoming</span>
            <span>This week</span>
          </div>
          <div className="ref-upcoming" data-reveal>
            <Link href="/orders">
              <div>
                <strong>Supplier order</strong>
                <small>
                  {dayDate(first?.closesAt || new Date(data.asOf).toISOString(), true)} · {people}{" "}
                  members
                </small>
              </div>
              <span>
                {money(
                  data.orders
                    .filter((order) => !order.external && !order.paidAt)
                    .reduce((sum, order) => sum + order.total, 0),
                  data.currency,
                )}
              </span>
            </Link>
            <Link href="/pickups">
              <div>
                <strong>Pickup day</strong>
                <small>
                  {pickup ? dayDate(pickup.pickupAt, true) : "Upcoming"} · {collecting.length}{" "}
                  members
                </small>
              </div>
              <span>{collected} done</span>
            </Link>
            <Link href="/payments">
              <div>
                <strong>Tier rebates</strong>
                <small>Returned at pool close</small>
              </div>
              <span>{money(rebates, data.currency)}</span>
            </Link>
          </div>
          <Squircle cornerRadius={8} className="ref-pool-score" data-reveal>
            <div className="ref-score-top">
              <div>
                <span>Pool score</span>
                <strong>
                  7.5<small> / 10</small>
                </strong>
              </div>
              <span className="ref-grade">B+</span>
            </div>
            <Button onClick={() => onInvite(oil?.id)}>
              <span>Optimise</span>
              <ArrowRight size={17} />
            </Button>
            <Link href={href("/pools/oil")}>
              <div>
                Oil pool {short} members short
                <small>
                  {next
                    ? `Tier 2 unlocks ${money(next.price, data.currency)}`
                    : "Best price unlocked"}
                </small>
              </div>
              <ArrowRight size={17} />
            </Link>
            <Link href={href("/pools/rice")}>
              <div>
                Rice pool closes {first ? dayDate(first.closesAt) : "soon"}
                <small>{poolMembers("rice", data.memberships).length} of 50 joined</small>
              </div>
              <ArrowRight size={17} />
            </Link>
            <Link href="/payments">
              <div>
                {pending} members haven’t paid<small>Escrow not yet funded</small>
              </div>
              <ArrowRight size={17} />
            </Link>
          </Squircle>
        </aside>
      </div>
      <div className={`ref-phone-home mobile-only ${glass ? "glass-phone" : "ledger-phone"}`}>
        {glass ? (
          <>
            <div className="ref-home-glass-header">
              <WorkspaceMenu />
              <span>pamoja</span>
              <LiveLabel paused={!ready || !!syncError}>Live</LiveLabel>
            </div>
            <div className="ref-home-glass-escrow" data-reveal>
              <h1>Held in escrow</h1>
              <DisplayMoney amount={escrow} currency={data.currency} serif />
              <p>
                {people} members · {open.length} open pools
              </p>
            </div>
            <GlassCard className="ref-demand-card">
              <div className="ref-section-heading">
                <h2>Demand by category</h2>
                <span>This week</span>
              </div>
              <DemandMap
                onCategory={(key) => setCategory(category === key ? null : key)}
                category={category}
              />
            </GlassCard>
            <div className="ref-section-heading ref-mobile-pools-heading">
              <h2>Live pools</h2>
              <ActionLink href={href("/pools")} variant="ghost">
                View all
              </ActionLink>
            </div>
            <div className="ref-home-pool-cards">
              {poolList.slice(0, 2).map((pool) => {
                const n = poolMembers(pool.id, data.memberships).length;
                const t = nextTier(pool.tiers, n);
                return (
                  <GlassCard key={pool.id}>
                    <Link href={href(`/pools/${pool.id}`)}>
                      <div>
                        <strong>{productName(pool)}</strong>
                        <span>
                          {n} / {t?.minMembers || n}
                        </span>
                      </div>
                      <Progress
                        value={n}
                        max={t?.minMembers || n}
                        label={`${pool.name} tier progress`}
                      />
                      <p>
                        {money(priceFor(pool, data.memberships), data.currency)} now ·{" "}
                        {t
                          ? `${money(t.price, data.currency)} at ${t.minMembers}`
                          : "Best price unlocked"}
                      </p>
                    </Link>
                  </GlassCard>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="ref-home-ledger-header">
              <WorkspaceMenu />
              <ActionLink href={href("/pickups")} variant="secondary">
                <QrCode size={20} />
                Scan pickup
              </ActionLink>
            </div>
            <nav className="ref-tabs" aria-label="Community views">
              <span className="selected">Pools</span>
              <Link href="/members">Members</Link>
              <Link href={href("/orders")}>Orders</Link>
            </nav>
            <div className="ref-pool-count">
              <h1>
                <strong>{open.length}</strong> Open pools
              </h1>
              <span>{people} members</span>
            </div>
            <DemandMap
              category={category}
              onCategory={(key) => setCategory(category === key ? null : key)}
            />
            <div className="ref-home-actions">
              <Button variant="dark" onClick={onNewPool}>
                New pool
              </Button>
              <ActionLink variant="secondary" href={href("/pools")}>
                My pools
              </ActionLink>
            </div>
            <section className="ref-mobile-score" data-reveal>
              <div>
                <p>Pool score</p>
                <h2>
                  One pool from an A.
                  <br />
                  Oil needs {short} more.
                </h2>
                <span className="ref-grade">B+</span>
              </div>
              <Button onClick={() => onInvite(oil?.id)}>
                <span>Share invite link</span>
                <ArrowRight size={20} />
              </Button>
            </section>
          </>
        )}
        <BottomNav />
      </div>
    </>
  );
}
