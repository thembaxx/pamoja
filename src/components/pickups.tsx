"use client";

import {
  ArrowRight,
  Camera,
  CheckCircle,
  Clock,
  QrCode,
  Scan,
  ShieldCheck,
  WifiSlash,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { poolMembers, shortDate } from "@/lib/money";
import type { PickupPreview } from "@/lib/types";
import { api, useApp } from "./provider";
import { Badge, Button, EmptyState, PageHeading, SectionHeading } from "./ui";

type Detector = { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;
function CameraScanner({
  onToken,
  onClose,
}: {
  onToken: (token: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
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
              onToken(found[0].rawValue);
              onClose();
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
  }, [onToken, onClose]);
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
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("All pickups");
  const [query, setQuery] = useState("");
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<PickupPreview | null>(null);
  const [checked, setChecked] = useState(false);
  const [camera, setCamera] = useState(false);
  const rawQueue = useSyncExternalStore(subscribeQueue, readQueue, emptyQueue);
  const queue = parseQueue(rawQueue);
  const offline = useSyncExternalStore(subscribeNetwork, readOffline, serverOffline);
  const pools = data.pools.filter((pool) => ["PickupOpen", "Settled"].includes(pool.status));
  const pool = pools.find((item) => item.id === selected) || pools[0];
  const members = pool ? poolMembers(pool.id, data.memberships) : [];
  const collected = members.filter((member) => member.redeemedAt).length;
  const filtered = members.filter(
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
        setChecked(false);
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
    setChecked(false);
    if (!navigator.onLine) {
      queueScan(value.trim());
      return;
    }
    try {
      const result = await mutate<PickupPreview>("pickups/verify", { token: value.trim() });
      setPreview(result);
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
  return (
    <>
      <PageHeading
        eyebrow="THE LAST MILE, TOGETHER"
        title="A familiar face. A verified pickup."
        description="Scan the pass, check the items, and send a neighbour home with a little more."
      >
        <span className={`pickup-day ${offline ? "is-offline" : ""}`}>
          {offline ? <WifiSlash size={18} /> : <QrCode size={18} />}{" "}
          {offline
            ? "Offline · scans will queue"
            : pool
              ? `Pickup day · ${shortDate(pool.pickupAt)}`
              : "Collection desk"}
        </span>
      </PageHeading>
      <div className="pickup-layout">
        <div className="pickup-list-column">
          <div className="pickup-summary">
            <div>
              <strong>
                {collected}
                <span> / {members.length}</span>
              </strong>
              <p>neighbours have collected</p>
            </div>
            <div>
              <span className="tiny-dot" />
              {members.length - collected} waiting
            </div>
            {pools.length ? (
              <label>
                Pickup pool
                <select
                  value={pool?.id || ""}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {pools.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="collection-toolbar">
            <div className="filter-tabs" aria-label="Filter pickups">
              {["All pickups", "Waiting", "Collected"].map((item) => (
                <button
                  key={item}
                  className={filter === item ? "selected" : ""}
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              className="search-input"
              type="search"
              placeholder="Find a neighbour…"
              aria-label="Search pickups"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <section className="panel">
            <SectionHeading title={pool?.name || "Community collections"}>
              <span className="count-label">{filtered.length} members</span>
            </SectionHeading>
            {filtered.length ? (
              <div className="table-scroll">
                <table>
                  <caption className="sr-only">Member collection status</caption>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Load pass</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <span className="member-name">
                            <span className="avatar-small">{member.name[0]}</span>
                            {member.name}
                          </span>
                        </td>
                        <td>
                          {member.quantity} × {pool?.unit}
                        </td>
                        <td>
                          <Badge status={member.redeemedAt ? "Collected" : "Waiting"} />
                        </td>
                        <td>
                          <button
                            className="row-arrow"
                            onClick={() => void sample(member.id)}
                            disabled={pending || !ready}
                            aria-label={`Load ${member.name}'s demo pickup pass`}
                          >
                            <QrCode size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Nothing waiting here"
                description="Choose another pool or filter. Pickups open after the supplier drop-off is confirmed."
              />
            )}
          </section>
        </div>
        <aside className="scanner-column">
          <section className="panel scanner-panel">
            <div className="scanner-heading">
              <span>
                <Scan size={22} />
              </span>
              <div>
                <p className="eyebrow">COLLECTION DESK</p>
                <h2>Scan. Check. Together.</h2>
              </div>
            </div>
            {camera ? (
              <CameraScanner
                onToken={(value) => void verify(value)}
                onClose={() => setCamera(false)}
              />
            ) : (
              <div className="scan-illustration">
                <QrCode size={70} weight="light" />
                <p>
                  The right goods.
                  <br />
                  The right neighbour.
                </p>
              </div>
            )}
            <div className="scanner-actions">
              <Button variant="dark" onClick={() => setCamera(true)} disabled={offline}>
                <Camera size={18} />
                Open camera
              </Button>
              <Button
                variant="secondary"
                onClick={() => void sample()}
                disabled={pending || !ready || offline || !members.length}
              >
                Try a sample pass
              </Button>
            </div>
            <form
              className="form-stack scan-form"
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
              <Button
                variant="secondary"
                disabled={!token.trim() || pending || !ready}
                type="submit"
              >
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
                <p>Queued scans never release goods without server verification.</p>
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
          </section>
          {preview ? (
            <section className="verified-panel" aria-live="polite">
              <div>
                <CheckCircle size={28} weight="fill" />
                <h2>{preview.alreadyCollected ? "Already collected" : "Pass verified"}</h2>
              </div>
              <p>
                {preview.membership.name}
                <br />
                <span>{preview.pool.name}</span>
              </p>
              <label className="release-checkbox">
                <input
                  type="checkbox"
                  checked={preview.alreadyCollected || checked}
                  disabled={preview.alreadyCollected}
                  onChange={(event) => setChecked(event.target.checked)}
                />
                <span>
                  {preview.membership.quantity} × {preview.pool.unit}
                </span>
              </label>
              {preview.alreadyCollected ? (
                <p className="collected-note">This pass cannot release goods again.</p>
              ) : (
                <Button
                  disabled={!checked || pending || !ready || offline}
                  onClick={() => void redeem()}
                >
                  {pending ? "Releasing…" : "Release checked items"}
                  <ArrowRight size={17} />
                </Button>
              )}
            </section>
          ) : (
            <p className="below-note">
              <ShieldCheck size={19} />
              Every pass is signed, time-limited and checked by the server. No pass can release
              goods twice.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
