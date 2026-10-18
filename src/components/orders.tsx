"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Copy,
  Package,
  QrCode,
  ShieldCheck,
  Truck,
} from "@phosphor-icons/react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { money, shortDate } from "@/lib/money";
import type { Order } from "@/lib/types";
import { api, useApp } from "./provider";
import {
  ActionLink,
  Badge,
  Button,
  EmptyState,
  Modal,
  PageHeading,
  SectionHeading,
  StageStrip,
} from "./ui";

export function OrderLines({ order }: { order: Order }) {
  const { data } = useApp();
  return (
    <div className="table-scroll">
      <table className="order-lines">
        <caption className="sr-only">Line items for {order.reference}</caption>
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Tier price</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line, index) => (
            <tr key={index}>
              <td>
                <strong>{line.name}</strong>
                <small>{line.unit}</small>
              </td>
              <td>{line.quantity}</td>
              <td>{money(line.unitPrice, data.currency)}</td>
              <td>
                <strong>{money(line.quantity * line.unitPrice, data.currency)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Funded invoice total</td>
            <td>{money(order.total, data.currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
export function PayoutSummary({ order }: { order: Order }) {
  const { data } = useApp();
  return (
    <section className="dark-summary payout-summary">
      <div className="payout-heading">
        <p className="eyebrow">{order.paidAt ? "SUPPLIER PAID" : "PROTECTED IN ESCROW"}</p>
        <ShieldCheck size={24} />
      </div>
      <div className="dark-amount">{money(order.payout, data.currency)}</div>
      <p>
        {order.paidAt
          ? "Drop-off confirmed. Payout released."
          : "Your payout, when the leader confirms drop-off."}
      </p>
      <dl>
        <div>
          <dt>Funded order</dt>
          <dd>{money(order.total, data.currency)}</dd>
        </div>
        <div>
          <dt>Service fee · 2.5%</dt>
          <dd>− {money(order.fee, data.currency)}</dd>
        </div>
        <div className="total-row">
          <dt>Supplier payout</dt>
          <dd>{money(order.payout, data.currency)}</dd>
        </div>
      </dl>
      <div className="payout-note">
        <ShieldCheck size={18} />
        <span>Only funded orders reach suppliers. No chasing payments.</span>
      </div>
    </section>
  );
}
export function Orders() {
  const { data } = useApp();
  const readyPools = data.pools.filter((pool) => pool.status === "Closed");
  return (
    <>
      <PageHeading
        eyebrow="FROM YOUR COMMUNITY TO YOUR SUPPLIER"
        title="Every order, accounted for."
        description="Fully funded orders. Clear delivery dates. A little less to worry about."
      >
        <ActionLink href="/supplier" variant="secondary">
          Supplier console
          <ArrowUpRight size={17} />
        </ActionLink>
      </PageHeading>
      {readyPools.length ? (
        <div className="ready-order-banner">
          <Package size={26} />
          <div>
            <strong>
              {readyPools.length} pool{readyPools.length === 1 ? " is" : "s are"} ready to order
            </strong>
            <p>Your members have paid. Review the final price and send it to the supplier.</p>
          </div>
          <ActionLink href={`/pools/${readyPools[0].id}`}>
            Review pool
            <ArrowRight size={17} />
          </ActionLink>
        </div>
      ) : null}
      <section className="panel">
        <SectionHeading title="Supplier orders">
          <span className="count-label">{data.orders.length} orders</span>
        </SectionHeading>
        {data.orders.length ? (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Funded supplier orders</caption>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Supplier</th>
                  <th>Invoice</th>
                  <th>Deliver by</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/orders/${order.id}`} className="table-title">
                        {order.reference}
                        <small>{order.name}</small>
                      </Link>
                    </td>
                    <td>{order.supplier}</td>
                    <td>
                      <strong>{money(order.total, data.currency)}</strong>
                    </td>
                    <td>{shortDate(order.deliverBy)}</td>
                    <td>
                      <Badge status={order.status} />
                    </td>
                    <td>
                      <Link
                        href={`/orders/${order.id}`}
                        aria-label={`View ${order.reference}`}
                        className="row-arrow"
                      >
                        <ArrowRight size={19} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="The next good thing is on its way"
            description="Close a funded pool to place your first wholesale order."
          />
        )}
      </section>
    </>
  );
}
export function OrderDetail({ id }: { id: string }) {
  const { data, mutate, pending, toast, ready } = useApp();
  const [handoff, setHandoff] = useState(false);
  const [token, setToken] = useState("");
  const order = data.orders.find((item) => item.id === id);
  if (!order)
    return (
      <EmptyState title="Order not found" description="This order isn't in your demo workspace.">
        <ActionLink href="/orders">View orders</ActionLink>
      </EmptyState>
    );
  async function sample() {
    try {
      const pass = await api<{ token: string }>(`orders/${id}/pass`);
      setToken(pass.token);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't load the pass.", true);
    }
  }
  async function deliver() {
    try {
      await mutate(`orders/${id}/deliver`, { token });
      setHandoff(false);
      toast("Drop-off confirmed. The supplier payout has been released.");
    } catch {
      /* Keep the handoff open so the leader can correct the code. */
    }
  }
  return (
    <>
      <Link href="/orders" className="back-link">
        <ArrowLeft size={17} />
        All orders
      </Link>
      <PageHeading
        eyebrow={`${order.reference} · ${order.supplier.toUpperCase()}`}
        title={order.name}
        description={`A community order, delivering by ${shortDate(order.deliverBy)}.`}
      >
        <Badge status={order.status} />
        <ActionLink href="/supplier" variant="secondary">
          Open supplier view
          <ArrowUpRight size={17} />
        </ActionLink>
      </PageHeading>
      <StageStrip
        stages={["Funded", "Confirmed", "Loaded", "Delivered & paid"]}
        current={["Placed", "Confirmed", "Loaded", "Delivered"].indexOf(order.status)}
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel">
            <SectionHeading title="Your wholesale order">
              <span className="count-label">{order.lines.length} lines</span>
            </SectionHeading>
            <OrderLines order={order} />
          </section>
          <section className="panel simple-panel">
            <h2>One handoff. Everything in place.</h2>
            <p>
              Check the delivered items, then scan the supplier delivery QR to confirm drop-off.
              This releases the supplier payout once.
            </p>
            <dl className="contract-facts">
              <div>
                <dt>Delivery slot</dt>
                <dd>{order.slot || "Waiting for supplier confirmation"}</dd>
              </div>
              <div>
                <dt>Collection point</dt>
                <dd>Khayelitsha Community Hall</dd>
              </div>
              <div>
                <dt>Escrow status</dt>
                <dd>
                  {order.paidAt ? "Released after confirmed drop-off" : "Fully funded · held"}
                </dd>
              </div>
            </dl>
            {order.status === "Loaded" ? (
              <Button onClick={() => setHandoff(true)}>
                <QrCode size={19} />
                Confirm drop-off
              </Button>
            ) : order.status === "Delivered" ? (
              <div className="success-note">
                <CheckCircle size={22} weight="fill" />
                Drop-off confirmed. Members can collect their goods.
              </div>
            ) : (
              <ActionLink href={`/supplier/delivery/${order.id}`} variant="secondary">
                Open delivery view
                <Truck size={18} />
              </ActionLink>
            )}
          </section>
        </div>
        <aside className="detail-rail">
          <PayoutSummary order={order} />
          <section className="panel simple-panel">
            <h2>Every cent has a place.</h2>
            <p>
              The service fee comes out of the supplier payout. Your members pay no added fee, and
              tier rebates are returned separately at pool close.
            </p>
            <ActionLink href="/payments" variant="ghost">
              Open escrow ledger
              <ArrowRight size={17} />
            </ActionLink>
          </section>
        </aside>
      </div>
      <Modal
        open={handoff}
        onClose={() => setHandoff(false)}
        title="Confirm the supplier drop-off."
        description="Check the delivered goods, then enter the supplier's signed QR code. The payout will be released immediately in this demo."
      >
        <div className="form-stack">
          <label>
            Supplier delivery QR code
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value.trim())}
              placeholder="Paste the delivery QR token"
              rows={3}
            />
          </label>
          <Button variant="secondary" onClick={() => void sample()} disabled={pending}>
            Use this order’s demo QR
          </Button>
          <p className="field-note">
            <ShieldCheck size={17} />
            Confirm only after all ordered goods have arrived.
          </p>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setHandoff(false)}>
              Not yet
            </Button>
            <Button onClick={() => void deliver()} disabled={!token || pending || !ready}>
              {pending ? "Confirming…" : "Confirm drop-off & release"}
              <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
export function SupplierConsole() {
  const { data, mutate, pending, ready, toast } = useApp();
  const [selected, setSelected] = useState("");
  const [slot, setSlot] = useState("09:00–11:00 · Community hall");
  const order = data.orders.find((item) => item.id === selected) || data.orders[0];
  const confirm = async () => {
    if (!order) return;
    try {
      await mutate(`orders/${order.id}/confirm`, { slot });
      toast("Stock and delivery slot confirmed. Your leader has been updated.");
    } catch {
      /* The shared notification reports the error. */
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="MARKET LINK WHOLESALERS"
        title="Good demand. Ready to fulfil."
        description="Every order here is funded. Confirm the stock, choose a slot, and deliver."
      >
        <span className="supplier-funded-note">
          <ShieldCheck size={18} />
          Funded orders only
        </span>
      </PageHeading>
      <section className="panel incoming-panel">
        <SectionHeading title="Incoming community orders">
          <span className="count-label">
            {data.orders.filter((item) => item.status === "Placed").length} to confirm
          </span>
        </SectionHeading>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Select a funded order to confirm</caption>
            <thead>
              <tr>
                <th>Pool / order</th>
                <th>Lines</th>
                <th>Total</th>
                <th>Deliver by</th>
                <th>Escrow</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((item) => (
                <tr key={item.id} className={item.id === order?.id ? "selected-row" : ""}>
                  <td aria-label={`${item.name} ${item.reference}`}>
                    <button
                      className="table-select"
                      onClick={() => setSelected(item.id)}
                      aria-pressed={item.id === order?.id}
                    >
                      <strong>{item.name}</strong>
                      <small>{item.reference}</small>
                    </button>
                  </td>
                  <td>{item.lines.length}</td>
                  <td>
                    <strong>{money(item.total, data.currency)}</strong>
                  </td>
                  <td>{shortDate(item.deliverBy)}</td>
                  <td>
                    <Badge status={item.paidAt ? "Delivered" : "Funded · held"} />
                  </td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {order ? (
        <div className="detail-grid supplier-detail">
          <div className="detail-main">
            <section className="panel">
              <SectionHeading title={`Order detail · ${order.reference}`} subtitle={order.name}>
                <Badge status={order.status} />
              </SectionHeading>
              <OrderLines order={order} />
            </section>
            <section className="panel simple-panel">
              <div className="delivery-slot-title">
                <Truck size={24} />
                <div>
                  <h2>Make room for a good delivery.</h2>
                  <p>Confirm that every line is in stock, then pick a delivery window.</p>
                </div>
              </div>
              {order.status === "Placed" ? (
                <>
                  <fieldset className="slot-options" aria-label="Delivery slot">
                    {[
                      "09:00–11:00 · Community hall",
                      "11:00–13:00 · Community hall",
                      "14:00–16:00 · Community hall",
                    ].map((item) => (
                      <label key={item} className={slot === item ? "selected" : ""}>
                        <input
                          type="radio"
                          name="slot"
                          value={item}
                          checked={slot === item}
                          onChange={() => setSlot(item)}
                        />
                        <strong>{item.split(" · ")[0]}</strong>
                        <span>{shortDate(order.deliverBy)}</span>
                      </label>
                    ))}
                  </fieldset>
                  <Button disabled={pending || !ready} onClick={() => void confirm()}>
                    {pending ? "Confirming…" : "Confirm stock & slot"}
                    <ArrowRight size={18} />
                  </Button>
                </>
              ) : (
                <>
                  <div className="success-note">
                    <CheckCircle size={22} weight="fill" />
                    Stock confirmed · {order.slot}
                  </div>
                  <ActionLink href={`/supplier/delivery/${order.id}`} variant="dark">
                    {order.status === "Delivered"
                      ? "View delivery receipt"
                      : "Open driver delivery view"}
                    <Truck size={18} />
                  </ActionLink>
                </>
              )}
            </section>
          </div>
          <aside className="detail-rail">
            <PayoutSummary order={order} />
            <p className="below-note">
              <ShieldCheck size={20} />
              You get paid when the community leader confirms your drop-off with the delivery QR.
            </p>
          </aside>
        </div>
      ) : (
        <EmptyState
          title="Your next community order is coming"
          description="Fully funded orders will appear here, ready to confirm."
        />
      )}
    </>
  );
}
export function Delivery({ id }: { id: string }) {
  const { data, mutate, pending, ready, toast } = useApp();
  const [checked, setChecked] = useState<number[]>([]);
  const [token, setToken] = useState("");
  const order = data.orders.find((item) => item.id === id);
  if (!order)
    return (
      <EmptyState
        title="Delivery not found"
        description="Choose an order from the supplier console."
      >
        <ActionLink href="/supplier">Supplier console</ActionLink>
      </EmptyState>
    );
  async function load() {
    try {
      await mutate(`orders/${id}/load`, {});
      toast("Load checked. The delivery QR is ready.");
    } catch {
      /* The shared notification reports the error. */
    }
  }
  async function showQR() {
    try {
      const pass = await api<{ token: string }>(`orders/${id}/pass`);
      setToken(pass.token);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not get a delivery pass.", true);
    }
  }
  return (
    <>
      <Link href="/supplier" className="back-link">
        <ArrowLeft size={17} />
        Supplier console
      </Link>
      <PageHeading
        eyebrow={`${order.reference} · DRIVER VIEW`}
        title="A good delivery starts here."
        description={`Deliver to Khayelitsha Community Hall by ${shortDate(order.deliverBy)}.`}
      >
        <Badge status={order.status} />
      </PageHeading>
      <StageStrip
        stages={["Confirmed", "Loaded", "Delivered", "Paid"]}
        current={order.status === "Delivered" ? 3 : order.status === "Loaded" ? 1 : 0}
      />
      <div className="delivery-layout">
        <section className="panel simple-panel">
          <h2>Check your load.</h2>
          <p>Every box checked is one less thing to worry about at the door.</p>
          <div className="load-checklist">
            {order.lines.map((line, index) => (
              <label key={index}>
                <input
                  type="checkbox"
                  checked={
                    order.status === "Loaded" ||
                    order.status === "Delivered" ||
                    checked.includes(index)
                  }
                  disabled={order.status !== "Confirmed"}
                  onChange={(event) =>
                    setChecked(
                      event.target.checked
                        ? [...checked, index]
                        : checked.filter((value) => value !== index),
                    )
                  }
                />
                <span>
                  <strong>{line.name}</strong>
                  <small>
                    {line.quantity} × {line.unit}
                  </small>
                </span>
                <Package size={23} />
              </label>
            ))}
          </div>
          {order.status === "Placed" ? (
            <ActionLink href="/supplier" variant="secondary">
              Confirm stock & slot first
              <ArrowRight size={17} />
            </ActionLink>
          ) : order.status === "Confirmed" ? (
            <Button
              onClick={() => void load()}
              disabled={checked.length !== order.lines.length || pending || !ready}
            >
              All checked · mark as loaded
              <ArrowRight size={18} />
            </Button>
          ) : order.status === "Loaded" ? (
            <Button onClick={() => void showQR()} disabled={!ready}>
              <QrCode size={20} />
              Show delivery QR
            </Button>
          ) : (
            <div className="success-note">
              <CheckCircle size={24} weight="fill" />
              Delivered. Your payout is complete.
            </div>
          )}
          {token && order.status === "Loaded" ? (
            <div className="delivery-qr">
              <QRCodeSVG
                value={token}
                size={210}
                level="M"
                marginSize={2}
                title="Signed supplier delivery QR"
              />
              <h3>Let the leader scan to confirm.</h3>
              <p>
                This QR is valid for 30 minutes. The leader confirms receipt in their order view.
              </p>
              <Button
                variant="secondary"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(token)
                    .then(() => toast("Delivery token copied."))
                    .catch(() => toast("Copy is unavailable in this browser.", true))
                }
              >
                <Copy size={17} />
                Copy QR token
              </Button>
              <ActionLink href={`/orders/${id}`} variant="ghost">
                Open leader handoff
                <ArrowUpRight size={16} />
              </ActionLink>
            </div>
          ) : null}
        </section>
        <PayoutSummary order={order} />
      </div>
    </>
  );
}
