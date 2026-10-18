"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Copy,
  DownloadSimple,
  LockKey,
  Minus,
  Plus,
  ShareNetwork,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Squircle } from "@squircle-js/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { money, nextTier, poolMembers, priceFor, shortDate } from "@/lib/money";
import type { Membership } from "@/lib/types";
import { api, useApp } from "./provider";
import { Brand } from "./shell";
import { ActionLink, Button, EmptyState, LiveLabel, ProductIcon, Progress } from "./ui";

function MemberShell({ children, step }: { children: ReactNode; step: number }) {
  const { syncError } = useApp();
  return (
    <main id="main-content" className="member-world">
      <header className="member-header">
        <Brand />
        <span className="demo-badge">Demo · no real payments</span>
        <Link href="/" className="member-workspace-link">
          Leader workspace
          <ArrowRight size={16} />
        </Link>
      </header>
      <div className="member-container">
        {syncError ? (
          <div className="connection-banner" role="alert">
            {syncError}
            <button onClick={() => window.location.reload()}>Try again</button>
          </div>
        ) : null}
        <ol className="member-steps">
          {["Join a pool", "Pay securely", "Your pickup pass"].map((title, index) => (
            <li key={title} className={index <= step ? "active" : ""}>
              <span>{index < step ? <Check size={13} /> : index + 1}</span>
              {title}
            </li>
          ))}
        </ol>
        {children}
        <p className="member-bottom-note">
          <ShieldCheck size={18} />A little each. A lot together.
        </p>
      </div>
      <footer className="member-footer">
        Pamoja · Together, for less.<span>Sample market · USD</span>
      </footer>
    </main>
  );
}
function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Squircle cornerRadius={32} cornerSmoothing={1} className={`glass-card ${className}`}>
      {children}
    </Squircle>
  );
}
function SerifMoney({ amount, currency }: { amount: number; currency: string }) {
  const [whole, cents] = money(amount, currency).split(".");
  return (
    <span className="serif-money">
      {whole}
      <span>.{cents}</span>
    </span>
  );
}

export function MemberJoin({ id }: { id: string }) {
  const { data, mutate, pending, ready, toast, syncError, now } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(2);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [method, setMethod] = useState("Mobile money");
  const [slide, setSlide] = useState(0);
  const paymentLock = useRef(false);
  const pool = data.pools.find((item) => item.id === id);
  if (!pool)
    return (
      <MemberShell step={0}>
        <EmptyState
          title={ready ? "This pool couldn't be found" : "Opening your community pool…"}
          description={syncError || "Open the full invitation from your leader to join their pool."}
        >
          <ActionLink href="/">Back to Pamoja</ActionLink>
        </EmptyState>
      </MemberShell>
    );
  const count = poolMembers(id, data.memberships).length;
  const price = priceFor(pool, data.memberships);
  const next = nextTier(pool.tiers, count);
  const isOpen = pool.status === "Open" && new Date(pool.closesAt).getTime() > now;
  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const member = await mutate<Membership>(`pools/${id}/join`, {
        name: String(form.get("name")),
        quantity,
        consent: form.get("consent") === "on",
      });
      setMembership(member);
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* Keep the join details editable on an error. */
    }
  }
  async function pay() {
    if (!membership || paymentLock.current) return;
    paymentLock.current = true;
    try {
      const member = await mutate<Membership>(`payments/${membership.id}/confirm`, { method });
      toast("You're in. Your demo payment is held safely.");
      router.push(`/pass/${member.id}`);
    } catch {
      paymentLock.current = false;
      setSlide(0);
    }
  }
  return (
    <MemberShell step={step}>
      {step === 0 ? (
        <>
          <div className="member-intro">
            <p className="eyebrow">GOOD THINGS COME IN GROUPS</p>
            <h1>
              Every neighbour.
              <br />A better price.
            </h1>
            <p>You’re invited to buy with {data.groupName}.</p>
          </div>
          <GlassCard>
            <div className={`member-product category-${pool.category}`}>
              <ProductIcon category={pool.category} size={74} />
              <span>{pool.unit}</span>
              <LiveLabel>POOL OPEN</LiveLabel>
            </div>
            <div className="glass-content">
              <div className="member-product-heading">
                <div>
                  <p className="eyebrow">BUY BETTER, TOGETHER</p>
                  <h2>{pool.name}</h2>
                </div>
                <span className="glass-tag">Bulk savings</span>
              </div>
              <div className="member-price">
                <SerifMoney amount={price} currency={data.currency} />
                <span>
                  per {pool.unit}
                  <small>Current community price</small>
                </span>
              </div>
              <div className="member-pool-progress">
                <div>
                  <strong>
                    {count}
                    <span> of {next?.minMembers || count} joined</span>
                  </strong>
                  <span>
                    {next
                      ? `${money(next.price, data.currency)} at ${next.minMembers}`
                      : "Best price unlocked"}
                  </span>
                </div>
                <Progress
                  value={count}
                  max={next?.minMembers || count || 1}
                  label="Community pool members toward the next price tier"
                />
                <p>
                  {next
                    ? `${next.minMembers - count} more neighbours unlock the next price drop.`
                    : "Your community has unlocked the lowest price."}
                </p>
              </div>
              <div className="member-rebate-note">
                <ShieldCheck size={23} />
                <p>
                  If more people join, the price falls and{" "}
                  <strong>you get the difference back.</strong>
                </p>
              </div>
              <form className="member-join-form" onSubmit={(event) => void join(event)}>
                <div className="quantity-row">
                  <div>
                    <strong>How many for your home?</strong>
                    <small>{pool.unit} each</small>
                  </div>
                  <div className="quantity-stepper">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={18} />
                    </button>
                    <output aria-live="polite" aria-label="Quantity">
                      {quantity}
                    </output>
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                      disabled={quantity >= 99}
                      aria-label="Increase quantity"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
                <label>
                  Your name
                  <input
                    name="name"
                    placeholder="What should we call you?"
                    required
                    minLength={1}
                    maxLength={80}
                    autoComplete="name"
                  />
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="consent" />
                  <span>Show my first name in the community activity feed.</span>
                </label>
                <Button
                  type="submit"
                  className="full-width member-primary"
                  disabled={pending || !ready || !isOpen}
                >
                  {pending
                    ? "Joining your pool…"
                    : isOpen
                      ? `Join pool · ${money(price * quantity, data.currency)}`
                      : "This pool is closed"}
                  <ArrowRight size={20} />
                </Button>
              </form>
              <p className="member-date-note">
                Closes {shortDate(pool.closesAt)} · Pickup {shortDate(pool.pickupAt)}
              </p>
            </div>
          </GlassCard>
        </>
      ) : (
        <>
          <button className="back-link" onClick={() => setStep(0)}>
            <ArrowLeft size={17} />
            Back to your pool
          </button>
          <div className="member-intro">
            <p className="eyebrow">YOUR MONEY HAS A SAFE PLACE</p>
            <h1>
              A little in.
              <br />A lot back.
            </h1>
            <p>One secure payment. No extra member fees.</p>
          </div>
          <GlassCard className="payment-glass">
            <div className="payment-swap">
              <div>
                <p className="eyebrow">YOU PAY</p>
                <SerifMoney amount={membership?.amount || 0} currency={data.currency} />
                <span className="glass-tag">{data.currency}</span>
              </div>
              <span className="swap-divider">
                <ArrowRight size={22} />
              </span>
              <div>
                <p className="eyebrow">YOU GET</p>
                <strong className="receive-title">
                  {membership?.quantity} × {pool.name}
                </strong>
                <span className="receive-unit">
                  {pool.unit} each · pickup {shortDate(pool.pickupAt)}
                </span>
              </div>
            </div>
            <div className="glass-content">
              <fieldset className="payment-methods" aria-label="Payment method">
                {["Mobile money", "Debit card"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setMethod(item)}
                    className={method === item ? "selected" : ""}
                    aria-pressed={method === item}
                  >
                    {method === item ? <CheckCircle size={18} weight="fill" /> : null}
                    {item}
                  </button>
                ))}
              </fieldset>
              <dl className="payment-facts">
                <div>
                  <dt>Member fee</dt>
                  <dd>{money(0, data.currency)}</dd>
                </div>
                <div>
                  <dt>Tier rebates</dt>
                  <dd>Returned at pool close</dd>
                </div>
                <div>
                  <dt>If the pool is cancelled</dt>
                  <dd>Full refund</dd>
                </div>
              </dl>
              <div className="member-rebate-note">
                <LockKey size={23} />
                <p>
                  Your payment stays held until the supplier delivers. The supplier pays the service
                  fee.
                </p>
              </div>
              <div className={`slide-to-pay ${pending ? "is-paying" : ""}`}>
                <span>
                  {pending
                    ? "Confirming your place…"
                    : `Slide to pay ${money(membership?.amount || 0, data.currency)}`}
                </span>
                <span
                  className="slide-handle"
                  style={{ left: `calc(6px + ${slide} * (100% - 64px) / 100)` }}
                >
                  <ArrowRight size={22} />
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slide}
                  aria-label="Slide to confirm demo payment"
                  disabled={pending || !ready}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setSlide(value);
                    if (value === 100) void pay();
                  }}
                />
              </div>
              <button
                className="accessible-pay"
                disabled={pending || !ready}
                onClick={() => void pay()}
              >
                Or confirm demo payment
                <ArrowRight size={14} />
              </button>
              <p className="demo-payment-note">Demo payment · No money will be charged.</p>
            </div>
          </GlassCard>
        </>
      )}
    </MemberShell>
  );
}
export function MemberPass({ id }: { id: string }) {
  const { data, ready, toast, mutate } = useApp();
  const [pass, setPass] = useState<{ token: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const member = data.memberships.find((item) => item.id === id);
  const pool = data.pools.find((item) => item.id === member?.poolId);
  async function refreshPass() {
    setLoading(true);
    try {
      const next = await api<{ token: string; expiresAt: string }>(`passes/${id}`);
      setPass(next);
      setExpired(false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your pass.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    void api<{ token: string; expiresAt: string }>(`passes/${id}`)
      .then((next) => {
        if (!disposed) setPass(next);
      })
      .catch((cause) => {
        if (!disposed)
          setError(cause instanceof Error ? cause.message : "Couldn't load your pass.");
      });
    return () => {
      disposed = true;
    };
  }, [ready, id]);
  useEffect(() => {
    if (!pass) return;
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, new Date(pass.expiresAt).getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [pass]);
  if (!member || !pool)
    return (
      <MemberShell step={2}>
        <EmptyState
          title="Let's find your pickup pass"
          description="Join and fund a pool in this demo workspace to get a pickup pass."
        >
          <ActionLink href="/join/maize">Join a community pool</ActionLink>
        </EmptyState>
      </MemberShell>
    );
  const count = poolMembers(pool.id, data.memberships).length;
  const next = nextTier(pool.tiers, count);
  async function share() {
    if (!pool) return;
    try {
      const { token } = await mutate<{ token: string }>("invites", { poolId: pool.id });
      const url = `${window.location.origin}/join/${pool.id}?invite=${token}`;
      if (navigator.share)
        await navigator.share({
          title: `Buy ${pool.name} with Pamoja`,
          text: "Every neighbour brings a better price closer.",
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        toast("Invite copied. Share it with your group.");
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name !== "AbortError") toast(cause.message, true);
    }
  }
  function save() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pamoja-pickup-pass.svg";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("QR saved. Refresh your pass if it expires before collection.");
  }
  return (
    <MemberShell step={2}>
      <div className="member-intro">
        <span className="member-success-icon">
          <Check size={30} />
        </span>
        <p className="eyebrow">ONE MORE NEIGHBOUR. ONE STEP CLOSER.</p>
        <h1>You’re in, {member.name.split(" ")[0]}.</h1>
        <p>Your place is held. Keep this pass for pickup day.</p>
      </div>
      <GlassCard className="pass-card">
        <div className="pass-heading">
          <div>
            <p className="eyebrow">YOUR PICKUP PASS</p>
            <h2>{pool.name}</h2>
          </div>
          <span className="glass-tag">
            {member.redeemedAt
              ? "Collected"
              : member.status === "refunded"
                ? "Refunded"
                : member.status === "cancelled"
                  ? "Cancelled"
                  : member.status === "released"
                    ? "Ready for pickup"
                    : member.status === "held"
                      ? "Paid · held"
                      : "Awaiting payment"}
          </span>
        </div>
        <div className="pass-qr" ref={qrRef}>
          {pass && !expired ? (
            <QRCodeSVG
              value={pass.token}
              size={210}
              level="M"
              marginSize={2}
              title="Your signed Pamoja pickup pass"
            />
          ) : (
            <div className="qr-placeholder">
              <ShieldCheck size={44} />
              <span>
                {error ||
                  (expired
                    ? "Your QR has expired. Refresh it below."
                    : "Preparing your secure pass…")}
              </span>
            </div>
          )}
        </div>
        <p className="qr-instruction">
          Your community leader scans this at collection.
          <br />
          Valid for 30 minutes · Refresh whenever you need.
        </p>
        <button
          className="text-link refresh-pass"
          onClick={() => void refreshPass()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh QR pass"}
          <ArrowRight size={14} />
        </button>
        <div className="pass-perforation" />
        <dl className="pass-details">
          <div>
            <dt>Picking up</dt>
            <dd>
              {member.quantity} × {pool.unit}
            </dd>
          </div>
          <div>
            <dt>Pickup day</dt>
            <dd>{shortDate(pool.pickupAt)}</dd>
          </div>
          <div>
            <dt>Collection point</dt>
            <dd>Community hall</dd>
          </div>
          <div>
            <dt>You paid</dt>
            <dd>{money(member.amount, data.currency)}</dd>
          </div>
          {member.rebate > 0 ? (
            <div>
              <dt>Tier rebate returned</dt>
              <dd>{money(member.rebate, data.currency)}</dd>
            </div>
          ) : null}
        </dl>
        <div className="pass-actions">
          <Button variant="dark" onClick={save} disabled={!pass || expired}>
            <DownloadSimple size={18} />
            Save QR pass
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(pass?.token || "")
                .then(() => toast("Pickup token copied."))
                .catch(() => toast("Copy is unavailable in this browser.", true))
            }
            disabled={!pass || expired}
          >
            <Copy size={18} />
            Copy token
          </Button>
        </div>
      </GlassCard>
      <GlassCard className="share-card">
        <LiveLabel>YOUR COMMUNITY IS GROWING</LiveLabel>
        <div className="share-progress">
          <strong>
            {count}
            <span> / {next?.minMembers || count} joined</span>
          </strong>
          {next ? (
            <span>Next price: {money(next.price, data.currency)}</span>
          ) : (
            <span>Best price unlocked</span>
          )}
        </div>
        <Progress value={count} max={next?.minMembers || count || 1} label="Live pool growth" />
        <p>
          Know someone who’d love a better price?
          <br />
          Bring them in. Everyone wins.
        </p>
        <Button
          className="full-width member-primary"
          onClick={() => void share()}
          disabled={pool.status !== "Open"}
        >
          <ShareNetwork size={20} />
          {pool.status === "Open" ? "Share to your group" : "This pool has closed"}
        </Button>
      </GlassCard>
      <Link className="member-home-link" href="/pickups">
        Try the leader pickup view
        <ArrowRight size={16} />
      </Link>
    </MemberShell>
  );
}
