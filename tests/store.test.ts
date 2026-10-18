import { strict as assert } from "node:assert";
import { test } from "node:test";
import { PamojaStore } from "../src/lib/store";

test("workspace changes persist and remain isolated from other visitors", () => {
  const store = new PamojaStore(":memory:");
  try {
    const one = store.create(),
      two = store.create();
    store.update(one, (state) => {
      state.groupName = "Our community";
    });
    assert.equal(store.read(one).groupName, "Our community");
    assert.equal(store.read(two).groupName, "Khayelitsha community");
    assert.equal("requests" in store.snapshot(one), false);
  } finally {
    store.close();
  }
});
test("a rejected mutation rolls back the entire transaction", () => {
  const store = new PamojaStore(":memory:");
  try {
    const id = store.create();
    assert.throws(
      () =>
        store.update(id, (state) => {
          state.pools.length = 0;
          throw new Error("reject");
        }),
      /reject/,
    );
    assert.equal(store.read(id).pools.length, 6);
  } finally {
    store.close();
  }
});
test("QR signatures bind the workspace, purpose, ID and expiry", () => {
  const store = new PamojaStore(":memory:");
  try {
    const id = store.create();
    const now = Date.now();
    const token = store.sign(id, "pickup-member-24", "pickup", now);
    assert.equal(store.verify(id, token, "pickup", now), "pickup-member-24");
    assert.throws(() => store.verify("someone-else", token, "pickup", now), /different workspace/);
    assert.throws(() => store.verify(id, token, "delivery", now), /different workspace or handoff/);
    assert.throws(() => store.verify(id, token, "pickup", now + 30 * 60000), /expired/);
    assert.throws(
      () => store.verify(id, `${token.slice(0, -3)}abc`, "pickup", now),
      /could not be verified/,
    );
    assert.throws(() => store.verify(id, "malformed", "pickup", now), /not valid/);
  } finally {
    store.close();
  }
});
test("an invite resolves to the intended shared sample workspace", () => {
  const store = new PamojaStore(":memory:");
  try {
    const id = store.create();
    const token = store.invite(id, "maize");
    assert.equal(store.resolveInvite(token), id);
    assert.equal(store.invite(id, "maize"), token);
    assert.throws(() => store.resolveInvite("invalid"), /expired or is not valid/);
  } finally {
    store.close();
  }
});
