import { chromium } from "@playwright/test";
import { mkdir, copyFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const baseURL = process.env.PAMOJA_BASE_URL || "http://localhost:3000";
await mkdir("docs/screenshots", { recursive: true });
const errors = [];
async function create(viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ baseURL, viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(() => !document.querySelector(".live-label.paused"));
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
async function snap(page, path, name) {
  if (path) await page.goto(path);
  await page.locator('[data-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true });
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  console.log(name, JSON.stringify(metrics));
}
const desktop = await create({ width: 1280, height: 812 });
await snap(desktop.page, "/", "dashboard");
await snap(desktop.page, "/supplier", "supplier-console");
await desktop.page.setViewportSize({ width: 1440, height: 1000 });
await desktop.page.goto("/");
await desktop.page.locator('[data-ready="true"]').waitFor();
await desktop.page.evaluate(() => document.fonts.ready);
await desktop.page.screenshot({ path: "public/screenshots/desktop.png", fullPage: true });
await desktop.context.close();
const phone = await create();
await snap(phone.page, "/", "ledger-home");
await snap(phone.page, "/pools/maize", "ledger-pool");
await snap(phone.page, "/orders", "ledger-order");
await snap(phone.page, "/pickups", "ledger-pickup");
await snap(phone.page, "/?style=glass", "glass-home");
await snap(phone.page, "/pools/maize?style=glass", "glass-pool");
await snap(phone.page, "/orders?style=glass", "glass-order");
await phone.page.goto("/pickups?style=glass");
const pass = (await (await phone.page.request.get("/api/passes/pickup-member-109")).json()).data;
await phone.page.getByRole("button", { name: /Open QR scanner/ }).click();
await phone.page.getByLabel("Or paste the pickup QR token").fill(pass.token);
await phone.page.getByRole("button", { name: "Verify pass", exact: true }).click();
await phone.page.locator(".ref-verified-card").waitFor();
await phone.page.locator(".ref-verified-items input").nth(0).check();
await phone.page.locator(".ref-verified-items input").nth(1).check();
await snap(phone.page, null, "glass-pickup");
await phone.page.goto("/join/maize");
await phone.page.getByRole("button", { name: "Continue · $25.80", exact: true }).waitFor();
await snap(phone.page, null, "member-join");
await phone.page.getByRole("button", { name: "Continue · $25.80", exact: true }).click();
await phone.page.getByLabel("Your name", { exact: true }).fill("Nomsa Dlamini");
await phone.page.getByRole("button", { name: "Continue to payment", exact: true }).click();
await phone.page.getByRole("slider", { name: "Slide to pay", exact: true }).waitFor();
await snap(phone.page, null, "member-pay");
await phone.page.getByRole("slider", { name: "Slide to pay", exact: true }).focus();
await phone.page.keyboard.press("End");
await phone.page.waitForURL("**/pass/**");
await phone.page.getByRole("img", { name: "Your signed Pamoja pickup pass" }).waitFor();
await snap(phone.page, null, "member-pass");
await phone.page.request.post("/api/orders/order-1042/confirm", {
  data: { slot: "Fri 23 Oct · 09:00–11:00" },
  headers: { "Idempotency-Key": crypto.randomUUID() },
});
await phone.page.request.post("/api/orders/order-1042/load", {
  data: {},
  headers: { "Idempotency-Key": crypto.randomUUID() },
});
await snap(phone.page, "/supplier/delivery/order-1042", "supplier-delivery");
await copyFile("docs/screenshots/ledger-home.png", "public/screenshots/mobile.png");
await phone.page.emulateMedia({ colorScheme: "dark" });
await snap(phone.page, "/?style=glass", "glass-home-dark");
await phone.context.close();
await browser.close();
if (errors.length) {
  console.error(errors);
  process.exitCode = 1;
}
