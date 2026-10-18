"use client";

import { ArrowRight, CaretLeft, Plus, UsersThree } from "@phosphor-icons/react";
import { Squircle } from "@squircle-js/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { currentTier, money, nextTier, poolMembers, priceFor } from "@/lib/money";
import {
  GlassCard,
  PhoneHeader,
  closeLabel,
  dayDate,
  initials,
  productName,
  shortName,
  useDesign,
} from "./design";
import { PoolTable } from "./pool-table";
import { useApp } from "./provider";
import {
  ActionLink,
  Button,
  EmptyState,
  LiveLabel,
  Modal,
  PageHeading,
  SectionHeading,
} from "./ui";

export function Pools({ onNewPool }: { onNewPool: () => void }) {
  const { data } = useApp();
  const [filter, setFilter] = useState("All pools");
  const [query, setQuery] = useState("");
  const pools = data.pools.filter(
    (pool) =>
      (filter === "All pools" ||
        (filter === "Open"
          ? pool.status === "Open"
          : filter === "Ready to order"
            ? pool.status === "Closed"
            : ["PickupOpen", "Settled"].includes(pool.status))) &&
      `${pool.name} ${pool.supplier}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Your pools"
        description="Bring demand together. Unlock a better price with every member."
      >
        <Button onClick={onNewPool}>
          <Plus size={19} />
          New pool
        </Button>
      </PageHeading>
      <div className="collection-toolbar">
        <div className="filter-tabs" aria-label="Filter pools">
          {["All pools", "Open", "Ready to order", "Pickup"].map((item) => (
            <button
              key={item}
              className={filter === item ? "selected" : ""}
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
            >
              {item}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Search pools or suppliers…"
          aria-label="Search pools"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <section className="panel">
        <SectionHeading title={`${filter} (${pools.length})`}>
          <LiveLabel>Live</LiveLabel>
        </SectionHeading>
        <PoolTable pools={pools} />
      </section>
    </>
  );
}

export function PoolDetail({ id, onInvite }: { id: string; onInvite: (id: string) => void }) {
  const { data, mutate, pending, ready, toast } = useApp();
  const { glass, href } = useDesign();
  const [tab, setTab] = useState("Details");
  const [manage, setManage] = useState(false);
  const [confirm, setConfirm] = useState<"close" | "cancel" | null>(null);
  const router = useRouter();
  const pool = data.pools.find((item) => item.id === id);
  if (!pool)
    return (
      <EmptyState title="Pool not found" description="Open a pool from your workspace.">
        <ActionLink href="/pools">View pools</ActionLink>
      </EmptyState>
    );
  const members = poolMembers(id, data.memberships);
  const count = members.length;
  const current = currentTier(pool.tiers, count);
  const next = nextTier(pool.tiers, count);
  const escrow = members
    .filter((member) => member.status === "held")
    .reduce((sum, member) => sum + member.amount - member.rebate, 0);
  const rebates = members.reduce(
    (sum, member) => sum + Math.max(0, member.unitPrice - current.price) * member.quantity,
    0,
  );
  const openPools = data.pools.filter((item) => item.status === "Open").length;
  const order = data.orders.find((item) => item.poolId === id);
  const review = `/orders/review?poolId=${id}`;
  async function act(action: "close" | "cancel") {
    try {
      await mutate(`pools/${id}/${action}`, {});
      setConfirm(null);
      setManage(false);
      toast(
        action === "close"
          ? "Price locked. Every tier rebate is accounted for."
          : "Pool cancelled. Funded payments refunded.",
      );
      if (action === "close") router.push(href(review));
    } catch {
      /* Keep the review open for a retry. */
    }
  }
  return (
    <section className={`ref-pool-detail ref-phone-page ${glass ? "glass-phone" : "ledger-phone"}`}>
      <PhoneHeader
        back="/pools"
        glass={glass}
        title={glass ? "Pool" : undefined}
        onTitleClick={glass ? () => setManage(true) : undefined}
        right={
          glass ? undefined : (
            <button
              className="ref-status-button"
              onClick={() => setManage(true)}
              aria-label={`Status: ${pool.status} · Manage pool`}
            >
              Status: <span className="ref-green">{pool.status}</span>
            </button>
          )
        }
      />
      <div className="ref-detail-title">
        <h1>
          {pool.name}
          {glass ? "," : ""}
          <br />
          {pool.unit}
        </h1>
        <p>
          {glass
            ? `Closes ${closeLabel(pool.closesAt)} · Pickup ${dayDate(pool.pickupAt, true)}`
            : `${pool.supplier} · ${openPools} pools this week`}
        </p>
      </div>
      {glass ? (
        <>
          <GlassCard className="ref-tier-chart-card">
            <div className="ref-section-heading">
              <h2>Price per {pool.category === "oil" ? "unit" : "bag"}</h2>
              <span>Falls as members join</span>
            </div>
            <div className="ref-tier-chart">
              {pool.tiers.map((tier, index) => (
                <div key={tier.minMembers} className={count >= tier.minMembers ? "unlocked" : ""}>
                  <span>{money(tier.price, data.currency)}</span>
                  <div className="ref-tier-column" style={{ height: `${48 + index * 40}px` }} />
                  <span>{tier.minMembers}+</span>
                </div>
              ))}
            </div>
            <p>
              {count} joined ·{" "}
              {next
                ? `${next.minMembers - count} more unlocks ${money(next.price, data.currency)}`
                : "Best price unlocked"}
            </p>
          </GlassCard>
          <GlassCard className="ref-live-activity">
            <p>Live activity</p>
            {data.activity
              .filter(
                (activity) =>
                  activity.kind === "join" &&
                  (activity.title.includes(pool.name) || activity.description.includes(pool.name)),
              )
              .slice(0, 2)
              .map((activity, index) => (
                <div key={activity.id}>
                  <span className="ref-avatar">
                    {initials(activity.title.split(" ").slice(0, 2).join(" "))}
                  </span>
                  <span>{activity.title}</span>
                  <small>{index === 0 ? "now" : "1m"}</small>
                </div>
              ))}
          </GlassCard>
        </>
      ) : (
        <>
          <div className="ref-tabs" role="tablist" aria-label="Pool details">
            {["Details", "Members", "Payments"].map((item) => (
              <button
                role="tab"
                key={item}
                aria-selected={tab === item}
                className={tab === item ? "selected" : ""}
                onClick={() => setTab(item)}
                tabIndex={tab === item ? 0 : -1}
                id={`pool-tab-${item.toLowerCase()}`}
                aria-controls="pool-tab-panel"
                onKeyDown={(event) => {
                  const tabs = ["Details", "Members", "Payments"];
                  const index = tabs.indexOf(tab);
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % 3
                      : event.key === "ArrowLeft"
                        ? (index + 2) % 3
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
                            : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  setTab(tabs[next]);
                  document.getElementById(`pool-tab-${tabs[next].toLowerCase()}`)?.focus();
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div
            className="ref-tab-panel"
            id="pool-tab-panel"
            role="tabpanel"
            aria-labelledby={`pool-tab-${tab.toLowerCase()}`}
            key={tab}
          >
            {tab === "Details" ? (
              <>
                <dl className="ref-contract">
                  <div>
                    <dt>Price now</dt>
                    <dd>
                      {money(priceFor(pool, data.memberships), data.currency)}{" "}
                      <small>/ {pool.category === "oil" ? "unit" : "bag"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Members</dt>
                    <dd>
                      {count} <small>/ {next?.minMembers || count}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Closes</dt>
                    <dd>{closeLabel(pool.closesAt)}</dd>
                  </div>
                  <div>
                    <dt>Held in escrow</dt>
                    <dd>{money(escrow, data.currency)}</dd>
                  </div>
                </dl>
                <p className="ref-label ref-tiers-label">Price tiers</p>
                <div className="ref-tier-boxes">
                  {pool.tiers.map((tier) => (
                    <Squircle
                      cornerRadius={5}
                      cornerSmoothing={1}
                      key={tier.minMembers}
                      className={tier.minMembers === current.minMembers ? "selected" : ""}
                    >
                      <span>{tier.minMembers}+ members</span>
                      <strong>{money(tier.price, data.currency)}</strong>
                    </Squircle>
                  ))}
                </div>
              </>
            ) : (
              <div className="ref-contract-members">
                {members.slice(0, 20).map((member) => (
                  <div key={member.id}>
                    <span className="ref-avatar">{initials(member.name)}</span>
                    <span>
                      {shortName(member.name)}
                      <small>
                        {member.quantity} × {pool.unit}
                      </small>
                    </span>
                    <strong>
                      {tab === "Members" ? "Joined" : money(member.amount, data.currency)}
                    </strong>
                  </div>
                ))}
                {members.length > 20 ? (
                  <Link href="/members">
                    View all {members.length} members <ArrowRight size={16} />
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
      <div className="ref-detail-cta ref-phone-footer">
        {glass ? (
          <>
            <button
              className="ref-round-back"
              aria-label="Back to pools"
              onClick={() => router.push(href("/pools"))}
            >
              <CaretLeft size={23} />
            </button>
            <Button
              onClick={() =>
                pool.status === "Open"
                  ? setConfirm("close")
                  : router.push(href(order ? `/orders/${order.id}` : review))
              }
              disabled={
                !ready || pending || (pool.status === "Open" && count < pool.tiers[0].minMembers)
              }
            >
              {pool.status === "Open" ? "Close pool & order" : "Review wholesale order"}
            </Button>
          </>
        ) : pool.status === "Open" ? (
          <Button onClick={() => onInvite(id)}>
            {next
              ? `Invite ${next.minMembers - count} more to unlock ${money(next.price, data.currency)}`
              : "Invite your group"}
            <ArrowRight size={20} />
          </Button>
        ) : (
          <ActionLink href={href(order ? `/orders/${order.id}` : review)}>
            Review wholesale order
            <ArrowRight size={20} />
          </ActionLink>
        )}
      </div>
      <Modal
        open={manage}
        onClose={() => setManage(false)}
        title={productName(pool)}
        description="Manage this pool, or preview the member experience."
      >
        <div className="ref-menu-links">
          <button
            onClick={() => {
              setManage(false);
              onInvite(id);
            }}
          >
            Invite members
            <UsersThree size={18} />
          </button>
          <Link href={`/join/${id}`}>
            Preview member flow
            <ArrowRight size={18} />
          </Link>
          {pool.status === "Open" ? (
            <button
              disabled={count < pool.tiers[0].minMembers}
              onClick={() => {
                setManage(false);
                setConfirm("close");
              }}
            >
              Close & lock price
              <ArrowRight size={18} />
            </button>
          ) : (
            <Link href={href(order ? `/orders/${order.id}` : review)}>
              Review supplier order
              <ArrowRight size={18} />
            </Link>
          )}
          {["Open", "Closed"].includes(pool.status) ? (
            <button
              onClick={() => {
                setManage(false);
                setConfirm("cancel");
              }}
            >
              Cancel pool & refund members
            </button>
          ) : null}
        </div>
      </Modal>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "cancel" ? "Cancel this pool?" : "Lock in a better price."}
        description={
          confirm === "cancel"
            ? "Every funded payment will be fully refunded in this demo. Unpaid joins will be cancelled."
            : `Final price: ${money(current.price, data.currency)} per ${pool.unit}. Tier rebates: ${money(rebates, data.currency)}. No more members can join after closing.`
        }
      >
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Keep it open
          </Button>
          <Button
            variant={confirm === "cancel" ? "danger" : "primary"}
            disabled={pending || !ready}
            onClick={() => confirm && void act(confirm)}
          >
            {pending ? "Saving…" : confirm === "cancel" ? "Cancel & refund" : "Close & lock price"}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
