import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public SEO is readable without JavaScript and workspace pages stay out of search", async ({
  page,
  request,
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const publicPage = await context.newPage();
    await publicPage.goto("/about");
    await expect(publicPage.getByRole("heading", { level: 1 })).toContainText("A little each.");
    await expect(publicPage.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/about`,
    );
    await expect(publicPage.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/brand\/social-card.png$/,
    );
    await expect(publicPage.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow",
    );
    const schema = JSON.parse(
      await publicPage.locator('script[type="application/ld+json"]').innerHTML(),
    );
    expect(schema["@type"]).toBe("WebApplication");
    expect(schema.name).toBe("Pamoja");
  } finally {
    await context.close();
  }
  for (const route of [
    "/",
    "/payments",
    "/pass/private-token",
    "/join/maize?invite=private-invite",
  ]) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
    expect(await page.locator("head").innerHTML()).not.toContain("private-invite");
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/about</loc>");
  expect(sitemap).not.toMatch(/\/(pass|payments|members|join|orders)/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /pass/");
  expect(robots).toContain("Disallow: /api/");
  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  expect(await llms.text()).toContain("Payments, escrow, rebates and payouts are simulated");
  expect(await (await request.get("/llm.txt")).text()).toBe(await llms.text());
  expect((await request.get("/api/snapshot")).headers()["x-robots-tag"]).toContain("noindex");
});

test("system theme, explicit preference and browser chrome stay aligned across reloads", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute(
    "content",
    "#f3f3f1",
  );
  await page.getByRole("radio", { name: "System", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute(
    "content",
    "#142528",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /theme=dark$/);
  const installedTheme = await (await page.request.get("/manifest.webmanifest?theme=dark")).json();
  expect(installedTheme.background_color).toBe("#142528");
  expect(installedTheme.theme_color).toBe("#142528");
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
  ).toBe(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
});

test("dark views remain accessible and phone layouts fit touch devices", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  for (const route of ["/about", "/", "/join/maize", "/pickups", "/supplier", "/settings"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((issue) => ({
        id: issue.id,
        nodes: issue.nodes.map((node) => node.target),
      })),
      route,
    ).toEqual([]);
  }
  const phone = await browser.newContext({
    viewport: { width: 320, height: 740 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  try {
    const screen = await phone.newPage();
    for (const route of ["/", "/about", "/join/maize", "/settings", "/supplier"]) {
      await screen.goto(route);
      await expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await screen.evaluate(() => document.documentElement.scrollWidth),
        route,
      ).toBeLessThanOrEqual(320);
    }
  } finally {
    await phone.close();
  }
});

test("installation uses the browser prompt and falls back to accessible instructions", async ({
  page,
}) => {
  await page.goto("/about");
  await page.getByRole("button", { name: "Install Pamoja", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Install Pamoja" })).toBeVisible();
  await expect(page.getByText("iPhone or iPad:", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset.prompted = "true";
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Install Pamoja", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-prompted", "true");
  await expect(page.getByText("Pamoja is installed", { exact: true })).toBeVisible();
});

test("manifest icons, shortcuts, screenshots and worker headers are deployable", async ({
  request,
  page,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.id).toBe("/");
  expect(manifest.scope).toBe("/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual([
    "/pools",
    "/pickups",
  ]);
  expect(manifest.background_color).toBe(manifest.theme_color);
  await page.goto("/about");
  for (const asset of [...manifest.icons, ...manifest.screenshots]) {
    const expected = asset.sizes.split("x").map(Number);
    const dimensions = await page.evaluate(
      (src: string) =>
        new Promise<number[]>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
          image.onerror = reject;
          image.src = src;
        }),
      asset.src,
    );
    expect(dimensions).toEqual(expected);
  }
  const worker = await request.get("/sw.js");
  expect(worker.headers()["content-type"]).toContain("javascript");
  expect(worker.headers()["cache-control"]).toContain("no-store");
  expect(worker.headers()["service-worker-allowed"]).toBe("/");
  expect((await request.get("/brand/social-card.png")).status()).toBe(200);
});

test("a production install can reopen offline without caching private data", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.CI && process.env.PWA_TESTS !== "1",
    "Run against pnpm build + pnpm start with PWA_TESTS=1 for a real production service worker.",
  );
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.getByText("Offline launch screen ready.", { exact: false })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        }),
      );
  });
  await page.goto("/payments");
  await expect(page.locator('[data-ready="true"]')).toBeVisible();
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys
          .filter((key) => key.startsWith("pamoja-static-"))
          .map(async (key) =>
            (await (await caches.open(key)).keys()).map((item) => new URL(item.url).pathname),
          ),
      )
    ).flat();
  });
  expect(cached).toContain("/offline.html");
  expect(
    cached.some(
      (path) =>
        path.startsWith("/api/") ||
        path === "/payments" ||
        path === "/settings" ||
        path.startsWith("/pass/"),
    ),
  ).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "We’ll be back together." })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute(
    "content",
    "#142528",
  );
  expect(await page.locator("body").innerText()).not.toContain("Escrow ledger");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Held safely. Handled clearly." })).toBeVisible();
});

test("glass phone directions and the member payment journey keep dark contrast", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  async function check() {
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((issue) => ({
        id: issue.id,
        nodes: issue.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      })),
      page.url(),
    ).toEqual([]);
  }
  for (const route of [
    "/?style=glass",
    "/pools/maize?style=glass",
    "/orders?style=glass",
    "/pickups?style=glass",
    "/join/maize",
  ]) {
    await page.goto(route);
    await check();
  }
  await page.getByRole("button", { name: "Continue · $25.80", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Dark mode neighbour");
  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pay into escrow", exact: true })).toBeVisible();
  await check();
  await page.getByRole("slider", { name: "Slide to pay", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page).toHaveURL(/\/pass\//);
  await expect(page.getByRole("img", { name: "Your signed Pamoja pickup pass" })).toBeVisible();
  await check();
});
