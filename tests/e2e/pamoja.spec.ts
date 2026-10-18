import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Snapshot } from "../../src/lib/types";

test("member joins, pays, supplier fulfils, leader delivers, and pickup releases once", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/join/maize");
  await page.getByLabel("Your name").fill("Amina Test");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.getByRole("button", { name: "Join pool · $38.70" })).toBeEnabled();
  await page.getByRole("button", { name: "Join pool · $38.70" }).click();
  await expect(page.getByText("YOU GET", { exact: true })).toBeVisible();
  await page.getByRole("slider", { name: "Slide to confirm demo payment" }).focus();
  await page.keyboard.press("End");
  await expect(page).toHaveURL(/\/pass\//);
  await expect(page.getByRole("heading", { name: "You’re in, Amina." })).toBeVisible();
  await expect(page.locator(".pass-qr svg")).toBeVisible();
  let snapshot: Snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  const member = snapshot.memberships.find((item) => item.name === "Amina Test")!;
  expect(member.quantity).toBe(3);
  expect(member.status).toBe("held");
  expect(
    snapshot.memberships.filter((item) => item.poolId === "maize" && item.status === "held"),
  ).toHaveLength(65);
  await page.goto("/pools/maize");
  await page.getByRole("button", { name: "Close & lock price", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close & lock price", exact: true })
    .click();
  await page.getByRole("button", { name: "Place supplier order" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  const orderId = page.url().split("/").at(-1)!;
  await page.getByRole("link", { name: "Open supplier view" }).click();
  await page.getByRole("button", { name: "Confirm stock & slot" }).click();
  await page.getByRole("link", { name: "Open driver delivery view" }).click();
  await page.locator(".load-checklist input").first().check();
  await page.getByRole("button", { name: "All checked · mark as loaded" }).click();
  await page.getByRole("button", { name: "Show delivery QR" }).click();
  await expect(page.locator(".delivery-qr > svg")).toBeVisible();
  await page.getByRole("link", { name: "Open leader handoff" }).click();
  await page.getByRole("button", { name: "Confirm drop-off", exact: true }).click();
  await page.getByRole("button", { name: "Use this order’s demo QR" }).click();
  await page.getByRole("button", { name: "Confirm drop-off & release" }).click();
  await expect(
    page.getByText("Drop-off confirmed. Members can collect their goods."),
  ).toBeVisible();
  await page.goto("/pools/maize");
  await expect(page.locator("tbody .badge").first()).toHaveText("Pickup open");
  await page.goto(`/pass/${member.id}`);
  await expect(page.getByText("Ready for pickup", { exact: true })).toBeVisible();
  const pass = (await (await page.request.get(`/api/passes/${member.id}`)).json()).data;
  await page.goto("/pickups");
  await expect(page.getByText("Workspace synced", { exact: true })).toBeVisible();
  await page.getByLabel("Pickup pool").selectOption("maize");
  await page.getByLabel("Or paste the pickup QR token").fill(pass.token);
  await page.getByRole("button", { name: "Verify pass", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pass verified" })).toBeVisible();
  await page.locator(".release-checkbox input").check();
  await page.getByRole("button", { name: "Release checked items" }).click();
  await expect(page.getByRole("heading", { name: "Already collected" })).toBeVisible();
  snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  const activityCount = snapshot.activity.length;
  const order = snapshot.orders.find((item) => item.id === orderId)!;
  expect(order.status).toBe("Delivered");
  expect(order.fee + order.payout).toBe(order.total);
  const duplicate = await page.request.post("/api/pickups/redeem", {
    data: { token: pass.token },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect((await duplicate.json()).data.alreadyCollected).toBe(true);
  const after: Snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  expect(after.activity).toHaveLength(activityCount);
  expect(after.memberships.find((item) => item.id === member.id)?.redeemedAt).toBeTruthy();
  expect(errors).toEqual([]);
});

test("a newly created pool can be shared into another browser workspace", async ({
  page,
  context,
  browser,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.getByText("Workspace synced", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New pool", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Product name").fill("Neighbourhood maize");
  await dialog.getByLabel("Pack / unit").fill("10 kg bag");
  await dialog.getByRole("button", { name: "Create pool", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Neighbourhood maize", exact: true }),
  ).toBeVisible();
  const poolId = page.url().split("/").at(-1)!;
  await page.getByRole("button", { name: "Send invite", exact: true }).click();
  await page.getByRole("button", { name: "Copy invite link" }).click();
  const link = await page
    .getByRole("textbox", { name: "Shareable demo link", exact: true })
    .inputValue();
  const invited = await browser.newContext();
  try {
    const memberPage = await invited.newPage();
    await memberPage.goto(link);
    await expect(
      memberPage.getByRole("heading", { name: "Neighbourhood maize", exact: true }),
    ).toBeVisible();
    await memberPage.getByLabel("Your name").fill("Invited Neighbour");
    await memberPage.getByRole("button", { name: /Join pool ·/ }).click();
    await memberPage.getByRole("button", { name: "Or confirm demo payment" }).click();
    await expect(memberPage).toHaveURL(/\/pass\//);
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

test("primary views meet WCAG 2.1 AA checks and fit desktop, tablet and small phones", async ({
  page,
}) => {
  for (const route of ["/", "/join/maize", "/supplier", "/pickups"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    if (route === "/join/maize")
      await expect(page.getByRole("button", { name: /Join pool ·/ })).toBeEnabled();
    else await expect(page.getByText("Workspace synced", { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const issues = results.violations.map((issue) => ({
      id: issue.id,
      nodes: issue.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    }));
    expect(issues, route).toEqual([]);
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${route} at ${width}px`,
      ).toBeLessThanOrEqual(width);
    }
  }
});

test("pool search, filtering, settings persistence and ledger export work", async ({ page }) => {
  await page.goto("/pools");
  await page.getByRole("searchbox", { name: "Search pools" }).fill("Sunflower");
  await expect(page.locator(".pool-table tbody tr")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Search pools" }).fill("");
  await page.getByRole("button", { name: "Ready to order", exact: true }).click();
  await expect(page.locator(".pool-table tbody tr")).toHaveCount(1);
  await page.goto("/settings");
  await page.getByLabel("Community name").fill("Together neighbourhood");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Workspace details saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Community name")).toHaveValue("Together neighbourhood");
  await page.goto("/payments");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ledger" }).click();
  expect((await download).suggestedFilename()).toBe("pamoja-escrow-ledger.csv");
  await page.getByRole("button", { name: "Rebates", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator(".pagination")).toContainText("13–24 of 50");
});

test("offline scans queue without release and verify after reconnect", async ({
  page,
  context,
}) => {
  await page.goto("/pickups");
  await expect(page.getByText("Workspace synced", { exact: true })).toBeVisible();
  const pass = (await (await page.request.get("/api/passes/pickup-member-24")).json()).data;
  await page.getByLabel("Or paste the pickup QR token").fill(pass.token);
  await context.setOffline(true);
  await expect(page.getByText("Offline · scans will queue", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Queue this scan" }).click();
  await expect(page.getByText("1 scan pending verification", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pass verified" })).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: "Pass verified" })).toBeVisible();
  let snapshot: Snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  expect(
    snapshot.memberships.find((member) => member.id === "pickup-member-24")?.redeemedAt,
  ).toBeNull();
  await page.locator(".release-checkbox input").check();
  await page.getByRole("button", { name: "Release checked items" }).click();
  await expect(page.getByRole("heading", { name: "Already collected" })).toBeVisible();
  await expect(page.getByText("1 scan pending verification", { exact: true })).toHaveCount(0);
  snapshot = (await (await page.request.get("/api/snapshot")).json()).data;
  expect(
    snapshot.memberships.find((member) => member.id === "pickup-member-24")?.redeemedAt,
  ).toBeTruthy();
});
