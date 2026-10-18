"use client";

import {
  ArrowRight,
  CaretLeft,
  Camera,
  Clock,
  QrCode,
  Scan,
  WifiSlash,
  X,
} from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { Squircle } from "@squircle-js/react";
import {
  useDesign,
  BottomNav,
  Celebrate,
  DateStrip,
  GlassCard,
  PhoneHeader,
  initials,
  productName,
  shortName,
} from "./design";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { poolMembers } from "@/lib/money";
import type { PickupPreview } from "@/lib/types";
import { useScreenWakeLock } from "@/lib/use-screen-wake-lock";
import { api, useApp } from "./provider";
import { Button, EmptyState, Modal } from "./ui";

type Detector = { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;
export function CameraScanner({
  onToken,
  onClose,
}: {
  onToken: (token: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useScreenWakeLock(!error);
  const onScan = useEffectEvent((token: string) => {
    onToken(token);
    onClose();
  });
  useEffect(() => {
    let stream: MediaStream | undefined;
    let frame = 0;
    let stopped = false;
    async function start() {
      const Constructor = (window as unknown as { BarcodeDetector?: DetectorConstructor })
        .BarcodeDetector;
      if (!Constructor || !navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera QR scanning is available in supported mobile browsers. Paste a pass token below, or try a sample pass.",
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (!ref.current) return;
        ref.current.srcObject = stream;
        await ref.current.play();
        const detector = new Constructor({ formats: ["qr_code"] });
        const detect = async () => {
          if (stopped || !ref.current) return;
          try {
            const found = await detector.detect(ref.current);
            if (found[0]) {
              onScan(found[0].rawValue);
              return;
            }
          } catch {
            /* Wait for the next complete video frame. */
          }
          frame = requestAnimationFrame(() => void detect());
        };
        void detect();
      } catch {
        setError(
          "Camera access wasn't available. Allow camera access in your browser, or paste the QR token below.",
        );
      }
    }
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  return (
    <div className="camera-view">
      <button className="icon-button" onClick={onClose} aria-label="Close camera">
        <X size={21} />
      </button>
      {error ? (
        <output className="camera-error">{error}</output>
      ) : (
        <>
          <video ref={ref} muted autoPlay playsInline aria-label="QR pickup camera" />
          <p>Hold the member’s QR inside the camera view.</p>
        </>
      )}
    </div>
  );
}
type Queued = { token: string; createdAt: string };
const QUEUE = "pamoja-pending-scans-v1";
function subscribeQueue(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("pamoja-scan-queue", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("pamoja-scan-queue", callback);
  };
}
function readQueue() {
  try {
    return localStorage.getItem(QUEUE) || "[]";
  } catch {
    return "[]";
  }
}
function emptyQueue() {
  return "[]";
}
function parseQueue(raw: string): Queued[] {
  try {
    const items: unknown = JSON.parse(raw);
    return Array.isArray(items)
      ? items
          .filter(
            (item) => item && typeof item.token === "string" && typeof item.createdAt === "string",
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
function subscribeNetwork(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
const readOffline = () => !navigator.onLine;
const serverOffline = () => false;
export function Pickups() {
  const { data, mutate, pending, ready, toast, now } = useApp();
  const { glass } = useDesign();
  const [scanner, setScanner] = useState(false);
  const [filters, setFilters] = useState(false);
  const [dateIndex, setDateIndex] = useState(0);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("All pickups");
  const [query, setQuery] = useState("");
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<PickupPreview | null>(null);
  const [camera, setCamera] = useState(false);
  const rawQueue = useSyncExternalStore(subscribeQueue, readQueue, emptyQueue);
  const queue = parseQueue(rawQueue);
  const offline = useSyncExternalStore(subscribeNetwork, readOffline, serverOffline);
  const pools = data.pools.filter((pool) => ["PickupOpen", "Settled"].includes(pool.status));
  const pool = pools.find((item) => item.id === selected) || pools[0];
  const members = pool ? poolMembers(pool.id, data.memberships) : [];
  const collected = members.filter((member) => member.redeemedAt).length;
  const filtered = (dateIndex === 0 ? members : []).filter(
    (member) =>
      (filter === "All pickups" ||
        (filter === "Waiting" ? !member.redeemedAt : !!member.redeemedAt)) &&
      member.name.toLowerCase().includes(query.toLowerCase()),
  );
  const queuedToken = queue[0]?.token;
  useEffect(() => {
    if (offline || !ready || !queuedToken) return;
    let disposed = false;
    void mutate<PickupPreview>("pickups/verify", { token: queuedToken })
      .then((result) => {
        if (disposed) return;
        setToken(queuedToken);
        setPreview(result);
        setScanner(true);
        setFilters(false);
        setCheckedItems([]);
        toast(
          result.alreadyCollected
            ? "Queued pass was already collected. No goods released."
            : "Back online. Your queued pass is verified; check the items before release.",
        );
      })
      .catch(() => {
        /* Invalid or expired queued passes remain visible for manual review. */
      });
    return () => {
      disposed = true;
    };
  }, [offline, ready, queuedToken, mutate, toast]);
  function saveQueue(next: Queued[]) {
    try {
      localStorage.setItem(QUEUE, JSON.stringify(next));
      window.dispatchEvent(new Event("pamoja-scan-queue"));
    } catch {
      toast(
        "Your browser couldn't save the offline queue. Keep the pass and try again online.",
        true,
      );
    }
  }
  function queueScan(value: string) {
    if (!queue.some((item) => item.token === value))
      saveQueue([...queue, { token: value, createdAt: new Date(now).toISOString() }].slice(-50));
    setPreview(null);
    toast("Scan queued. Goods stay unreleased until the pass is verified online.");
  }
  async function verify(value = token) {
    if (!value.trim()) return;
    setToken(value.trim());
    setCheckedItems([]);
    if (!navigator.onLine) {
      queueScan(value.trim());
      return;
    }
    try {
      const result = await mutate<PickupPreview>("pickups/verify", { token: value.trim() });
      setPreview(result);
      setScanner(true);
      setFilters(false);
      if (result.alreadyCollected)
        toast("This pass has already been collected. Nothing was released again.");
    } catch (cause) {
      setPreview(null);
      if (cause instanceof TypeError) queueScan(value.trim());
    }
  }
  async function sample(id?: string) {
    const membership = id
      ? members.find((item) => item.id === id)
      : members.find((item) => !item.redeemedAt);
    if (!membership) {
      toast("All members in this pool have collected.");
      return;
    }
    try {
      const pass = await api<{ token: string }>(`passes/${membership.id}`);
      await verify(pass.token);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Couldn't load a pass.", true);
    }
  }
  async function redeem() {
    try {
      const result = await mutate<PickupPreview>("pickups/redeem", { token });
      setPreview({ ...result, alreadyCollected: true });
      saveQueue(queue.filter((item) => item.token !== token));
      toast(
        result.alreadyCollected
          ? "Already collected. No duplicate release."
          : "Pickup complete. A little more good delivered.",
      );
    } catch {
      /* Preserve the verified item list for a retry. */
    }
  }
  const activePreview = preview;
  const items = activePreview?.items || [];
  const itemCount = items.reduce((sum, item) => sum + item.membership.quantity, 0);
  const allChecked =
    items.length > 0 && items.every((item) => checkedItems.includes(item.membership.id));
  const showScanner = glass || scanner;
  const scanControls = (
    <div className="form-stack">
      {camera ? (
        <CameraScanner onToken={(value) => void verify(value)} onClose={() => setCamera(false)} />
      ) : (
        <Button variant="dark" onClick={() => setCamera(true)} disabled={offline}>
          <Camera size={18} />
          Open camera
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={() => void sample()}
        disabled={pending || !ready || offline || !members.length}
      >
        Try a sample pass
      </Button>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void verify();
        }}
      >
        <label>
          Or paste the pickup QR token
          <textarea
            rows={3}
            placeholder="Paste a signed pickup token…"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setPreview(null);
            }}
            maxLength={2000}
          />
        </label>
        <Button variant="secondary" disabled={!token.trim() || pending || !ready} type="submit">
          {offline ? "Queue this scan" : pending ? "Verifying…" : "Verify pass"}
          <ArrowRight size={17} />
        </Button>
      </form>
      {queue.length ? (
        <div className="queued-scans">
          <strong>
            <Clock size={17} />
            {queue.length} scan{queue.length === 1 ? "" : "s"} pending verification
          </strong>
          <p>Queued scans release goods only after server verification.</p>
          <Button
            variant="secondary"
            disabled={offline || pending}
            onClick={() => void verify(queue[0].token)}
          >
            Verify next queued pass
          </Button>
          <button className="text-link" onClick={() => saveQueue([])}>
            Clear pending queue
          </button>
        </div>
      ) : null}
    </div>
  );
  return (
    <section
      className={`ref-pickups ${showScanner ? "ref-scanner-page glass-phone" : "ledger-phone"} ref-phone-page`}
    >
      {showScanner ? (
        <>
          <PhoneHeader
            glass
            title="Pickup"
            back="/"
            right={
              <button className="live-label" onClick={() => setFilters(true)}>
                <span className="live-dot" />
                {offline ? "Offline" : "Live"}
              </button>
            }
          />
          <DateStrip
            date={pool?.pickupAt || new Date(now).toISOString()}
            count={3}
            selected={dateIndex}
            onChange={setDateIndex}
          />
          <Squircle cornerRadius={27} cornerSmoothing={1} className="ref-viewfinder" data-reveal>
            <button
              className="ref-viewfinder-trigger"
              aria-label="Scan a pickup pass · Open QR scanner"
              onClick={() => setFilters(true)}
            >
              <span className="ref-scan-corners" />
              {token && activePreview ? (
                <span className="ref-viewfinder-qr">
                  <QRCodeSVG
                    value={token}
                    size={145}
                    marginSize={2}
                    fgColor="#1b3338"
                    title="Verified Pamoja pickup QR"
                  />
                </span>
              ) : (
                <span className="ref-scan-empty">
                  <Scan size={72} weight="light" />
                  <span>Scan a pickup pass</span>
                </span>
              )}
            </button>
          </Squircle>
          {activePreview ? (
            <GlassCard className="ref-verified-card">
              <div className="ref-verified-heading">
                <span className="ref-verified-badge">
                  {activePreview.alreadyCollected ? "Collected" : "Verified"}
                </span>
                <span>
                  Order #
                  {activePreview.membership.pickupBundle
                    ? "1042"
                    : activePreview.membership.id.split("-").at(-1)}
                </span>
              </div>
              <h1>{shortName(activePreview.membership.name)}</h1>
              <div className="ref-verified-items">
                {items.map((item) => (
                  <label key={item.membership.id}>
                    <input
                      type="checkbox"
                      checked={
                        activePreview.alreadyCollected || checkedItems.includes(item.membership.id)
                      }
                      disabled={activePreview.alreadyCollected}
                      onChange={(event) =>
                        setCheckedItems(
                          event.target.checked
                            ? [...checkedItems, item.membership.id]
                            : checkedItems.filter((id) => id !== item.membership.id),
                        )
                      }
                    />
                    <span>
                      {productName(item.pool)} ×{item.membership.quantity}
                    </span>
                  </label>
                ))}
              </div>
              {activePreview.alreadyCollected ? <Celebrate /> : null}
            </GlassCard>
          ) : (
            <GlassCard className="ref-scan-intro">
              <h1>Ready when you are.</h1>
              <p>Scan the member’s pass, check the items, then release their pickup.</p>
              <Button variant="secondary" onClick={() => setFilters(true)}>
                Scan QR to verify
                <QrCode size={20} />
              </Button>
            </GlassCard>
          )}
          <div className="ref-phone-footer ref-scanner-footer">
            <button
              className="ref-round-back"
              aria-label="Back to collection list"
              onClick={() => {
                setScanner(false);
                setPreview(null);
                if (glass) window.location.assign("/pickups");
              }}
            >
              <CaretLeft size={23} />
            </button>
            <Button
              disabled={
                !activePreview ||
                !allChecked ||
                activePreview.alreadyCollected ||
                pending ||
                !ready ||
                offline
              }
              onClick={() => void redeem()}
            >
              {activePreview?.alreadyCollected
                ? "Pickup collected"
                : pending
                  ? "Releasing…"
                  : `Release ${itemCount || "checked"} items`}
            </Button>
          </div>
        </>
      ) : (
        <>
          <PhoneHeader
            right={
              <span className="ref-muted">
                {new Date(
                  new Date(pool?.pickupAt || now).getUTCFullYear(),
                  new Date(pool?.pickupAt || now).getUTCMonth() - 1,
                  1,
                ).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })}{" "}
                →{" "}
                {new Date(pool?.pickupAt || now).toLocaleDateString("en-GB", {
                  month: "long",
                  timeZone: "UTC",
                })}
              </span>
            }
          />
          <div className="ref-pickup-title">
            <h1>Pickup</h1>
            <p>
              {collected} of {members.length} collected
            </p>
          </div>
          <DateStrip
            date={pool?.pickupAt || new Date(now).toISOString()}
            selected={dateIndex}
            onChange={setDateIndex}
          />
          <div className="ref-collection-list" data-reveal>
            <div className="ref-collection-group">
              <span>{pool ? productName(pool) : "Community collections"}</span>
              <button
                aria-label={`${members.length - collected} left · Filter pickups`}
                onClick={() => setFilters(true)}
              >
                {members.length - collected} left
              </button>
            </div>
            <div className="ref-collection-rows">
              {filtered.map((member) => (
                <button
                  className="ref-collection-row"
                  key={member.id}
                  onClick={() => void sample(member.id)}
                  disabled={!ready || pending}
                >
                  <span className="ref-avatar">{initials(member.name)}</span>
                  <span>{shortName(member.name)}</span>
                  <small className={member.redeemedAt ? "ref-green" : "ref-muted"}>
                    {member.redeemedAt ? "Collected" : "Waiting"}
                  </small>
                </button>
              ))}
              {!filtered.length ? (
                <EmptyState
                  title="Nothing waiting here"
                  description="Try another pool or filter."
                />
              ) : null}
            </div>
          </div>
          <div className="ref-phone-footer">
            <Button
              onClick={() => {
                setScanner(true);
                setFilters(true);
              }}
            >
              Scan QR to verify
              <QrCode size={22} />
            </Button>
          </div>
          <BottomNav />
        </>
      )}
      {offline ? (
        <p className="ref-offline-note">
          <WifiSlash size={16} />
          Offline · scans will queue
        </p>
      ) : null}
      <Modal
        open={filters}
        onClose={() => {
          setFilters(false);
          setCamera(false);
        }}
        title={showScanner ? "Scan a pickup pass" : "Find a collection"}
        description={
          showScanner
            ? "Every pass is signed, time-limited and checked by the server."
            : "Filter your collection list or scan a member’s pass."
        }
      >
        <div className="form-stack">
          {!showScanner ? (
            <>
              <label>
                Pickup pool
                <select
                  value={pool?.id || ""}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {pools.map((p) => (
                    <option key={p.id} value={p.id}>
                      {productName(p)}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="filter-tabs"
                aria-label={`${members.length - collected} left · Filter pickups`}
              >
                {["All pickups", "Waiting", "Collected"].map((value) => (
                  <button
                    key={value}
                    className={filter === value ? "selected" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <label>
                Search pickups
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a neighbour…"
                />
              </label>
              <Button onClick={() => setFilters(false)}>Show collections</Button>
            </>
          ) : null}
          {scanControls}
        </div>
      </Modal>
    </section>
  );
}
