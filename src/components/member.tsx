"use client";

import {
  CalendarBlank,
  CaretDown,
  CaretLeft,
  Copy,
  DownloadSimple,
  Minus,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Squircle } from "@squircle-js/react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { money, nextTier, poolMembers, priceFor } from "@/lib/money";
import type { Membership } from "@/lib/types";
import {
  Celebrate,
  DisplayMoney,
  GlassCard,
  SlideConfirm,
  SwapArrow,
  closeLabel,
  dayDate,
  productName,
} from "./design";
import { api, useApp } from "./provider";
import { ThemeToggle, InstallButton } from "./device-settings";
import { ActionLink, Button, EmptyState, LiveLabel, Modal, Progress } from "./ui";

function MemberShell({ children }: { children: ReactNode }) {
  const { syncError, ready } = useApp();
  return (
    <main id="main-content" className="ref-member-world" data-ready={ready}>
      <div className="ref-member-phone glass-phone">
        {syncError ? (
          <div className="connection-banner" role="alert">
            {syncError}
            <button onClick={() => window.location.reload()}>Reconnect</button>
          </div>
        ) : null}
        {children}
      </div>
    </main>
  );
}
function MemberHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { ready, syncError } = useApp();
  return (
    <header className="phone-header glass-header">
      <button className="phone-back" onClick={onBack} aria-label="Go back">
        <CaretLeft size={22} />
      </button>
      <span className="phone-header-title">{title}</span>
      <LiveLabel paused={!ready || !!syncError}>Live</LiveLabel>
    </header>
  );
}
export function MemberJoin({ id }: { id: string }) {
  const { data, mutate, pending, ready, now } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(2);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [method, setMethod] = useState("Mobile money");
  const [details, setDetails] = useState(false);
  const pool = data.pools.find((item) => item.id === id);
  if (!pool)
    return (
      <MemberShell>
        <EmptyState
          title="Let's find your pool"
          description="Open the invitation from your community leader."
        >
          <ActionLink href="/">Back to Pamoja</ActionLink>
        </EmptyState>
      </MemberShell>
    );
  const count = poolMembers(id, data.memberships).length;
  const price = priceFor(pool, data.memberships);
  const next = nextTier(pool.tiers, count);
  const isOpen = pool.status === "Open" && new Date(pool.closesAt).getTime() > now;
  const total = price * quantity;
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
      setDetails(false);
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* Keep entered details available. */
    }
  }
  async function pay() {
    if (!membership) return;
    try {
      const member = await mutate<Membership>(`payments/${membership.id}/confirm`, { method });
      router.push(`/pass/${member.id}?celebrate=1`);
    } catch {
      /* The shared notification reports payment errors. */
    }
  }
  return (
    <MemberShell>
      <div
        key={step}
        className={`ref-member-step ${step === 1 ? "ref-member-pay" : "ref-member-join"}`}
      >
        <MemberHeader
          title={step === 0 ? "Join pool" : "Pay"}
          onBack={() => (step === 1 ? setStep(0) : router.push("/"))}
        />
        <div className="ref-member-title">
          <h1>
            {step === 0 ? (
              <>
                {pool.name},<br />
                {pool.unit}
              </>
            ) : (
              <>
                Pay into
                <br />
                escrow
              </>
            )}
          </h1>
          <p>
            {step === 0
              ? `${data.groupName} · closes ${closeLabel(pool.closesAt)}`
              : "Your money is held until the supplier delivers"}
          </p>
        </div>
        {step === 0 ? (
          <>
            <GlassCard className="ref-join-price">
              <p>Price per {pool.category === "oil" ? "unit" : "bag"}</p>
              <DisplayMoney amount={price} currency={data.currency} serif />
              <p>
                {next
                  ? `Drops to ${money(next.price, data.currency)} at ${next.minMembers} members`
                  : "Your group has unlocked the best price"}
              </p>
              <Progress
                value={count}
                max={next?.minMembers || count || 1}
                label="Pool progress toward the next price tier"
              />
              <div className="ref-progress-caption">
                <span>
                  {count} of {next?.minMembers || count} joined
                </span>
                <span>{next ? `${next.minMembers - count} to go` : "Unlocked"}</span>
              </div>
            </GlassCard>
            <GlassCard className="ref-quantity-card">
              <span>{pool.category === "oil" ? "Units" : "Bags"}</span>
              <div className="ref-stepper">
                <button
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={21} />
                </button>
                <output aria-label="Quantity" aria-live="polite" key={quantity}>
                  {quantity}
                </output>
                <button
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  disabled={quantity >= 99}
                >
                  <Plus size={21} />
                </button>
              </div>
            </GlassCard>
            <p className="ref-rebate-note">
              If more people join, the price falls and you get the difference back.
            </p>
            <div className="ref-phone-footer">
              <Button
                className="ref-pill"
                onClick={() => setDetails(true)}
                disabled={pending || !ready || !isOpen}
              >
                {isOpen ? `Continue · ${money(total, data.currency)}` : "This pool is closed"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="ref-payment-swap">
              <GlassCard className="ref-pay-amount">
                <div>
                  <span>You pay</span>
                  <label className="ref-method">
                    <span className="sr-only">Payment method</span>
                    <select value={method} onChange={(event) => setMethod(event.target.value)}>
                      <option>Mobile money</option>
                      <option>Debit card</option>
                    </select>
                    <CaretDown size={14} />
                  </label>
                </div>
                <DisplayMoney amount={membership?.amount || 0} currency={data.currency} serif />
              </GlassCard>
              <SwapArrow />
              <GlassCard className="ref-pay-receive">
                <div>
                  <span>You get</span>
                  <span>Pickup {dayDate(pool.pickupAt, true)}</span>
                </div>
                <strong>
                  {membership?.quantity} × {productName(pool)}
                </strong>
              </GlassCard>
            </div>
            <GlassCard className="ref-member-fees">
              <dl>
                <div>
                  <dt>Member fee</dt>
                  <dd>{money(0, data.currency)}</dd>
                </div>
                <div>
                  <dt>If the pool is cancelled</dt>
                  <dd>Full refund</dd>
                </div>
              </dl>
            </GlassCard>
            <div className="ref-phone-footer">
              <SlideConfirm
                label="Slide to pay"
                onConfirm={pay}
                pending={pending}
                disabled={!ready}
              />
            </div>
          </>
        )}
      </div>
      <Modal
        open={details}
        onClose={() => setDetails(false)}
        title="A name for your pickup pass"
        description="This is a demo payment. No money will be charged."
      >
        <form className="form-stack" onSubmit={(event) => void join(event)}>
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              placeholder="What should we call you?"
              required
              minLength={1}
              maxLength={80}
            />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="consent" />
            <span>Show my first name in the community activity feed.</span>
          </label>
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setDetails(false)}>
              Go back
            </Button>
            <Button disabled={pending || !ready} type="submit">
              {pending ? "Joining…" : "Continue to payment"}
            </Button>
          </div>
        </form>
      </Modal>
    </MemberShell>
  );
}

export function MemberPass({ id }: { id: string }) {
  const { data, ready, toast, mutate } = useApp();
  const params = useSearchParams();
  const [pass, setPass] = useState<{ token: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [options, setOptions] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const member = data.memberships.find((item) => item.id === id);
  const pool = data.pools.find((item) => item.id === member?.poolId);
  async function refreshPass() {
    setLoading(true);
    try {
      setPass(await api<{ token: string; expiresAt: string }>(`passes/${id}`));
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
      .then((result) => {
        if (!disposed) {
          setPass(result);
          setError("");
        }
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
      <MemberShell>
        <EmptyState
          title="Let's find your pickup pass"
          description="Join and fund a pool to get your signed pickup pass."
        >
          <ActionLink href="/join/maize">Join a pool</ActionLink>
        </EmptyState>
      </MemberShell>
    );
  const count = poolMembers(pool.id, data.memberships).length;
  const next = nextTier(pool.tiers, count);
  const paid = ["held", "released"].includes(member.status);
  const state = member.redeemedAt
    ? "Collected"
    : member.status === "refunded"
      ? "Refunded"
      : member.status === "cancelled"
        ? "Cancelled"
        : member.status === "released"
          ? "Ready for pickup"
          : paid
            ? "Paid · in escrow"
            : "Awaiting payment";
  async function share() {
    if (!pool) return;
    try {
      const { token } = await mutate<{ token: string }>("invites", { poolId: pool.id });
      const url = `${window.location.origin}/join/${pool.id}?invite=${token}`;
      if (navigator.share)
        await navigator.share({
          title: `Buy ${pool.name} with Pamoja`,
          text: "The more of us who join, the less we pay.",
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
  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function save() {
    const svg = qrRef.current?.querySelector("svg");
    if (svg) {
      download(
        new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }),
        "pamoja-pickup-pass.svg",
      );
      toast("Pickup QR saved.");
    }
  }
  function calendar() {
    if (!pool) return;
    const start = new Date(pool.pickupAt);
    const end = new Date(start.getTime() + 2 * 3600000);
    const stamp = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const escape = (s: string) =>
      s.replace(/\\/g, "\\\\").replace(/[,;]/g, "\\$&").replace(/\r?\n/g, "\\n");
    download(
      new Blob(
        [
          `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Pamoja//Pickup//EN\r\nBEGIN:VEVENT\r\nUID:${id}@pamoja\r\nDTSTAMP:${stamp(new Date())}\r\nDTSTART:${stamp(start)}\r\nDTEND:${stamp(end)}\r\nSUMMARY:${escape(`Pamoja pickup · ${pool.name}`)}\r\nLOCATION:Community hall\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
        ],
        { type: "text/calendar" },
      ),
      "pamoja-pickup.ics",
    );
    toast("Pickup added to your calendar download.");
  }
  return (
    <MemberShell>
      <div className="ref-member-pass">
        <div className="ref-pass-status">
          <span className="live-label">
            <span className="live-dot" />
            {state}
          </span>
          <LiveLabel paused={!ready}>Live</LiveLabel>
        </div>
        <div className="ref-member-title">
          <h1>{paid ? "You’re in." : state}</h1>
          <p>
            {member.redeemedAt
              ? "All collected. Thank you for buying together."
              : "Show this pass when you collect"}
          </p>
          <Celebrate active={params.get("celebrate") === "1"} />
        </div>
        <GlassCard className="ref-pickup-pass">
          <button
            className="ref-pass-qr-button"
            aria-label="Pickup pass options"
            onClick={() => setOptions(true)}
          >
            <div className="ref-pass-qr" ref={qrRef}>
              {pass && !expired && paid ? (
                <QRCodeSVG
                  value={pass.token}
                  size={156}
                  level="M"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#1b3338"
                  title="Your signed Pamoja pickup pass"
                />
              ) : (
                <div className="ref-qr-placeholder">
                  <ShieldCheck size={40} />
                  <span>{error || (expired ? "Refresh your QR" : "Preparing your pass…")}</span>
                </div>
              )}
            </div>
          </button>
          <h2>
            {dayDate(pool.pickupAt, true)} · {data.groupName}
          </h2>
          <p>
            {member.quantity} × {productName(pool)}
          </p>
        </GlassCard>
        <GlassCard className="ref-pass-progress">
          <div>
            <span>Pool progress</span>
            <span>
              {count} of {next?.minMembers || count}
            </span>
          </div>
          <Progress value={count} max={next?.minMembers || count || 1} label="Live pool progress" />
          <p>
            {next
              ? `${next.minMembers - count} more unlocks ${money(next.price, data.currency)} — share it with your group`
              : "Your group has unlocked the best price"}
          </p>
        </GlassCard>
        <div className="ref-phone-footer ref-pass-footer">
          <Squircle asChild cornerRadius={22}>
            <button
              className="ref-calendar"
              onClick={calendar}
              aria-label="Save pickup to calendar"
            >
              <CalendarBlank size={25} />
            </button>
          </Squircle>
          <Button
            className="ref-pill"
            onClick={() => void share()}
            disabled={pool.status !== "Open"}
          >
            {pool.status === "Open" ? "Share to group" : "Pool closed"}
          </Button>
        </div>
      </div>
      <Modal
        open={options}
        onClose={() => setOptions(false)}
        title="Your pickup pass"
        description="Your signed QR expires after 30 minutes. Refresh it before collection."
      >
        <div className="form-stack">
          {error ? <p role="alert">{error}</p> : null}
          <Button onClick={() => void refreshPass()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh QR pass"}
          </Button>
          <Button variant="secondary" onClick={save} disabled={!pass || expired}>
            <DownloadSimple size={18} />
            Save QR pass
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(pass?.token || "")
                .then(() => toast("Pickup token copied."))
                .catch(() => toast("Copy unavailable in this browser.", true))
            }
            disabled={!pass || expired}
          >
            <Copy size={18} />
            Copy token
          </Button>
          <div className="ref-device-tools">
            <span>Appearance</span>
            <ThemeToggle />
            <InstallButton />
          </div>
          <p>
            {state} · {money(member.amount, data.currency)} paid
            {member.rebate ? ` · ${money(member.rebate, data.currency)} rebate returned` : ""}
          </p>
        </div>
      </Modal>
    </MemberShell>
  );
}
