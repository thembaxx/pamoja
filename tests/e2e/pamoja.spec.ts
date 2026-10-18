import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Snapshot } from "../../src/lib/types";

async function open(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator('[data-ready="true"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function join(page: Page, name: string, quantity = 2) {
  if (quantity === 3) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: /^Continue ·/ }).click();
  await page.getByRole("dialog").getByLabel("Your name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  await page.getByRole("slider", { name: "Slide to pay", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page).toHaveURL(/\/pass\//);
  await expect(page.getByRole("heading", { name: "You’re in.", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Your signed Pamoja pickup pass" })).toBeVisible();
}

test("member pays, leader orders, supplier delivers, and a pickup releases only once", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, "/join/maize");
  await join(page, "Amina Test", 3);
  let snapshot: Snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  const member = snapshot.memberships.find((item) => item.name === "Amina Test")!;
  expect(member.quantity).toBe(3);
  expect(member.status).toBe("held");
  expect(
    snapshot.memberships.filter((item) => item.poolId === "maize" && item.status === "held"),
  ).toHaveLength(65);
  await open(page, "/pools/maize");
  await page.getByRole("button", { name: /Manage pool/ }).click();
  await page.getByRole("button", { name: "Close & lock price", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close & lock price", exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders\/review/);
  await page.getByRole("button", { name: "Place wholesale order", exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+$/);
  const orderId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("link", { name: "Open supplier view" }).click();
  await page.getByRole("button", { name: "Confirm stock & slot", exact: true }).click();
  await page.getByRole("link", { name: "Open driver delivery view" }).click();
  await page.locator(".ref-load-checklist input").first().check();
  await page.getByRole("button", { name: "Mark load checked", exact: true }).click();
  await page.getByRole("button", { name: "Scan leader QR to confirm", exact: true }).click();
  await page.getByRole("button", { name: "Use this order’s demo QR", exact: true }).click();
  await page.getByRole("button", { name: "Confirm drop-off & release", exact: true }).click();
  await expect(page.getByText("Payout released", { exact: true })).toBeVisible();
  await open(page, `/pass/${member.id}`);
  await expect(page.getByText("Ready for pickup", { exact: true })).toBeVisible();
  const pass = (await (await page.request.get(`/api/passes/${member.id}`)).json()).data;
  await open(page, "/pickups?style=glass");
  await page.getByRole("button", { name: /Open QR scanner/ }).click();
  await page.getByLabel("Or paste the pickup QR token").fill(pass.token);
  await page.getByRole("button", { name: "Verify pass", exact: true }).click();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
  await page.locator(".ref-verified-items input").check();
  await page.getByRole("button", { name: "Release 3 items", exact: true }).click();
  await expect(page.getByText("Collected", { exact: true })).toBeVisible();
  snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  const events = snapshot.activity.length;
  const order = snapshot.orders.find((item) => item.id === orderId)!;
  expect(order.status).toBe("Delivered");
  expect(order.fee + order.payout).toBe(order.total);
  const duplicate = await page.request.post("/api/pickups/redeem", {
    data: { token: pass.token },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect((await duplicate.json()).data.alreadyCollected).toBe(true);
  const after: Snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  expect(after.activity).toHaveLength(events);
  expect(after.memberships.find((item) => item.id === member.id)?.redeemedAt).toBeTruthy();
  expect(errors).toEqual([]);
});

test("a new pool can be shared into another browser workspace", async ({
  page,
  context,
  browser,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "/");
  await page.getByRole("button", { name: "New pool", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Product name").fill("Neighbourhood maize");
  await dialog.getByLabel("Pack / unit").fill("10 kg bag");
  await dialog.getByRole("button", { name: "Create pool", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Neighbourhood maize/ })).toBeVisible();
  const poolId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("button", { name: /^Invite \d+ more/ }).click();
  await page.getByRole("button", { name: "Copy invite link", exact: true }).click();
  const link = await page
    .getByRole("textbox", { name: "Shareable demo link", exact: true })
    .inputValue();
  const invited = await browser.newContext();
  try {
    const memberPage = await invited.newPage();
    await open(memberPage, link);
    await expect(memberPage.getByRole("heading", { name: /Neighbourhood maize/ })).toBeVisible();
    await join(memberPage, "Invited Neighbour");
    const snapshot: Snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
    expect(
      snapshot.memberships.some(
        (member) =>
          member.poolId === poolId &&
          member.name === "Invited Neighbour" &&
          member.status === "held",
      ),
    ).toBe(true);
  } finally {
    await invited.close();
  }
});
test("API rejects unscoped requests, forged scans, invalid inputs and conflicting retries", async ({
  request,
}) => {
  expect((await request.get("/api/snapshot")).status()).toBe(401);
  expect((await request.post("/api/session", { data: {} })).status()).toBe(200);
  const key = crypto.randomUUID();
  const input = { name: "Test Neighbour", quantity: 2, consent: false };
  const first = await request.post("/api/pools/maize/join", {
    data: input,
    headers: { "Idempotency-Key": key },
  });
  const second = await request.post("/api/pools/maize/join", {
    data: input,
    headers: { "Idempotency-Key": key },
  });
  expect(first.status()).toBe(200);
  expect((await first.json()).data.id).toBe((await second.json()).data.id);
  expect(
    (
      await request.post("/api/pools/maize/join", {
        data: { ...input, quantity: 3 },
        headers: { "Idempotency-Key": key },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/pools/maize/join", {
        data: { ...input, quantity: -1 },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/pickups/verify", {
        data: { token: "forged.invalid" },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/session", {
        data: {},
        headers: { Origin: "https://unrelated.example" },
      })
    ).status(),
  ).toBe(403);
});

test("reference screens fit phone, tablet and desktop and meet WCAG 2.1 AA checks", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [route, width] of [
    ["/", 1440],
    ["/", 390],
    ["/?style=glass", 390],
    ["/join/maize", 390],
    ["/supplier", 1280],
    ["/pickups", 390],
    ["/pools/maize", 390],
    ["/pools/maize?style=glass", 390],
    ["/orders?style=glass", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await open(page, route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((issue) => ({
        id: issue.id,
        nodes: issue.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      })),
      `${route} at ${width}`,
    ).toEqual([]);
  }
  for (const route of [
    "/",
    "/?style=glass",
    "/join/maize",
    "/supplier",
    "/pickups",
    "/pools/maize",
    "/orders?style=glass",
  ]) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page, route);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${route} at ${width}px`,
      ).toBeLessThanOrEqual(width);
    }
  }
});

test("pool filters, settings and ledger exports persist", async ({ page }) => {
  await open(page, "/pools");
  await page.getByRole("searchbox", { name: "Search pools" }).fill("Cooking oil 5L");
  // Search accepts a product name, independently of its pack label.
  await page.getByRole("searchbox", { name: "Search pools" }).fill("Cooking oil");
  await expect(page.locator(".ref-pool-table tbody tr")).toHaveCount(3);
  await page.getByRole("searchbox", { name: "Search pools" }).fill("");
  await page.getByRole("button", { name: "Ready to order", exact: true }).click();
  await expect(page.locator(".ref-pool-table tbody tr")).toHaveCount(1);
  await open(page, "/settings");
  await page.getByLabel("Community name").fill("Together neighbourhood");
  await page.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(page.getByText("Workspace details saved.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Community name")).toHaveValue("Together neighbourhood");
  await open(page, "/payments");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ledger", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("pamoja-escrow-ledger.csv");
  await page.getByRole("button", { name: "Rebates", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".pagination")).toContainText("13–24 of 52");
});

test("offline scans queue without release and verify after reconnect", async ({
  page,
  context,
}) => {
  await open(page, "/pickups?style=glass");
  const pass = (await (await page.request.get("/api/passes/pickup-member-24")).json()).data;
  await page.getByRole("button", { name: /Open QR scanner/ }).click();
  await page.getByLabel("Or paste the pickup QR token").fill(pass.token);
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "Queue this scan", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Queue this scan", exact: true }).click();
  await expect(page.getByText("1 scan pending verification", { exact: true })).toBeVisible();
  await expect(page.locator(".ref-verified-card")).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
  let snapshot: Snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  expect(
    snapshot.memberships.find((member) => member.id === "pickup-member-24")?.redeemedAt,
  ).toBeNull();
  await page.locator(".ref-verified-items input").check();
  await page.getByRole("button", { name: /^Release \d+ items$/ }).click();
  await expect(page.getByText("Collected", { exact: true })).toBeVisible();
  snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  expect(
    snapshot.memberships.find((member) => member.id === "pickup-member-24")?.redeemedAt,
  ).toBeTruthy();
});

test("glass and ledger navigation retains direction and reduced motion stays still", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/?style=glass");
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(850);
  await page.getByRole("link", { name: /Maize meal 25kg/ }).click();
  await expect(page).toHaveURL(/\/pools\/maize\?style=glass/);
  await expect(page.locator(".ref-tier-column")).toHaveCount(3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const duration = await page
    .locator(".ref-tier-column")
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThanOrEqual(0.01);
  await open(page, "/");
  await page.getByRole("link", { name: "Scan pickup", exact: true }).click();
  await expect(page.locator(".ref-collection-row").first()).toContainText("Nomsa D.");
  await page.locator(".ref-date-strip > button").nth(1).click();
  await expect(page.getByText("Nothing waiting here", { exact: true })).toBeVisible();
});

test("the pictured multi-product pass releases its entire bundle once", async ({ page }) => {
  await open(page, "/pickups?style=glass");
  const pass = (await (await page.request.get("/api/passes/pickup-member-109")).json()).data;
  await page.getByRole("button", { name: /Open QR scanner/ }).click();
  await page.getByLabel("Or paste the pickup QR token").fill(pass.token);
  await page.getByRole("button", { name: "Verify pass", exact: true }).click();
  await expect(page.locator(".ref-verified-items label")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Release 3 items", exact: true })).toBeDisabled();
  await page.locator(".ref-verified-items input").nth(0).check();
  await page.locator(".ref-verified-items input").nth(1).check();
  await page.getByRole("button", { name: "Release 3 items", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pickup collected", exact: true })).toBeDisabled();
  const state: Snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  expect(
    state.memberships
      .filter((member) => member.pickupBundle === "pickup-1042")
      .every((member) => !!member.redeemedAt),
  ).toBe(true);
});
