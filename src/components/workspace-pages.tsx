"use client";

import { DeviceSettings } from "./device-settings";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Buildings,
  CheckCircle,
  DownloadSimple,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { money, shortDate } from "@/lib/money";
import { useApp } from "./provider";
import { ActionLink, Badge, Button, EmptyState, PageHeading, SectionHeading } from "./ui";

function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 12));
  return (
    <div className="pagination">
      <span>
        {total ? `${page * 12 + 1}–${Math.min((page + 1) * 12, total)} of ${total}` : "0 results"}
      </span>
      <div>
        <button aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ArrowLeft size={17} />
        </button>
        <span>
          {page + 1} / {pages}
        </span>
        <button
          aria-label="Next page"
          disabled={page >= pages - 1}
          onClick={() => onPage(page + 1)}
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function Members({ onInvite }: { onInvite: () => void }) {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const [pool, setPool] = useState("all");
  const [page, setPage] = useState(0);
  const members = data.memberships
    .filter(
      (member) =>
        (pool === "all" || member.poolId === pool) &&
        member.name.toLowerCase().includes(query.toLowerCase()),
    )
    .reverse();
  return (
    <>
      <PageHeading
        eyebrow="THE PEOPLE BEHIND EVERY POOL"
        title="A community, buying together."
        description="Every member makes a better price possible."
      >
        <Button onClick={onInvite}>
          <UsersThree size={19} />
          Invite members
        </Button>
      </PageHeading>
      <div className="collection-toolbar">
        <label className="inline-filter">
          Pool
          <select
            aria-label="Filter members by pool"
            value={pool}
            onChange={(event) => {
              setPool(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">All pools</option>
            {data.pools.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <input
          className="search-input"
          aria-label="Search members"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Find a community member…"
        />
      </div>
      <section className="panel">
        <SectionHeading title="Pool memberships">
          <span className="count-label">{members.length} memberships</span>
        </SectionHeading>
        {members.length ? (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Community memberships and payment status</caption>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Pool</th>
                  <th>Quantity</th>
                  <th>Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.slice(page * 12, (page + 1) * 12).map((member) => (
                  <tr key={member.id}>
                    <td aria-label={member.name}>
                      <span className="member-name">
                        <span className="avatar-small">{member.name[0]}</span>
                        <strong>{member.name}</strong>
                      </span>
                    </td>
                    <td>{data.pools.find((item) => item.id === member.poolId)?.name}</td>
                    <td>{member.quantity}</td>
                    <td>{money(member.amount, data.currency)}</td>
                    <td>
                      <Badge
                        status={
                          member.status === "held"
                            ? "Funded · held"
                            : member.status === "pending"
                              ? "Pending payment"
                              : member.status === "cancelled"
                                ? "Cancelled"
                                : member.status === "refunded"
                                  ? "Refunded"
                                  : member.redeemedAt
                                    ? "Collected"
                                    : "Pickup open"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No neighbours found"
            description="Try another name or pool, or send a new invite."
          />
        )}
        <Pagination page={page} total={members.length} onPage={setPage} />
      </section>
      <p className="below-note">
        <ShieldCheck size={18} />A member’s name appears in the activity feed only when they opt in.
      </p>
    </>
  );
}
export function Payments() {
  const { data, toast } = useApp();
  const [filter, setFilter] = useState("All activity");
  const [page, setPage] = useState(0);
  const held =
    data.memberships
      .filter((member) => member.status === "held")
      .reduce((sum, member) => sum + member.amount - member.rebate, 0) +
    data.orders
      .filter((order) => order.poolId === null && !order.paidAt)
      .reduce((sum, order) => sum + order.total, 0);
  const rebates = data.memberships.reduce((sum, member) => sum + member.rebate, 0);
  const payouts = data.orders
    .filter((order) => order.paidAt)
    .reduce((sum, order) => sum + order.payout, 0);
  const rows = [
    ...data.memberships
      .filter((member) => ["held", "released", "refunded"].includes(member.status))
      .map((member) => ({
        id: member.id,
        type: member.status === "refunded" ? "Refund" : "Payment",
        name: member.name,
        detail: data.pools.find((item) => item.id === member.poolId)?.name || "Community pool",
        amount: member.amount - member.rebate,
        date: member.createdAt,
        status:
          member.status === "held"
            ? "Funded · held"
            : member.status === "refunded"
              ? "Refunded"
              : "Delivered",
      })),
    ...data.memberships
      .filter((member) => member.rebate > 0)
      .map((member) => ({
        id: `rebate-${member.id}`,
        type: "Rebate",
        name: member.name,
        detail: "Tier price difference returned",
        amount: member.rebate,
        date: data.pools.find((item) => item.id === member.poolId)?.closesAt || member.createdAt,
        status: "Returned",
      })),
    ...data.orders
      .filter((order) => order.paidAt)
      .map((order) => ({
        id: `payout-${order.id}`,
        type: "Payout",
        name: order.supplier,
        detail: order.reference,
        amount: order.payout,
        date: order.paidAt!,
        status: "Delivered",
      })),
  ]
    .filter(
      (row) =>
        filter === "All activity" ||
        (filter === "Held payments"
          ? row.status === "Funded · held"
          : filter === "Rebates"
            ? row.type === "Rebate"
            : row.type === "Payout"),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  function download() {
    const escape = (value: string) =>
      `"${(/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
    const content = [
      ["Type", "Name", "Detail", "Amount", "Currency", "Status", "Date"],
      ...rows.map((row) => [
        row.type,
        row.name,
        row.detail,
        (row.amount / 100).toFixed(2),
        data.currency,
        row.status,
        row.date,
      ]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pamoja-escrow-ledger.csv";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Your filtered escrow ledger has been exported.");
  }
  return (
    <>
      <PageHeading
        eyebrow="EVERY CENT HAS A PLACE"
        title="Held safely. Handled clearly."
        description="Community funds, supplier payouts and tier rebates, all in one ledger."
      >
        <Button variant="secondary" onClick={download}>
          <DownloadSimple size={18} />
          Export ledger
        </Button>
      </PageHeading>
      <section className="ledger-metrics">
        <article>
          <span>Currently held</span>
          <strong>{money(held, data.currency)}</strong>
          <small>Ready for funded supplier orders</small>
        </article>
        <article>
          <span>Tier rebates returned</span>
          <strong>{money(rebates, data.currency)}</strong>
          <small>The difference goes back to members</small>
        </article>
        <article>
          <span>Supplier payouts</span>
          <strong>{money(payouts, data.currency)}</strong>
          <small>Released after confirmed drop-off</small>
        </article>
      </section>
      <div className="collection-toolbar">
        <div className="filter-tabs" aria-label="Filter payments">
          {["All activity", "Held payments", "Rebates", "Payouts"].map((item) => (
            <button
              key={item}
              aria-pressed={filter === item}
              className={filter === item ? "selected" : ""}
              onClick={() => {
                setFilter(item);
                setPage(0);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="field-note">
          <ShieldCheck size={16} />
          Member fee: {money(0, data.currency)}
        </span>
      </div>
      <section className="panel">
        <SectionHeading title="Escrow ledger">
          <span className="count-label">{rows.length} entries</span>
        </SectionHeading>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Escrow transactions in the selected category</caption>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Member / supplier</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(page * 12, (page + 1) * 12).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.type}</strong>
                      <small>{row.detail}</small>
                    </td>
                    <td>{row.name}</td>
                    <td>
                      <strong>{money(row.amount, data.currency)}</strong>
                    </td>
                    <td>{shortDate(row.date)}</td>
                    <td>
                      <Badge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nothing in this part of the ledger yet"
            description="Transactions appear here as pools close, deliveries arrive and rebates are returned."
          />
        )}
        <Pagination page={page} total={rows.length} onPage={setPage} />
      </section>
      <div className="info-note payment-policy">
        <ShieldCheck size={25} />
        <p>
          <strong>One fee, charged once.</strong>The supplier pays a 2.5% service fee from their
          invoice. Members pay no added fee. These balances are a simulation; no real funds are held
          or transferred.
        </p>
      </div>
    </>
  );
}
export function Suppliers() {
  const { data } = useApp();
  const names = [...new Set(data.pools.map((pool) => pool.supplier))];
  return (
    <>
      <PageHeading
        eyebrow="THE OTHER HALF OF TOGETHER"
        title="Good partners. Better possibilities."
        description="The wholesalers helping your community buy the essentials for less."
      >
        <ActionLink href="/supplier" variant="secondary">
          Open supplier console
          <ArrowUpRight size={17} />
        </ActionLink>
      </PageHeading>
      <section className="supplier-cards">
        {names.map((name) => {
          const pools = data.pools.filter((pool) => pool.supplier === name);
          const orders = data.orders.filter((order) => order.supplier === name);
          return (
            <article className="panel supplier-card" key={name}>
              <span className="supplier-logo">
                <Buildings size={31} weight="light" />
              </span>
              <Badge status="Funded · held" />
              <h2>{name}</h2>
              <p>Community essentials · bulk wholesale</p>
              <dl>
                <div>
                  <dt>Community pools</dt>
                  <dd>{pools.length}</dd>
                </div>
                <div>
                  <dt>Funded orders</dt>
                  <dd>{orders.length}</dd>
                </div>
                <div>
                  <dt>Order value</dt>
                  <dd>
                    {money(
                      orders.reduce((sum, order) => sum + order.total, 0),
                      data.currency,
                    )}
                  </dd>
                </div>
              </dl>
              <ActionLink href="/supplier" variant="secondary">
                View funded orders
                <ArrowRight size={17} />
              </ActionLink>
            </article>
          );
        })}
      </section>
      <div className="info-note">
        <ShieldCheck size={26} />
        <p>
          <strong>Only funded orders. A fairer way to work.</strong>Suppliers confirm stock and a
          delivery window, then get paid when the community leader verifies the drop-off.
        </p>
      </div>
    </>
  );
}
export function Settings() {
  const { data, mutate, pending, ready, toast } = useApp();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await mutate("settings", {
        groupName: form.get("groupName"),
        leaderName: form.get("leaderName"),
      });
      toast("Workspace details saved.");
    } catch {
      /* Keep form values available for correction. */
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your community workspace."
        description="A few details that make Pamoja yours."
      />
      <div className="settings-grid">
        <section className="panel simple-panel">
          <h2>Community details</h2>
          <p>These details appear in your dashboard and member invite flow.</p>
          <form className="form-stack" onSubmit={(event) => void submit(event)}>
            <label key={`group-${data.groupName}`}>
              Community name
              <input
                name="groupName"
                required
                minLength={2}
                maxLength={80}
                defaultValue={data.groupName}
              />
            </label>
            <label key={`leader-${data.leaderName}`}>
              Leader first name
              <input
                name="leaderName"
                required
                minLength={2}
                maxLength={40}
                defaultValue={data.leaderName}
              />
            </label>
            <div className="modal-footer">
              <Button type="submit" disabled={pending || !ready}>
                {pending ? "Saving…" : "Save details"}
                <CheckCircle size={18} />
              </Button>
            </div>
          </form>
        </section>
        <section className="panel simple-panel settings-facts">
          <ShieldCheck size={30} weight="light" />
          <h2>Ready to try, together.</h2>
          <dl>
            <div>
              <dt>Workspace</dt>
              <dd>Shared demo</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{data.currency} · sample prices</dd>
            </div>
            <div>
              <dt>Member fee</dt>
              <dd>0%</dd>
            </div>
            <div>
              <dt>Supplier fee</dt>
              <dd>2.5%</dd>
            </div>
            <div>
              <dt>Updates</dt>
              <dd>Every 10 seconds</dd>
            </div>
          </dl>
          <p>
            No real money is held or transferred. Invite links intentionally share this sample
            workspace so your group can try the full journey.
          </p>
          <ActionLink href="/join/maize" variant="secondary">
            Explore the member view
            <ArrowUpRight size={17} />
          </ActionLink>
        </section>
      </div>
      <DeviceSettings />
    </>
  );
}
