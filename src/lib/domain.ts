import { randomUUID } from "node:crypto";
import { currentTier, poolMembers, rebateFor, supplierSettlement } from "./money";
import type { AppState, Membership, Order, PickupPreview, Pool } from "./types";

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
export function getPool(state: AppState, id: string) {
  const pool = state.pools.find((item) => item.id === id);
  if (!pool) throw new DomainError("This pool could not be found.", 404);
  return pool;
}
export function getOrder(state: AppState, id: string) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) throw new DomainError("This order could not be found.", 404);
  return order;
}
export function addActivity(
  state: AppState,
  kind: AppState["activity"][number]["kind"],
  title: string,
  description: string,
) {
  state.activity.unshift({
    id: randomUUID(),
    kind,
    title,
    description,
    createdAt: new Date().toISOString(),
  });
  state.activity = state.activity.slice(0, 60);
}
export function createPool(state: AppState, input: Omit<Pool, "id" | "status">) {
  if (state.pools.length >= 50)
    throw new DomainError("Your demo workspace has reached its 50 pool limit.");
  const tiers = [...input.tiers].sort((a, b) => a.minMembers - b.minMembers);
  if (
    !tiers.length ||
    tiers.some(
      (tier, i) =>
        tier.price <= 0 ||
        tier.minMembers <= 0 ||
        !Number.isInteger(tier.price) ||
        (i > 0 && (tier.minMembers <= tiers[i - 1].minMembers || tier.price >= tiers[i - 1].price)),
    )
  )
    throw new DomainError("Each tier must need more members and offer a lower price.");
  if (new Date(input.closesAt).getTime() <= Date.now())
    throw new DomainError("Choose a closing time in the future.");
  if (new Date(input.pickupAt).getTime() <= new Date(input.closesAt).getTime())
    throw new DomainError("Pickup must be after the pool closes.");
  const pool: Pool = { ...input, tiers, id: randomUUID(), status: "Open" };
  state.pools.unshift(pool);
  addActivity(
    state,
    "pool",
    `${pool.name} is open`,
    "Invite your neighbours to start buying together",
  );
  return pool;
}
export function joinPool(
  state: AppState,
  id: string,
  input: { name: string; quantity: number; consent: boolean },
) {
  const pool = getPool(state, id);
  if (pool.status !== "Open" || new Date(pool.closesAt).getTime() <= Date.now())
    throw new DomainError("This pool is no longer accepting members.", 409);
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 99)
    throw new DomainError("Choose between 1 and 99 items.");
  if (!input.name.trim() || input.name.length > 80)
    throw new DomainError("Enter your name (up to 80 characters).");
  if (state.memberships.length >= 1500)
    throw new DomainError("Your demo workspace has reached its membership limit.");
  const unitPrice = currentTier(pool.tiers, poolMembers(id, state.memberships).length).price;
  const membership: Membership = {
    id: randomUUID(),
    poolId: id,
    name: input.name.trim(),
    quantity: input.quantity,
    consent: input.consent,
    unitPrice,
    amount: unitPrice * input.quantity,
    status: "pending",
    rebate: 0,
    redeemedAt: null,
    createdAt: new Date().toISOString(),
  };
  state.memberships.push(membership);
  return membership;
}
export function payMembership(state: AppState, id: string) {
  const member = state.memberships.find((item) => item.id === id);
  if (!member) throw new DomainError("This payment could not be found.", 404);
  if (member.status === "held" || member.status === "released") return member;
  if (member.status === "cancelled")
    throw new DomainError("This payment intent was cancelled. No payment was taken.", 409);
  if (member.status !== "pending")
    throw new DomainError("This payment has already been refunded.", 409);
  const pool = getPool(state, member.poolId);
  if (pool.status !== "Open" || new Date(pool.closesAt).getTime() <= Date.now())
    throw new DomainError("The pool has closed. No payment was taken.", 409);
  const before = currentTier(pool.tiers, poolMembers(pool.id, state.memberships).length);
  member.status = "held";
  const count = poolMembers(pool.id, state.memberships).length;
  const after = currentTier(pool.tiers, count);
  const displayName = member.consent
    ? `${member.name.split(" ")[0]} ${member.name.split(" ").at(-1)?.[0] ?? ""}.`
    : "A neighbour";
  addActivity(
    state,
    "join",
    `${displayName} joined ${pool.name}`,
    `${member.quantity} ${member.quantity === 1 ? "item" : "items"} · payment held in demo escrow`,
  );
  if (after.price < before.price)
    addActivity(
      state,
      "tier",
      `${pool.name} unlocked a better price`,
      `${count} members · earlier members receive the difference back at close`,
    );
  return member;
}
export function closePool(state: AppState, id: string) {
  const pool = getPool(state, id);
  if (pool.status !== "Open") throw new DomainError("Only an open pool can be closed.", 409);
  const members = poolMembers(id, state.memberships);
  if (members.length < Math.min(...pool.tiers.map((t) => t.minMembers)))
    throw new DomainError(
      "The minimum tier has not been reached. Keep inviting, or cancel for a full refund.",
      409,
    );
  const price = currentTier(pool.tiers, members.length).price;
  members.forEach((member) => {
    member.rebate = rebateFor(member, price);
  });
  pool.status = "Closed";
  addActivity(
    state,
    "pool",
    `${pool.name} has closed`,
    "The final price is locked and tier rebates are calculated",
  );
  return pool;
}
export function cancelPool(state: AppState, id: string) {
  const pool = getPool(state, id);
  if (!["Open", "Closed"].includes(pool.status))
    throw new DomainError("This pool cannot be cancelled after its supplier order is placed.", 409);
  state.memberships
    .filter((item) => item.poolId === id && item.status !== "released")
    .forEach((member) => {
      member.status =
        member.status === "pending" || member.status === "cancelled" ? "cancelled" : "refunded";
      member.rebate = 0;
    });
  pool.status = "Cancelled";
  addActivity(
    state,
    "payment",
    `${pool.name} was cancelled`,
    "Paid members receive a full demo refund; unpaid joins are cancelled",
  );
  return pool;
}
export function placeOrder(state: AppState, poolId: string) {
  const pool = getPool(state, poolId);
  if (pool.status !== "Closed")
    throw new DomainError("Close a funded pool before placing its order.", 409);
  if (state.orders.some((item) => item.poolId === poolId))
    throw new DomainError("An order already exists for this pool.", 409);
  const members = poolMembers(poolId, state.memberships);
  const unitPrice = currentTier(pool.tiers, members.length).price;
  const quantity = members.reduce((sum, item) => sum + item.quantity, 0);
  const total = quantity * unitPrice;
  if (members.reduce((sum, item) => sum + item.amount - item.rebate, 0) !== total)
    throw new DomainError("The order is not fully funded.", 409);
  const order: Order = {
    id: randomUUID(),
    reference: `PO-${1042 + state.orders.length}`,
    poolId,
    name: pool.name,
    supplier: pool.supplier,
    lines: [{ name: pool.name, quantity, unitPrice, unit: pool.unit }],
    ...supplierSettlement(total),
    status: "Placed",
    slot: null,
    deliverBy: pool.pickupAt,
    paidAt: null,
    createdAt: new Date().toISOString(),
  };
  state.orders.unshift(order);
  pool.status = "Ordered";
  addActivity(
    state,
    "order",
    `${order.reference} sent to ${order.supplier}`,
    "Fully funded · money remains held until drop-off",
  );
  return order;
}
export function confirmOrder(state: AppState, id: string, slot: string) {
  const order = getOrder(state, id);
  if (order.status !== "Placed")
    throw new DomainError("This order has already been confirmed.", 409);
  if (!slot.trim()) throw new DomainError("Choose a delivery slot.");
  order.slot = slot;
  order.status = "Confirmed";
  addActivity(state, "order", `${order.reference} stock confirmed`, slot);
  return order;
}
export function loadOrder(state: AppState, id: string) {
  const order = getOrder(state, id);
  if (order.status !== "Confirmed")
    throw new DomainError("Confirm stock and a delivery slot first.", 409);
  order.status = "Loaded";
  return order;
}
export function deliverOrder(state: AppState, id: string) {
  const order = getOrder(state, id);
  if (order.status === "Delivered") return order;
  if (order.status !== "Loaded")
    throw new DomainError("The supplier must mark the order as loaded first.", 409);
  order.status = "Delivered";
  order.paidAt = new Date().toISOString();
  if (order.poolId) {
    getPool(state, order.poolId).status = "PickupOpen";
    state.memberships
      .filter((item) => item.poolId === order.poolId && item.status === "held")
      .forEach((member) => {
        member.status = "released";
      });
  }
  addActivity(
    state,
    "order",
    `${order.reference} delivered · supplier paid`,
    "Leader confirmed drop-off; payout released once",
  );
  return order;
}
export function previewPickup(state: AppState, membershipId: string): PickupPreview {
  const member = state.memberships.find((item) => item.id === membershipId);
  if (!member) throw new DomainError("This pickup pass could not be found.", 404);
  const pool = getPool(state, member.poolId);
  if (!["PickupOpen", "Settled"].includes(pool.status))
    throw new DomainError("Collection is not open for this pool yet.", 409);
  if (!["held", "released"].includes(member.status))
    throw new DomainError("This pickup has not been paid for.", 409);
  return { membership: member, pool, alreadyCollected: !!member.redeemedAt };
}
export function redeemPickup(state: AppState, id: string) {
  const preview = previewPickup(state, id);
  if (preview.alreadyCollected) return preview;
  preview.membership.redeemedAt = new Date().toISOString();
  const all = poolMembers(preview.pool.id, state.memberships);
  if (all.every((member) => !!member.redeemedAt)) preview.pool.status = "Settled";
  addActivity(
    state,
    "pickup",
    "A pickup was collected",
    `${preview.pool.name} · ${preview.membership.quantity} items released`,
  );
  return { ...preview, alreadyCollected: false };
}
export function idempotent<T>(
  state: AppState,
  key: string,
  fingerprint: string,
  action: () => T,
): T {
  const previous = state.requests[key];
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new DomainError(
        "This request key was already used for different details. Please try again.",
        409,
      );
    return previous.result as T;
  }
  if (Object.keys(state.requests).length >= 3000)
    throw new DomainError("The demo request limit has been reached. Start a new workspace.", 429);
  const result = action();
  state.requests[key] = { fingerprint, result };
  return result;
}
