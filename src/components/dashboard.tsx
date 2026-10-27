"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  CheckCircle,
  CirclesThree,
  HandCoins,
  Plus,
  ShieldCheck,
  TrendUp,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { money, moneyParts, nextTier, poolMembers, priceFor } from "@/lib/money";
import type { Category } from "@/lib/types";
import { useApp } from "./provider";
import { PoolTable } from "./pool-table";
import { WorkspaceDate } from "./shell";
import {
  Button,
  categoryNames,
  LiveLabel,
  Modal,
  PageHeading,
  ProductIcon,
  SectionHeading,
  TextLink,
} from "./ui";

export function Dashboard({
  onNewPool,
  onInvite,
}: {
  onNewPool: () => void;
  onInvite: (poolId?: string) => void;
}) {
  const { data, ready, syncError } = useApp();
  const [category, setCategory] = useState<Category | null>(null);
  const [breakdown, setBreakdown] = useState(false);
  const open = data.pools.filter((pool) => pool.status === "Open");
  const activeMembers = data.memberships.filter(
    (member) => open.some((pool) => pool.id === member.poolId) && member.status === "held",
  );
  const escrow =
    data.memberships
      .filter((member) => member.status === "held")
      .reduce((sum, member) => sum + member.amount - member.rebate, 0) +
    data.orders
      .filter((order) => order.poolId === null && !order.paidAt)
      .reduce((sum, order) => sum + order.total, 0);
  const savings = data.memberships
    .filter((member) => ["held", "released"].includes(member.status))
    .reduce((sum, member) => {
      const pool = data.pools.find((item) => item.id === member.poolId);
      return (
        sum +
        (pool
          ? Math.max(0, pool.tiers[0].price * member.quantity - member.amount + member.rebate)
          : 0)
      );
    }, 0);
  const escrowParts = moneyParts(escrow, data.currency);
  const savingsParts = moneyParts(savings, data.currency);
  const demand = (Object.keys(categoryNames) as Category[]).map((key) => {
    const pools = open.filter((pool) => pool.category === key);
    const members = activeMembers.filter((member) =>
      pools.some((pool) => pool.id === member.poolId),
    );
    const amount = pools.reduce(
      (sum, pool) =>
        sum +
        poolMembers(pool.id, data.memberships).reduce(
          (value, member) => value + member.quantity,
          0,
        ) *
          priceFor(pool, data.memberships),
      0,
    );
    return {
      key,
      amount,
      count: members.length,
      quantity: members.reduce((sum, member) => sum + member.quantity, 0),
    };
  });
  const demandTotal = demand.reduce((sum, item) => sum + item.amount, 0);
  const score = open.length
    ? Math.round(
        (open.reduce((sum, pool) => {
          const count = poolMembers(pool.id, data.memberships).length;
          return sum + Math.min(1, count / (nextTier(pool.tiers, count)?.minMembers || count || 1));
        }, 0) /
          open.length) *
          100,
      )
    : 0;
  const oil = open.find((pool) => pool.category === "oil");
  const oilCount = oil ? poolMembers(oil.id, data.memberships).length : 0;
  const oilNext = oil ? nextTier(oil.tiers, oilCount) : undefined;
  const readyPool = data.pools.find((pool) => pool.status === "Closed");
  const pickup = data.pools.find((pool) => pool.status === "PickupOpen");
  const order = data.orders.find((item) => item.status !== "Delivered");
  const poolList = open.filter((pool) => !category || pool.category === category);
  return (
    <>
      <PageHeading
        eyebrow="YOUR COMMUNITY AT A GLANCE"
        title={`Good morning, ${data.leaderName}.`}
        description="Small contributions. A bigger difference."
      >
        <WorkspaceDate />
        <Button variant="secondary" onClick={() => onInvite()}>
          <UsersThree size={18} />
          Invite members
        </Button>
        <Button onClick={onNewPool}>
          <Plus size={19} />
          New pool
        </Button>
      </PageHeading>
      <section className="metrics" aria-label="Community overview">
        <article className="metric">
          <div className="metric-label">
            Escrow held
            <ShieldCheck size={19} />
          </div>
          <div className="metric-value">
            {escrowParts.whole}
            <span>
              {escrowParts.decimal}
              {escrowParts.fraction}
            </span>
          </div>
          <p>
            <span className="tiny-dot" />
            Funded. Protected. Ready.
          </p>
        </article>
        <article className="metric">
          <div className="metric-label">
            Live pools
            <CirclesThree size={19} />
          </div>
          <div className="metric-value">
            {open.length.toString().padStart(2, "0")}
            <span className="metric-word">pools</span>
          </div>
          <p>
            {data.pools.filter((pool) => pool.status === "Closed").length} ready for a supplier
            order
            <ArrowRight size={13} />
          </p>
        </article>
        <article className="metric">
          <div className="metric-label">
            Members buying together
            <UsersThree size={19} />
          </div>
          <div className="metric-value">
            {activeMembers.length}
            <span className="member-avatar-stack">
              <span>N</span>
              <span>T</span>
              <span>L</span>
            </span>
          </div>
          <p>Memberships across {open.length} open pools</p>
        </article>
        <article className="metric metric-savings">
          <div className="metric-label">
            Community savings
            <TrendUp size={19} />
          </div>
          <div className="metric-value">
            {savingsParts.whole}
            <span>
              {savingsParts.decimal}
              {savingsParts.fraction}
            </span>
          </div>
          <p>
            <ArrowDown size={14} />
            Better prices, bought together
          </p>
        </article>
      </section>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="panel demand-panel">
            <SectionHeading
              title="A little demand. A lot of possibility."
              subtitle="What your community is buying this week."
            >
              <LiveLabel paused={!ready || !!syncError}>LIVE DEMAND</LiveLabel>
            </SectionHeading>
            <div className="demand-total">
              <strong>{money(demandTotal, data.currency)}</strong>
              <span>pooled buying power</span>
              <button className="text-link" onClick={() => setBreakdown(true)}>
                View breakdown
                <ArrowUpRight size={15} />
              </button>
            </div>
            <div
              className="treemap"
              style={{
                gridTemplateColumns: `${Math.max(0.35, demand[0].amount / (demandTotal || 1))}fr ${Math.max(0.2, (1 - demand[0].amount / (demandTotal || 1)) * 0.57)}fr ${Math.max(0.15, (1 - demand[0].amount / (demandTotal || 1)) * 0.43)}fr`,
              }}
            >
              {demand.map(({ key, amount, count }, index) => (
                <button
                  key={key}
                  className={`treemap-block treemap-${key} ${category === key ? "selected" : ""}`}
                  onClick={() => setCategory(category === key ? null : key)}
                  aria-pressed={category === key}
                  style={index > 1 ? { gridColumn: index === 2 ? "2" : "3" } : undefined}
                >
                  <div className="treemap-top">
                    <span>{categoryNames[key]}</span>
                    <ArrowUpRight size={20} />
                  </div>
                  <ProductIcon category={key} size={index === 0 ? 72 : 42} />
                  <div className="treemap-bottom">
                    <strong>{money(amount, data.currency)}</strong>
                    <span>{count} members</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="treemap-legend">
              <span>
                {demand.map(({ key }) => (
                  <button
                    onClick={() => setCategory(category === key ? null : key)}
                    key={key}
                    className={category === key ? "selected" : ""}
                    aria-pressed={category === key}
                  >
                    <i className={`category-${key}`} />
                    {categoryNames[key]}
                  </button>
                ))}
              </span>
              <span>
                Click a category to explore
                <ArrowUpRight size={12} />
              </span>
            </div>
          </section>
          <section className="panel live-pools-panel">
            <SectionHeading title={category ? `${categoryNames[category]} pools` : "Live pools"}>
              <div className="section-actions">
                {category ? (
                  <button onClick={() => setCategory(null)} className="text-link">
                    Clear filter
                  </button>
                ) : (
                  <span className="count-label">{open.length} open</span>
                )}
                <TextLink href="/pools">All pools</TextLink>
              </div>
            </SectionHeading>
            <PoolTable pools={poolList} />
            <div className="panel-note">
              <ShieldCheck size={16} />
              <span>Member payments stay held until the supplier drop-off is confirmed.</span>
            </div>
          </section>
          <section className="activity-section">
            <SectionHeading title="Good things are happening">
              <span className="eyebrow">LATEST ACTIVITY</span>
            </SectionHeading>
            <div className="activity-inline">
              {data.activity.slice(0, 3).map((activity) => (
                <article key={activity.id}>
                  <span className={`activity-icon activity-${activity.kind}`}>
                    {activity.kind === "tier" ? (
                      <TrendUp size={20} />
                    ) : activity.kind === "payment" ? (
                      <Wallet size={20} />
                    ) : (
                      <UsersThree size={20} />
                    )}
                  </span>
                  <div>
                    <strong>{activity.title}</strong>
                    <p>{activity.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside className="dashboard-rail">
          <section className="panel quick-actions">
            <h2>Make it happen</h2>
            <button onClick={onNewPool}>
              <span className="quick-action-icon">
                <Plus size={21} />
              </span>
              <span>
                <strong>Start a new pool</strong>
                <small>Bring a better price closer</small>
              </span>
              <ArrowUpRight size={18} />
            </button>
            <button onClick={() => onInvite()}>
              <span className="quick-action-icon">
                <UsersThree size={21} />
              </span>
              <span>
                <strong>Invite your neighbours</strong>
                <small>More people. More savings.</small>
              </span>
              <ArrowUpRight size={18} />
            </button>
          </section>
          <section className="panel upcoming-panel">
            <SectionHeading title="Coming up">
              <CalendarBlank size={18} />
            </SectionHeading>
            <div className="upcoming-list">
              {[
                ...(order
                  ? [
                      {
                        date: order.deliverBy,
                        title: "Supplier delivery",
                        subtitle: order.reference,
                        href: `/orders/${order.id}`,
                        type: "order",
                      },
                    ]
                  : []),
                ...(pickup
                  ? [
                      {
                        date: pickup.pickupAt,
                        title: "Community pickup",
                        subtitle: pickup.name.split(" · ")[0],
                        href: "/pickups",
                        type: "pickup",
                      },
                    ]
                  : []),
                ...(readyPool
                  ? [
                      {
                        date: readyPool.closesAt,
                        title: "Tier rebates ready",
                        subtitle: readyPool.name.split(" · ")[0],
                        href: "/payments",
                        type: "rebate",
                      },
                    ]
                  : []),
              ].map((item) => (
                <Link key={item.type} href={item.href}>
                  <div className="date-tile">
                    <strong>{new Date(item.date).getUTCDate()}</strong>
                    <span>
                      {new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })
                        .format(new Date(item.date))
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
            <div className="upcoming-footer">
              A good week, in the making.
              <CheckCircle size={15} />
            </div>
          </section>
          <section className="pool-score">
            <div className="score-heading">
              <span className="eyebrow">YOUR POOL MOMENTUM</span>
              <TrendUp size={22} />
            </div>
            <div className="score-number">
              {score}
              <span>/ 100</span>
            </div>
            <h2>Better, with every neighbour.</h2>
            <p>A few small moves can unlock a lot.</p>
            <div className="score-track">
              <span style={{ width: `${score}%` }} />
            </div>
            <div className="score-nudges">
              {oil && oilNext ? (
                <button onClick={() => onInvite(oil.id)}>
                  <span className="nudge-number">01</span>
                  <span>
                    <strong>{oilNext.minMembers - oilCount} more for oil’s next tier</strong>
                    <small>Invite a few more neighbours</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ) : null}
              <button onClick={() => onInvite(open[0]?.id)}>
                <span className="nudge-number">02</span>
                <span>
                  <strong>Every share moves the price</strong>
                  <small>Send a pool to your group</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
              {readyPool ? (
                <Link href={`/pools/${readyPool.id}`}>
                  <span className="nudge-number">03</span>
                  <span>
                    <strong>Your rice order is ready</strong>
                    <small>Turn pooled demand into a delivery</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ) : null}
            </div>
            <Link href="/pools" className="score-cta">
              Keep the momentum going
              <ArrowRight size={18} />
            </Link>
          </section>
          <div className="rail-note">
            <HandCoins size={25} weight="light" />
            <p>
              More hands in.
              <br />
              <strong>More money stays local.</strong>
            </p>
          </div>
        </aside>
      </div>
      <Modal
        open={breakdown}
        onClose={() => setBreakdown(false)}
        title="Your pooled buying power"
        description="Current tier price × the quantity of funded memberships in open pools."
      >
        <div className="breakdown-list">
          {demand.map((item) => (
            <div key={item.key}>
              <span>
                <i className={`category-${item.key}`} />
                {categoryNames[item.key]}
                <small>
                  {item.quantity} units · {item.count} members
                </small>
              </span>
              <strong>{money(item.amount, data.currency)}</strong>
            </div>
          ))}
          <div className="breakdown-total">
            <strong>Total demand</strong>
            <strong>{money(demandTotal, data.currency)}</strong>
          </div>
        </div>
      </Modal>
    </>
  );
}
