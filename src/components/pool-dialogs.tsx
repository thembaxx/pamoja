"use client";

import {
  Copy,
  LinkSimple,
  Plus,
  ShareNetwork,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { money } from "@/lib/money";
import type { Pool } from "@/lib/types";
import { useApp } from "./provider";
import { Button, Modal } from "./ui";

export function NewPoolDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mutate, pending, ready, toast, data, now } = useApp();
  const router = useRouter();
  const date = (days: number) => new Date(now + days * 86400000).toISOString().slice(0, 16);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: form.get("name"),
      unit: form.get("unit"),
      category: form.get("category"),
      supplier: form.get("supplier"),
      description: form.get("description"),
      closesAt: new Date(String(form.get("closesAt"))).toISOString(),
      pickupAt: new Date(String(form.get("pickupAt"))).toISOString(),
      tiers: [0, 1, 2].map((index) => ({
        minMembers: Number(form.get(`members${index}`)),
        price: Math.round(Number(form.get(`price${index}`)) * 100),
      })),
    };
    try {
      const pool = await mutate<Pool>("pools", input);
      toast(`${pool.name} is open. Let's bring your community together.`);
      onClose();
      router.push(`/pools/${pool.id}`);
    } catch {
      /* The shared toast keeps validation errors visible without closing the form. */
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start something together."
      description="Set the product, the price tiers and a day to collect. We'll take care of the sums."
    >
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Product name
            <input
              name="name"
              placeholder="e.g. Maize meal"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label>
            Pack / unit
            <input name="unit" placeholder="e.g. 10 kg bag" required minLength={2} maxLength={40} />
          </label>
          <label>
            Category
            <select name="category">
              <option value="maize">Maize meal</option>
              <option value="oil">Sunflower oil</option>
              <option value="rice">Rice</option>
              <option value="soap">Soap & essentials</option>
            </select>
          </label>
          <label>
            Supplier
            <select name="supplier">
              <option>Market Link Wholesalers</option>
              <option>Ubuntu Wholesale</option>
            </select>
          </label>
        </div>
        <label>
          A note for your neighbours
          <textarea
            name="description"
            rows={2}
            maxLength={500}
            defaultValue="Every neighbour brings a better price closer. Join us and save on the essentials."
          />
        </label>
        <div className="field-heading">
          <strong>Unlock better prices</strong>
          <span>Price per unit · {data.currency}</span>
        </div>
        <div className="tier-form-header">
          <span>Tier</span>
          <span>Minimum members</span>
          <span>Price per unit</span>
        </div>
        {[
          { members: 20, price: 14.2 },
          { members: 50, price: 12.9 },
          { members: 100, price: 11.4 },
        ].map((tier, index) => (
          <div className="tier-form-row" key={index}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <label className="sr-only" htmlFor={`tier-members-${index}`}>
              Tier {index + 1} minimum members
            </label>
            <input
              id={`tier-members-${index}`}
              name={`members${index}`}
              type="number"
              min={1}
              max={10000}
              required
              defaultValue={tier.members}
            />
            <label className="sr-only" htmlFor={`tier-price-${index}`}>
              Tier {index + 1} unit price
            </label>
            <input
              id={`tier-price-${index}`}
              name={`price${index}`}
              type="number"
              min={0.01}
              max={100000}
              step="0.01"
              required
              defaultValue={tier.price}
            />
          </div>
        ))}
        <div className="form-grid">
          <label>
            Pool closes
            <input type="datetime-local" name="closesAt" required defaultValue={date(3)} />
          </label>
          <label>
            Pickup day
            <input type="datetime-local" name="pickupAt" required defaultValue={date(5)} />
          </label>
        </div>
        <p className="field-note">
          <ShieldCheck size={17} />A minimum tier must be reached before you can place an order.
        </p>
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending || !ready} type="submit">
            <Plus size={18} />
            {pending ? "Creating pool…" : "Create pool"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function InviteDialog({
  open,
  onClose,
  initialPool,
}: {
  open: boolean;
  onClose: () => void;
  initialPool?: string;
}) {
  const { data, mutate, pending, toast, ready } = useApp();
  const [selected, setSelected] = useState("");
  const [invite, setInvite] = useState("");
  const [generatedFor, setGeneratedFor] = useState("");
  const poolId =
    selected || initialPool || data.pools.find((pool) => pool.status === "Open")?.id || "";
  const pool = data.pools.find((item) => item.id === poolId);
  const currentLink = generatedFor === poolId ? invite : "";
  async function share() {
    if (!currentLink) return;
    try {
      if (navigator.share)
        await navigator.share({
          title: `Buy ${pool?.name || "together"} with Pamoja`,
          text: "Every neighbour brings a better price closer.",
          url: currentLink,
        });
      else {
        await navigator.clipboard.writeText(currentLink);
        toast("Invite link copied. Share it with your community.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError")
        toast("Use the shareable link above to invite your community.");
    }
  }
  async function copy() {
    try {
      let url = currentLink;
      if (!url) {
        const { token } = await mutate<{ token: string }>("invites", { poolId });
        url = `${window.location.origin}/join/${poolId}?invite=${token}`;
        setInvite(url);
        setGeneratedFor(poolId);
      }
      await navigator.clipboard.writeText(url);
      toast("Invite link copied. Better prices are a group effort.");
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError")
        toast("Copy the link from the field below.");
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Good prices deserve good company."
      description="Invite your neighbours to a pool. Every new member brings the next price drop closer."
    >
      <div className="form-stack">
        <label>
          Choose a pool
          <select value={poolId} onChange={(event) => setSelected(event.target.value)}>
            {data.pools
              .filter((item) => item.status === "Open")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.unit}
                </option>
              ))}
          </select>
        </label>
        {pool ? (
          <div className="invite-preview">
            <UsersThree size={28} />
            <strong>Let’s buy {pool.name.toLowerCase()} together.</strong>
            <p>
              Starting from {money(pool.tiers[0].price, data.currency)} per {pool.unit}. The more of
              us who join, the less we pay.
            </p>
          </div>
        ) : (
          <p>No open pools yet. Start a new pool to invite your community.</p>
        )}
        {currentLink ? (
          <label>
            Shareable demo link
            <div className="copy-field">
              <LinkSimple size={18} />
              <input
                value={currentLink}
                readOnly
                onFocus={(event) => event.target.select()}
                aria-label="Shareable demo link"
              />
            </div>
          </label>
        ) : null}
        <p className="field-note">
          This shares your sample workspace so others can try the flow. It contains no real payments
          or personal accounts.
        </p>
        <div className="modal-footer">
          <Button onClick={onClose} variant="secondary">
            Done
          </Button>
          {currentLink ? (
            <Button onClick={() => void share()} variant="secondary">
              <ShareNetwork size={18} />
              Share invite
            </Button>
          ) : null}
          <Button onClick={() => void copy()} disabled={!pool || pending || !ready}>
            <Copy size={18} />
            {pending ? "Preparing link…" : "Copy invite link"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
