import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  cancelPool,
  closePool,
  confirmOrder,
  createPool,
  deliverOrder,
  idempotent,
  joinPool,
  loadOrder,
  payMembership,
  placeOrder,
  previewPickup,
  redeemPickup,
} from "../src/lib/domain";
import {
  currentTier,
  money,
  moneyParts,
  poolMembers,
  rebateFor,
  supplierSettlement,
} from "../src/lib/money";
import { createSeed } from "../src/lib/seed";

test("money formats cents as South African rand", () => {
  assert.equal(money(1250, "ZAR"), "R\u00a012,50");
  assert.deepEqual(moneyParts(1250), { whole: "R\u00a012", decimal: ",", fraction: "50" });
});
test("money defaults to the demo workspace currency", () => {
  assert.equal(createSeed().currency, "USD");
  assert.equal(money(1250), "US$12,50");
});
test("tier boundaries use funded members and the highest unlocked tier", () => {
  const { tiers } = createSeed().pools[0];
  assert.equal(currentTier(tiers, 19).price, 1420);
  assert.equal(currentTier(tiers, 49).price, 1420);
  assert.equal(currentTier(tiers, 50).price, 1290);
  assert.equal(currentTier([...tiers].reverse(), 100).price, 1140);
});
test("the supplier example deducts one fee using integer cents", () => {
  assert.deepEqual(supplierSettlement(147590), { total: 147590, fee: 3690, payout: 143900 });
  assert.equal(supplierSettlement(101).fee, 3);
  const order = createSeed().orders[0];
  assert.equal(
    order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    147590,
  );
  assert.equal(order.fee + order.payout, order.total);
});
test("pending joins do not inflate membership or escrow, payment confirms only once", () => {
  const state = createSeed();
  const count = poolMembers("maize", state.memberships).length;
  const member = joinPool(state, "maize", { name: "New Neighbour", quantity: 2, consent: false });
  assert.equal(member.status, "pending");
  assert.equal(member.amount, 2580);
  assert.equal(poolMembers("maize", state.memberships).length, count);
  payMembership(state, member.id);
  assert.equal(poolMembers("maize", state.memberships).length, count + 1);
  const events = state.activity.length;
  payMembership(state, member.id);
  assert.equal(poolMembers("maize", state.memberships).length, count + 1);
  assert.equal(state.activity.length, events);
  assert.equal(state.activity[0].title, "A neighbour joined Maize meal");
});
test("joining unlocks a tier and refunds earlier unit prices at close", () => {
  const state = createSeed();
  const oil = state.pools.find((pool) => pool.id === "oil")!;
  for (let i = 0; i < 12; i++) {
    const member = joinPool(state, "oil", {
      name: `Neighbour ${i}`,
      quantity: i === 0 ? 2 : 1,
      consent: false,
    });
    payMembership(state, member.id);
  }
  assert.equal(poolMembers("oil", state.memberships).length, 50);
  assert.equal(currentTier(oil.tiers, 50).price, 860);
  assert.equal(
    state.activity.some((item) => item.kind === "tier" && item.title.includes("Sunflower")),
    true,
  );
  closePool(state, "oil");
  const members = poolMembers("oil", state.memberships);
  assert.equal(
    members.every((member) => member.rebate === rebateFor(member, 860)),
    true,
  );
  const held = members.reduce((sum, member) => sum + member.amount, 0);
  const rebates = members.reduce((sum, member) => sum + member.rebate, 0);
  const order = placeOrder(state, "oil");
  assert.equal(held, order.total + rebates);
  assert.equal(order.total, order.payout + order.fee);
  assert.throws(() => placeOrder(state, "oil"), /Close a funded pool/);
  assert.throws(() => cancelPool(state, "oil"), /cannot be cancelled/);
});
test("minimum tiers, past closing times, and quantity limits are enforced", () => {
  const state = createSeed();
  const base = state.pools[0];
  const pool = createPool(state, {
    ...base,
    name: "Small pool",
    closesAt: new Date(Date.now() + 86400000).toISOString(),
    pickupAt: new Date(Date.now() + 2 * 86400000).toISOString(),
  });
  assert.throws(() => closePool(state, pool.id), /minimum tier/);
  assert.throws(
    () => joinPool(state, pool.id, { name: "Neighbour", quantity: 0, consent: false }),
    /between 1 and 99/,
  );
  assert.throws(
    () => joinPool(state, pool.id, { name: "Neighbour", quantity: 1.5, consent: false }),
    /between 1 and 99/,
  );
  const member = joinPool(state, pool.id, { name: "Neighbour", quantity: 1, consent: false });
  pool.closesAt = new Date(Date.now() - 1).toISOString();
  assert.throws(() => payMembership(state, member.id), /No payment was taken/);
  assert.equal(member.status, "pending");
  cancelPool(state, pool.id);
  assert.equal(member.status, "cancelled");
  assert.equal(poolMembers(pool.id, state.memberships).length, 0);
  assert.throws(() => payMembership(state, member.id), /No payment was taken/);
});
test("a cancellation refunds held memberships and clears allocated rebates", () => {
  const state = createSeed();
  cancelPool(state, "rice-ready");
  assert.equal(
    state.memberships
      .filter((item) => item.poolId === "rice-ready")
      .every((item) => item.status === "refunded" && item.rebate === 0),
    true,
  );
  assert.throws(
    () => joinPool(state, "rice-ready", { name: "Neighbour", quantity: 1, consent: false }),
    /no longer accepting/,
  );
});
test("the funded order must be confirmed and loaded before payout and pickup", () => {
  const state = createSeed();
  const order = placeOrder(state, "rice-ready");
  assert.throws(() => deliverOrder(state, order.id), /mark the order as loaded/);
  assert.throws(() => loadOrder(state, order.id), /Confirm stock/);
  const membership = poolMembers("rice-ready", state.memberships)[0];
  assert.throws(() => previewPickup(state, membership.id), /not open/);
  confirmOrder(state, order.id, "09:00–11:00");
  loadOrder(state, order.id);
  deliverOrder(state, order.id);
  assert.ok(order.paidAt);
  assert.equal(state.pools.find((pool) => pool.id === "rice-ready")!.status, "PickupOpen");
  assert.equal(membership.status, "released");
  const activityCount = state.activity.length;
  deliverOrder(state, order.id);
  assert.equal(state.activity.length, activityCount);
  assert.equal(previewPickup(state, membership.id).alreadyCollected, false);
  redeemPickup(state, membership.id);
  assert.equal(previewPickup(state, membership.id).alreadyCollected, true);
});
test("repeat pickup is harmless and the last collection settles the pool", () => {
  const state = createSeed();
  const waiting = state.memberships.filter(
    (member) => member.poolId === "maize-pickup" && !member.redeemedAt,
  );
  redeemPickup(state, waiting[0].id);
  const events = state.activity.length;
  assert.equal(redeemPickup(state, waiting[0].id).alreadyCollected, true);
  assert.equal(state.activity.length, events);
  waiting.slice(1).forEach((member) => redeemPickup(state, member.id));
  assert.equal(state.pools.find((pool) => pool.id === "maize-pickup")!.status, "Settled");
});
test("idempotency replays results and rejects a reused key with a different request", () => {
  const state = createSeed();
  let calls = 0;
  assert.deepEqual(
    idempotent(state, "request-123", "same", () => {
      calls++;
      return { id: "one" };
    }),
    { id: "one" },
  );
  assert.deepEqual(
    idempotent(state, "request-123", "same", () => {
      calls++;
      return { id: "two" };
    }),
    { id: "one" },
  );
  assert.equal(calls, 1);
  assert.throws(
    () => idempotent(state, "request-123", "different", () => null),
    /different details/,
  );
});
test("price tiers must increase membership and reduce the unit price", () => {
  const state = createSeed();
  assert.throws(
    () =>
      createPool(state, {
        ...state.pools[0],
        tiers: [
          { minMembers: 20, price: 1000 },
          { minMembers: 20, price: 900 },
        ],
      }),
    /more members/,
  );
  assert.throws(
    () =>
      createPool(state, {
        ...state.pools[0],
        tiers: [
          { minMembers: 20, price: 1000 },
          { minMembers: 50, price: 1100 },
        ],
      }),
    /lower price/,
  );
});
