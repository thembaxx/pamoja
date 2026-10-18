"use client";

import { ArrowRight, Check, CheckSquare, Copy, QrCode, Square, Truck } from "@phosphor-icons/react";
import { Squircle } from "@squircle-js/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { money, poolMembers, priceFor, supplierSettlement } from "@/lib/money";
import type { Order } from "@/lib/types";
import {
  Celebrate,
  DisplayMoney,
  GlassCard,
  OrderStages,
  PhoneHeader,
  SlideConfirm,
  SwapArrow,
  dayDate,
  productName,
  useDesign,
} from "./design";
import { CameraScanner } from "./pickups";
import { api, useApp } from "./provider";
import { BoardTopbar } from "./shell";
import { ActionLink, Badge, Button, EmptyState, Modal, PageHeading, SectionHeading } from "./ui";

export function OrderLines({ order }: { order: Order }) {
  const { data } = useApp();
  return (
    <div className="ref-invoice-lines">
      {order.lines.map((line, index) => (
        <div key={index}>
          <span>
            <strong>{productName(line)}</strong>
            <small>
              {line.quantity} × {money(line.unitPrice, data.currency)}
            </small>
          </span>
          <span>{money(line.quantity * line.unitPrice, data.currency)}</span>
        </div>
      ))}
    </div>
  );
}
export function PayoutSummary({ order }: { order: Order }) {
  const { data } = useApp();
  return (
    <Squircle cornerRadius={7} cornerSmoothing={1} className="ref-payout" data-reveal>
      <div>
        <span>{order.paidAt ? "Supplier paid" : "Held in escrow"}</span>
        <span>Fee 2.5% · {money(order.fee, data.currency)}</span>
      </div>
      <p>
        <strong>{money(order.payout, data.currency)}</strong>
        <span>your payout</span>
      </p>
      <small>
        {order.paidAt
          ? "Released after confirmed drop-off"
          : "Released when the leader confirms drop-off"}
      </small>
    </Squircle>
  );
}
export function Orders() {
  const { data } = useApp();
  const { href } = useDesign();
  const readyPools = data.pools.filter((pool) => pool.status === "Closed");
  return (
    <>
      <div className="desktop-only">
        <PageHeading
          title="Wholesale orders"
          description="Funded orders, from your community to your supplier."
        >
          <ActionLink href="/supplier" variant="secondary">
            Supplier console
            <ArrowRight size={17} />
          </ActionLink>
        </PageHeading>
        {readyPools.length ? (
          <div className="ready-order-banner">
            <div>
              <strong>
                {readyPools.length} pool{readyPools.length > 1 ? "s" : ""} ready to order
              </strong>
              <p>Review the locked price and send your funded order.</p>
            </div>
            <ActionLink href={href(`/orders/review?poolId=${readyPools[0].id}`)}>
              Review order
              <ArrowRight size={17} />
            </ActionLink>
          </div>
        ) : null}
        <section className="panel">
          <SectionHeading title="Supplier orders" />
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Funded supplier orders for your community</caption>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Pool</th>
                  <th>Invoice</th>
                  <th>Deliver by</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders
                  .filter((order) => !order.external)
                  .map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={href(`/orders/${order.id}`)} className="table-title">
                          {order.reference}
                        </Link>
                      </td>
                      <td>{order.name}</td>
                      <td>{money(order.total, data.currency)}</td>
                      <td>{dayDate(order.deliverBy, true)}</td>
                      <td>
                        <Badge status={order.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="mobile-only">
        <OrderReview />
      </div>
    </>
  );
}
export function OrderReview() {
  const { data, ready, pending, mutate, toast } = useApp();
  const { glass, href } = useDesign();
  const params = useSearchParams();
  const router = useRouter();
  const pool =
    data.pools.find((item) => item.id === params.get("poolId")) ||
    data.pools.find((item) => item.status === "Closed");
  if (!pool)
    return (
      <div className="ref-phone-page">
        <PhoneHeader back="/" glass={glass} title={glass ? "Order" : undefined} />
        <EmptyState
          title="Your orders are on their way"
          description="Close a funded pool to review a new wholesale order."
        >
          <ActionLink href={href("/pools")}>View pools</ActionLink>
        </EmptyState>
        <ActionLink href="/supplier" variant="secondary">
          View supplier orders
        </ActionLink>
      </div>
    );
  const members = poolMembers(pool.id, data.memberships);
  const quantity = members.reduce((sum, member) => sum + member.quantity, 0);
  const invoice = quantity * priceFor(pool, data.memberships);
  const held = members.reduce((sum, member) => sum + member.amount, 0);
  const rebate = held - invoice;
  const fee = supplierSettlement(invoice).fee;
  async function place() {
    try {
      const order = await mutate<Order>("orders", { poolId: pool!.id });
      toast("Wholesale order placed. Your supplier has been notified.");
      router.push(href(`/orders/${order.id}`));
    } catch {
      /* Preserve the review for retry. */
    }
  }
  const facts = (
    <dl>
      <div>
        <dt>Service fee · included</dt>
        <dd>{money(fee, data.currency)}</dd>
      </div>
      <div>
        <dt>Tier rebate to members</dt>
        <dd className="ref-green">{money(rebate, data.currency)}</dd>
      </div>
    </dl>
  );
  return (
    <section
      className={`ref-order-review ref-phone-page ${glass ? "glass-phone" : "ledger-phone"}`}
    >
      <PhoneHeader
        back={`/pools/${pool.id}`}
        title={glass ? "Order" : undefined}
        glass={glass}
        right={glass ? undefined : <span className="ref-muted">1 pool</span>}
      />
      <h1>
        {glass ? (
          <>
            Place wholesale
            <br />
            order
          </>
        ) : (
          <>
            Wholesale
            <br />
            order
          </>
        )}
      </h1>
      {glass ? (
        <>
          <div className="ref-order-swap">
            <GlassCard>
              <div>
                <span>Held in escrow</span>
                <span>1 pool</span>
              </div>
              <DisplayMoney amount={held} currency={data.currency} serif />
            </GlassCard>
            <SwapArrow />
            <GlassCard>
              <div>
                <span>Wholesale supplier invoice</span>
                <span>{quantity} items</span>
              </div>
              <DisplayMoney amount={invoice} currency={data.currency} serif />
            </GlassCard>
          </div>
          <GlassCard className="ref-order-fees">{facts}</GlassCard>
        </>
      ) : (
        <>
          <Squircle cornerRadius={7} className="ref-held-panel">
            <p>Held in escrow</p>
            <DisplayMoney amount={held} currency={data.currency} />
          </Squircle>
          <div className="ref-section-heading ref-breakdown-heading">
            <span>Breakdown</span>
            <span>3 items</span>
          </div>
          <dl className="ref-order-breakdown">
            <div>
              <dt>
                Supplier invoice
                <small>
                  {quantity} items · {pool.supplier.toLowerCase()}
                </small>
              </dt>
              <dd>{money(invoice, data.currency)}</dd>
            </div>
            <div>
              <dt>
                Service fee<small>Included in invoice · 2.5%</small>
              </dt>
              <dd>{money(fee, data.currency)}</dd>
            </div>
            <div>
              <dt>
                Tier rebate to members<small>Returned at pool close</small>
              </dt>
              <dd>{money(rebate, data.currency)}</dd>
            </div>
          </dl>
          <p className="ref-label">What happens next</p>
        </>
      )}
      <OrderStages />
      <div className="ref-phone-footer">
        {glass ? (
          <SlideConfirm
            label="Slide to place order"
            onConfirm={place}
            pending={pending}
            disabled={!ready || pool.status !== "Closed"}
          />
        ) : (
          <Button
            onClick={() => void place()}
            disabled={!ready || pending || pool.status !== "Closed"}
          >
            {pending ? "Placing order…" : "Place wholesale order"}
            <ArrowRight size={21} />
          </Button>
        )}
      </div>
    </section>
  );
}
export function OrderDetail({ id }: { id: string }) {
  const { data, mutate, pending, toast, ready } = useApp();
  const [handoff, setHandoff] = useState(false);
  const [token, setToken] = useState("");
  const [qr, setQr] = useState("");
  const order = data.orders.find((item) => item.id === id);
  if (!order)
    return (
      <EmptyState title="Order not found" description="Choose an order from your workspace.">
        <ActionLink href="/orders">View orders</ActionLink>
      </EmptyState>
    );
  async function sample() {
    try {
      const pass = await api<{ token: string }>(`orders/${id}/pass`);
      setToken(pass.token);
      setQr(pass.token);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't load the handoff QR.", true);
    }
  }
  async function deliver() {
    try {
      await mutate(`orders/${id}/deliver`, { token });
      setHandoff(false);
      toast("Drop-off confirmed. Supplier payout released.");
    } catch {
      /* Allow correction. */
    }
  }
  return (
    <div className="ref-order-detail">
      <PhoneHeader back="/orders" right={<Badge status={order.status} />} />
      <PageHeading
        title={order.name}
        description={`${order.reference} · Deliver by ${dayDate(order.deliverBy, true)}`}
      >
        <ActionLink href="/supplier" variant="secondary">
          Open supplier view
          <ArrowRight size={17} />
        </ActionLink>
      </PageHeading>
      <div className="ref-detail-columns">
        <div>
          <section className="panel">
            <SectionHeading title="Wholesale order" />
            <OrderLines order={order} />
          </section>
          <section className="panel simple-panel">
            <h2>Delivery handoff</h2>
            <p>
              Check the goods at drop-off. The driver scans the leader’s signed handoff QR to
              release the supplier payout.
            </p>
            <p>{order.slot || "Waiting for stock and slot confirmation"}</p>
            {order.status === "Loaded" ? (
              <>
                <Button
                  onClick={() => {
                    setHandoff(true);
                    void sample();
                  }}
                >
                  Show leader handoff QR
                  <QrCode size={19} />
                </Button>
                {qr ? (
                  <div className="ref-order-handoff-qr">
                    <QRCodeSVG value={qr} size={170} marginSize={2} />
                  </div>
                ) : null}
              </>
            ) : order.status === "Delivered" ? (
              <div className="success-note">
                <Check size={21} />
                Drop-off confirmed. Members can collect.
                <Celebrate />
              </div>
            ) : (
              <ActionLink href={`/supplier/delivery/${id}`} variant="secondary">
                Open delivery view
                <Truck size={19} />
              </ActionLink>
            )}
          </section>
        </div>
        <PayoutSummary order={order} />
      </div>
      <Modal
        open={handoff}
        onClose={() => setHandoff(false)}
        title="Confirm the supplier drop-off"
        description="The supplier is paid once, after the delivered goods have been checked."
      >
        <div className="form-stack">
          {qr ? (
            <div className="ref-order-handoff-qr">
              <QRCodeSVG value={qr} size={190} marginSize={2} title="Leader delivery handoff QR" />
            </div>
          ) : null}
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(qr)
                .then(() => toast("Leader handoff token copied."))
                .catch(() => toast("Copy unavailable.", true))
            }
            disabled={!qr}
          >
            <Copy size={17} />
            Copy leader handoff token
          </Button>
          <label>
            Delivery QR code
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value.trim())}
              rows={3}
              placeholder="Paste the signed delivery token"
            />
          </label>
          <Button variant="secondary" onClick={() => void sample()}>
            Use this order’s demo QR
          </Button>
          <Button onClick={() => void deliver()} disabled={!token || pending || !ready}>
            {pending ? "Confirming…" : "Confirm drop-off & release"}
            <ArrowRight size={18} />
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function SupplierConsole() {
  const { data, mutate, pending, ready, toast } = useApp();
  const params = useSearchParams();
  const tab = params.get("tab") || "orders";
  const [selected, setSelected] = useState("");
  const [slot, setSlot] = useState(1);
  const order = data.orders.find((item) => item.id === selected) || data.orders[0];
  const incoming = data.orders.filter((item) => ["Placed", "Confirmed"].includes(item.status));
  const rows =
    tab === "deliveries"
      ? data.orders.filter((item) => ["Loaded", "Delivered"].includes(item.status))
      : tab === "payouts"
        ? data.orders
        : incoming;
  const confirm = async () => {
    if (!order) return;
    const day = new Date(order.deliverBy);
    day.setUTCDate(day.getUTCDate() + slot - 1);
    try {
      await mutate(`orders/${order.id}/confirm`, {
        slot: `${dayDate(day.toISOString(), true)} · 09:00–11:00 · Community hall`,
      });
      toast("Stock & delivery slot confirmed.");
    } catch {
      /* Retain the selected order. */
    }
  };
  return (
    <div className="ref-supplier-console">
      <section className="ref-supplier-main">
        <BoardTopbar
          title={tab === "orders" ? "Orders" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          supplier
        />
        <h1>
          {{
            orders: "Incoming pooled orders",
            deliveries: "Your deliveries",
            payouts: "Supplier payouts",
            catalogue: "Product catalogue",
            leaders: "Community leaders",
          }[tab] || "Incoming pooled orders"}
        </h1>
        {tab === "catalogue" ? (
          <div className="ref-catalogue">
            {data.pools.slice(0, 4).map((pool) => (
              <Squircle cornerRadius={7} className="panel simple-panel" key={pool.id}>
                <h2>{productName(pool)}</h2>
                <p>{pool.supplier}</p>
                <strong>{money(priceFor(pool, data.memberships), data.currency)}</strong>
                <p>Tier prices from {pool.tiers[0].minMembers} members</p>
                <ActionLink href={`/pools/${pool.id}`} variant="secondary">
                  View pool
                  <ArrowRight size={16} />
                </ActionLink>
              </Squircle>
            ))}
          </div>
        ) : tab === "leaders" ? (
          <section className="panel simple-panel">
            <h2>{data.groupName}</h2>
            <p>{data.leaderName} · Community leader</p>
            <ActionLink href="/">
              Open community dashboard
              <ArrowRight size={17} />
            </ActionLink>
          </section>
        ) : (
          <>
            <div className="ref-supplier-stats">
              {[
                ["To confirm", data.orders.filter((item) => item.status === "Placed").length],
                ["Out for delivery", data.orders.filter((item) => item.status === "Loaded").length],
                [
                  "Payout pending",
                  money(
                    data.orders
                      .filter((item) => !item.paidAt)
                      .reduce((sum, item) => sum + item.payout, 0),
                    data.currency,
                  ),
                ],
              ].map(([label, value], index) => (
                <Squircle cornerRadius={5} className={index === 0 ? "selected" : ""} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </Squircle>
              ))}
            </div>
            <div className="table-scroll ref-supplier-table">
              <table>
                <caption className="sr-only">Funded pooled orders</caption>
                <thead>
                  <tr>
                    <th>Pool</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Deliver by</th>
                    <th>Escrow</th>
                    <th>
                      <span className="sr-only">Confirm order</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id} className={item.id === order?.id ? "selected-row" : ""}>
                      <td>
                        <button
                          className="ref-select-order"
                          onClick={() => {
                            setSelected(item.id);
                            setSlot(1);
                          }}
                          aria-pressed={item.id === order?.id}
                        >
                          {item.name}
                        </button>
                      </td>
                      <td>{item.lines.length} lines</td>
                      <td>{money(item.total, data.currency)}</td>
                      <td>{dayDate(item.deliverBy, true)}</td>
                      <td>
                        <span className="ref-green">{item.paidAt ? "Paid" : "Funded · held"}</span>
                      </td>
                      <td>
                        {item.status === "Placed" ? (
                          <Button
                            variant="dark"
                            onClick={() => {
                              setSelected(item.id);
                              setSlot(1);
                            }}
                            aria-label={`Confirm ${item.name} · Review stock`}
                          >
                            Confirm
                          </Button>
                        ) : tab === "deliveries" ? (
                          <ActionLink href={`/supplier/delivery/${item.id}`} variant="dark">
                            Delivery
                          </ActionLink>
                        ) : (
                          <span className="ref-muted">{item.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {order ? (
        <aside className="ref-supplier-detail" key={order.id}>
          <p className="ref-label">Order {order.reference}</p>
          <h2>{order.name}</h2>
          <OrderLines order={order} />
          <PayoutSummary order={order} />
          {order.status === "Placed" ? (
            <>
              <p className="ref-label ref-slot-label">Delivery slot</p>
              <fieldset className="ref-slot-picker" aria-label="Delivery slot">
                {[0, 1, 2].map((index) => {
                  const d = new Date(order.deliverBy);
                  d.setUTCDate(d.getUTCDate() + index - 1);
                  return (
                    <Squircle asChild cornerRadius={5} key={index}>
                      <label className={slot === index ? "selected" : ""}>
                        <input
                          className="sr-only"
                          type="radio"
                          name="slot"
                          checked={slot === index}
                          onChange={() => setSlot(index)}
                        />
                        <span>
                          {d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
                        </span>
                        <strong>{d.getUTCDate()}</strong>
                      </label>
                    </Squircle>
                  );
                })}
              </fieldset>
              <Button
                className="ref-confirm-stock"
                disabled={pending || !ready}
                onClick={() => void confirm()}
              >
                {pending ? "Confirming…" : "Confirm stock & slot"}
                <ArrowRight size={18} />
              </Button>
            </>
          ) : (
            <div className="ref-confirmed-stock">
              <p>
                <Check size={17} />
                Stock confirmed · {order.slot}
              </p>
              <ActionLink href={`/supplier/delivery/${order.id}`} variant="primary">
                Open driver delivery view
                <ArrowRight size={18} />
              </ActionLink>
            </div>
          )}
        </aside>
      ) : (
        <EmptyState
          title="Your next order is coming"
          description="Funded orders will appear here."
        />
      )}
    </div>
  );
}

export function Delivery({ id }: { id: string }) {
  const { data, mutate, pending, ready, toast } = useApp();
  const [checked, setChecked] = useState<number[]>([]);
  const [scan, setScan] = useState(false);
  const [camera, setCamera] = useState(false);
  const [token, setToken] = useState("");
  const order = data.orders.find((item) => item.id === id);
  if (!order)
    return (
      <EmptyState title="Delivery not found" description="Choose a funded order.">
        <ActionLink href="/supplier">Supplier console</ActionLink>
      </EmptyState>
    );
  const loaded = ["Loaded", "Delivered"].includes(order.status);
  async function load() {
    try {
      await mutate(`orders/${id}/load`, {});
      toast("Load checked. Ready for the leader handoff.");
    } catch {
      /* Keep checked items. */
    }
  }
  async function sample() {
    try {
      const pass = await api<{ token: string }>(`orders/${id}/pass`);
      setToken(pass.token);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't load the handoff QR.", true);
    }
  }
  async function deliver(value = token) {
    try {
      await mutate(`orders/${id}/deliver`, { token: value });
      setScan(false);
      setCamera(false);
      toast("Delivered. Your payout has been released.");
    } catch {
      /* Keep the scanner available. */
    }
  }
  return (
    <section id="delivery-content" className="ref-driver-page ref-phone-page ledger-phone">
      <PhoneHeader
        back="/supplier"
        right={
          <span className="ref-muted">
            Status:{" "}
            <span className="ref-green">
              {order.status === "Loaded"
                ? "In transit"
                : order.status === "Delivered"
                  ? "Delivered"
                  : order.status === "Confirmed"
                    ? "Confirmed"
                    : "To confirm"}
            </span>
          </span>
        }
      />
      <div className="ref-driver-title">
        <h1>
          Delivery
          <br />
          {order.reference}
        </h1>
        <p>
          {order.name} · drop-off {dayDate(order.deliverBy, true)}
        </p>
      </div>
      <ol className="ref-delivery-stages">
        {["Confirmed", "Loaded", "Delivered", "Paid"].map((stage, index) => {
          const done =
            order.status === "Delivered" ||
            (index === 0 && order.status !== "Placed") ||
            (index === 1 && loaded);
          return (
            <Squircle asChild cornerRadius={5} key={stage}>
              <li className={done ? "selected" : ""}>
                <span>{stage}</span>
                <strong>{done ? <Check size={22} /> : "—"}</strong>
              </li>
            </Squircle>
          );
        })}
      </ol>
      <p className="ref-label">Load check</p>
      <div className="ref-load-checklist">
        {order.lines.map((line, index) => (
          <label key={index}>
            <span className="ref-check-control">
              <input
                type="checkbox"
                checked={loaded || checked.includes(index)}
                disabled={order.status !== "Confirmed"}
                onChange={(event) =>
                  setChecked(
                    event.target.checked
                      ? [...checked, index]
                      : checked.filter((value) => value !== index),
                  )
                }
              />
              {loaded || checked.includes(index) ? (
                <CheckSquare size={19} weight="fill" />
              ) : (
                <Square size={19} />
              )}
            </span>
            <span>{productName(line)}</span>
            <small>
              {line.quantity}{" "}
              {line.name.includes("oil") ? "units" : line.name.includes("soap") ? "packs" : "bags"}
            </small>
          </label>
        ))}
      </div>
      <Squircle cornerRadius={7} className="ref-driver-payout">
        <p>{order.paidAt ? "Payout released" : "Payout on drop-off"}</p>
        <strong>{money(order.payout, data.currency)}</strong>
        {order.paidAt ? <Celebrate /> : null}
      </Squircle>
      <div className="ref-phone-footer">
        {order.status === "Placed" ? (
          <ActionLink href="/supplier">
            Confirm stock & slot
            <ArrowRight size={20} />
          </ActionLink>
        ) : order.status === "Confirmed" ? (
          <Button
            disabled={checked.length !== order.lines.length || pending || !ready}
            onClick={() => void load()}
          >
            {pending ? "Saving load…" : "Mark load checked"}
            <Truck size={21} />
          </Button>
        ) : order.status === "Loaded" ? (
          <Button onClick={() => setScan(true)} disabled={!ready}>
            Scan leader QR to confirm
            <QrCode size={21} />
          </Button>
        ) : (
          <ActionLink href="/supplier">
            Delivery complete
            <Check size={22} />
          </ActionLink>
        )}
      </div>
      <Modal
        open={scan}
        onClose={() => {
          setScan(false);
          setCamera(false);
        }}
        title="Confirm the leader handoff"
        description="Scan the leader’s signed QR after the goods have been checked. This releases your payout once."
      >
        <div className="form-stack">
          {camera ? (
            <CameraScanner
              onToken={(value) => {
                setToken(value);
                setCamera(false);
              }}
              onClose={() => setCamera(false)}
            />
          ) : (
            <Button variant="dark" onClick={() => setCamera(true)}>
              Open camera
              <QrCode size={18} />
            </Button>
          )}
          <label>
            Leader delivery QR token
            <textarea
              rows={3}
              value={token}
              onChange={(event) => setToken(event.target.value.trim())}
              placeholder="Paste the signed leader handoff token"
            />
          </label>
          <Button variant="secondary" onClick={() => void sample()}>
            Use this order’s demo QR
          </Button>
          <Button disabled={!token || pending || !ready} onClick={() => void deliver()}>
            {pending ? "Confirming…" : "Confirm drop-off & release"}
            <ArrowRight size={18} />
          </Button>
        </div>
      </Modal>
    </section>
  );
}
