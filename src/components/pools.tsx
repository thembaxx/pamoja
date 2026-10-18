"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  Check,
  Clock,
  Plus,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { currentTier, money, nextTier, poolMembers, priceFor, shortDate } from "@/lib/money";
import type { Order } from "@/lib/types";
import { useApp } from "./provider";
import { PoolTable } from "./pool-table";
import {
  ActionLink,
  Badge,
  Button,
  EmptyState,
  LiveLabel,
  Modal,
  PageHeading,
  ProductTile,
  Progress,
  SectionHeading,
  StageStrip,
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
        eyebrow="BETTER PRICES START HERE"
        title="Your community pools."
        description="Bring demand together. Unlock a little more with every member."
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
              {item === "All pools" ? <span>{data.pools.length}</span> : null}
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
          <LiveLabel />
        </SectionHeading>
        <PoolTable pools={pools} />
      </section>
      <p className="below-note">
        <ShieldCheck size={17} />
        Every supplier order starts with a funded community.
      </p>
    </>
  );
}
export function PoolDetail({ id, onInvite }: { id: string; onInvite: (id: string) => void }) {
  const { data, mutate, pending, ready, toast } = useApp();
  const [confirm, setConfirm] = useState<"close" | "cancel" | null>(null);
  const router = useRouter();
  const pool = data.pools.find((item) => item.id === id);
  if (!pool)
    return (
      <EmptyState
        title="Pool not found"
        description="This pool isn't in your workspace. Open the full invite link if a leader shared it with you."
      >
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
  const quantity = members.reduce((sum, member) => sum + member.quantity, 0);
  const rebates = members.reduce(
    (sum, member) =>
      sum +
      (pool.status === "Open"
        ? Math.max(0, member.unitPrice - current.price) * member.quantity
        : member.rebate),
    0,
  );
  const order = data.orders.find((item) => item.poolId === id);
  const minimum = Math.min(...pool.tiers.map((t) => t.minMembers));
  async function act(action: "close" | "cancel") {
    try {
      await mutate(`pools/${id}/${action}`, {});
      setConfirm(null);
      toast(
        action === "close"
          ? "Final price locked. Your supplier order is ready to review."
          : "Pool cancelled. All demo payments have been refunded.",
      );
    } catch {
      /* Keep the review dialog open on an error. */
    }
  }
  async function orderNow() {
    try {
      const created = await mutate<Order>("orders", { poolId: id });
      toast("Funded order sent to the supplier.");
      router.push(`/orders/${created.id}`);
    } catch {
      /* The shared toast reports the server error. */
    }
  }
  return (
    <>
      <Link href="/pools" className="back-link">
        <ArrowLeft size={17} />
        All pools
      </Link>
      <PageHeading
        eyebrow={`${pool.unit.toUpperCase()} · ${pool.supplier.toUpperCase()}`}
        title={pool.name}
        description={pool.description}
      >
        <Badge status={pool.status} />
        {pool.status === "Open" ? (
          <Button variant="secondary" onClick={() => onInvite(id)}>
            <UsersThree size={18} />
            Send invite
          </Button>
        ) : null}
      </PageHeading>
      <StageStrip
        stages={["Open", "Closed", "Ordered", "Pickup", "Settled"]}
        current={Math.max(
          0,
          ["Open", "Closed", "Ordered", "PickupOpen", "Settled"].indexOf(pool.status),
        )}
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel pool-contract">
            <div className="contract-price">
              <ProductTile category={pool.category} large />
              <div>
                <p className="eyebrow">CURRENT COMMUNITY PRICE</p>
                <strong>
                  {money(priceFor(pool, data.memberships), data.currency)}
                  <span>/ {pool.unit}</span>
                </strong>
                <p>
                  {count >= minimum
                    ? "Minimum reached. Your community is buying better."
                    : `${Math.max(0, minimum - count)} more members needed to reach the minimum.`}
                </p>
              </div>
              <LiveLabel />
            </div>
            <dl className="contract-facts">
              <div>
                <dt>
                  <UsersThree size={17} />
                  Members
                </dt>
                <dd>{count} neighbours</dd>
              </div>
              <div>
                <dt>
                  <Clock size={17} />
                  Pool closes
                </dt>
                <dd>
                  {shortDate(pool.closesAt)} ·{" "}
                  {new Date(pool.closesAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </dd>
              </div>
              <div>
                <dt>
                  <CalendarBlank size={17} />
                  Pickup day
                </dt>
                <dd>{shortDate(pool.pickupAt)} · Community hall</dd>
              </div>
              <div>
                <dt>
                  <ShieldCheck size={17} />
                  Escrow held
                </dt>
                <dd>{money(escrow, data.currency)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel tiers-panel">
            <SectionHeading
              title="More together. Less per bag."
              subtitle="A better price unlocks each time a member milestone is reached."
            />
            <div className="tier-cards">
              {pool.tiers.map((tier, index) => (
                <article
                  key={tier.minMembers}
                  className={
                    tier.minMembers === current.minMembers && count >= minimum ? "current" : ""
                  }
                >
                  <div className="tier-card-label">
                    <span>TIER {String(index + 1).padStart(2, "0")}</span>
                    {count >= tier.minMembers ? <Check size={18} /> : null}
                  </div>
                  <h3>
                    {tier.minMembers}+ <span>members</span>
                  </h3>
                  <strong>{money(tier.price, data.currency)}</strong>
                  <p>
                    {tier.minMembers === current.minMembers && count >= minimum
                      ? "Your price now"
                      : count >= tier.minMembers
                        ? "Unlocked"
                        : `${tier.minMembers - count} more to unlock`}
                  </p>
                </article>
              ))}
            </div>
            <div className="tier-target">
              <div>
                <strong>
                  {count} of {next?.minMembers || count} members
                </strong>
                <span>
                  {next
                    ? `${next.minMembers - count} more for ${money(next.price, data.currency)}`
                    : "Your community unlocked the best price"}
                </span>
              </div>
              <Progress
                value={count}
                max={next?.minMembers || count || 1}
                label="Progress to the next pool tier"
              />
            </div>
            <div className="info-note">
              <ShieldCheck size={23} />
              <p>
                <strong>Join now. Save again later.</strong>If more people join and the price falls,
                earlier members get the difference back from escrow when the pool closes.
              </p>
            </div>
          </section>
          <section className="panel">
            <SectionHeading title="Buying together">
              <span className="count-label">{count} funded members</span>
            </SectionHeading>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Latest funded members of this pool</caption>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Quantity</th>
                    <th>Paid</th>
                    <th>Escrow</th>
                  </tr>
                </thead>
                <tbody>
                  {members
                    .slice(-7)
                    .reverse()
                    .map((member) => (
                      <tr key={member.id}>
                        <td>
                          <span className="member-name">
                            <span className="avatar-small">{member.name.slice(0, 1)}</span>
                            {member.name}
                          </span>
                        </td>
                        <td>
                          {member.quantity} × {pool.unit}
                        </td>
                        <td>{money(member.amount, data.currency)}</td>
                        <td>
                          <Badge
                            status={
                              member.status === "held"
                                ? "Funded · held"
                                : member.redeemedAt
                                  ? "Collected"
                                  : "PickupOpen"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!members.length ? (
              <EmptyState
                title="The first neighbour makes the difference"
                description="Share an invite to get this pool moving."
              />
            ) : null}
          </section>
        </div>
        <aside className="detail-rail">
          <section className="dark-summary">
            <p className="eyebrow">COMMUNITY ESCROW</p>
            <ShieldCheck size={28} weight="light" />
            <div className="dark-amount">{money(escrow, data.currency)}</div>
            <p>Held for this pool. Every cent accounted for.</p>
            <dl>
              <div>
                <dt>Funded quantity</dt>
                <dd>{quantity} units</dd>
              </div>
              <div>
                <dt>Invoice at current price</dt>
                <dd>{money(quantity * current.price, data.currency)}</dd>
              </div>
              <div>
                <dt>Tier {pool.status === "Open" ? "rebate preview" : "rebates"}</dt>
                <dd>{money(rebates, data.currency)}</dd>
              </div>
              <div>
                <dt>Member fee</dt>
                <dd>{money(0, data.currency)}</dd>
              </div>
            </dl>
            {pool.status === "Open" ? (
              <Button
                onClick={() => setConfirm("close")}
                disabled={pending || !ready || count < minimum}
              >
                Close & lock price
                <ArrowRight size={18} />
              </Button>
            ) : pool.status === "Closed" ? (
              <Button onClick={() => void orderNow()} disabled={pending || !ready}>
                {pending ? "Placing order…" : "Place supplier order"}
                <ArrowRight size={18} />
              </Button>
            ) : order ? (
              <ActionLink href={`/orders/${order.id}`}>
                View supplier order
                <ArrowRight size={18} />
              </ActionLink>
            ) : (
              <ActionLink href="/pickups">
                Go to pickups
                <ArrowRight size={18} />
              </ActionLink>
            )}
            <small>
              Supplier pays the 2.5% service fee from their payout. Members pay no added fee.
            </small>
          </section>
          <section className="panel simple-panel">
            <h2>Pass it around.</h2>
            <p>One more neighbour could be the one who brings everyone a better price.</p>
            {pool.status === "Open" ? (
              <>
                <Button variant="secondary" onClick={() => onInvite(id)}>
                  <UsersThree size={18} />
                  Invite your group
                </Button>
                <ActionLink href={`/join/${id}`} variant="ghost">
                  Preview member flow
                  <ArrowUpRight size={16} />
                </ActionLink>
              </>
            ) : (
              <ActionLink href="/members" variant="secondary">
                View pool members
              </ActionLink>
            )}
          </section>
          {["Open", "Closed"].includes(pool.status) ? (
            <button className="cancel-pool" onClick={() => setConfirm("cancel")}>
              Cancel pool & refund members
            </button>
          ) : null}
        </aside>
      </div>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "cancel" ? "Cancel this pool?" : "Lock in a better price."}
        description={
          confirm === "cancel"
            ? "Every funded payment will be fully refunded in this demo. Unpaid joins will be cancelled, and the pool will stop accepting members."
            : `The final price will be ${money(current.price, data.currency)} per ${pool.unit}, with ${money(rebates, data.currency)} in tier rebates. No more members can join after this.`
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
    </>
  );
}
