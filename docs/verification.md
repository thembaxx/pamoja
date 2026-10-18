# Verification

The verified story is: a community member joins and funds a pool, the leader locks the final price and places a funded order, the supplier confirms and loads it, the leader verifies drop-off, and the member collects once using a signed pass.

## Results

| Boundary                     | Evidence                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting and lint          | Oxfmt check and Oxlint with warnings denied pass                                                                                                          |
| TypeScript and build         | Strict TypeScript and `next build` pass on Node 24                                                                                                        |
| Domain and persistence       | 14 tests pass: pricing, fees, rebates, minimums, refunds, payment/order transitions, idempotency, rollback, isolation, invitations, signatures and expiry |
| Browser → REST → SQLite → UI | Complete order-to-pickup journey passes against the production server                                                                                     |
| Shared invites               | A custom pool created in one browser is joined and funded from a separate browser via an invite                                                           |
| API validation               | Missing sessions, forged tokens, invalid quantities, conflicting retries and unrelated origins are rejected                                               |
| Collection safety            | Duplicate delivery and pickup do not pay or release twice; offline scans stay queued until verification and explicit release                              |
| Workspace controls           | Search, filters, persisted settings, pagination and CSV download pass                                                                                     |
| Accessibility and layout     | Four representative views have zero automated WCAG 2.1 AA violations and fit 320/768/1024/1440px viewports                                                |
| Browser console              | Eight production captures report zero errors                                                                                                              |

Twelve Playwright tests cover these browser stories and the branding/PWA checks below. The browser run uses a real Chromium process, actual REST requests, persisted SQLite state and server-signed QR tokens. It does not mock the application API. The install-prompt event is simulated to exercise both prompt and manual-instruction UI paths.

The suite is available with `pnpm test:e2e`. CI runs the same checks and uses the production server after building. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for a system Chromium executable.

## Branding and PWA verification — 18 October 2026

The added story is: discover the public introduction → open the existing workspace → select a device theme → install through a supported browser → reopen offline safely → reconnect to current server data.

- `pnpm check`: formatting, lint, TypeScript and all 14 domain/storage tests pass.
- `pnpm build`: optimized Next.js 16.4.2 production build passes.
- `PWA_TESTS=1 pnpm test:e2e`: all 12 production browser tests pass, including the complete order-to-pickup flow and the existing offline scan queue.
- Public content and SEO render with JavaScript disabled. Canonical URL, Open Graph image, structured data, sitemap, robots rules, both LLM text endpoints and API indexing headers are verified.
- System preference changes, explicit overrides, reload persistence, browser theme colors, theme-specific manifest colors and matching HTML/body backgrounds are verified.
- Light and dark representative views have no automated WCAG 2.1 AA violations. Layout checks cover 320/768/1024/1440px, with an additional 320px touch/mobile context.
- Manifest icons and screenshots load at their declared dimensions. Identity, scope, shortcuts, MIME type and service-worker caching headers are checked.
- A real production worker controls navigation and reopens the branded dark offline screen after a network disconnect. Cache inspection confirms that workspace pages, APIs and pickup passes are absent. Reconnection restores the ledger from the server.
- Service-worker build fingerprints stay stable when inputs do not change. A local worker-update check confirms that the new worker waits, then activates and reloads only after “Update & reload”.

Current visual captures are in [branding](branding/README.md): [light introduction](branding/about-light.png), [dark introduction](branding/about-dark.png), [phone pools](branding/mobile-dark.png) and [offline launch](branding/offline-dark.png).

## Limits

Exact source visual comparison remains blocked because the canvas needs authentication; see [design QA](../design-qa.md). Browser camera hardware and a physical phone scan were not tested; token entry and sample-pass verification were tested. SignalR hub connectivity and real payment rails require external services and are not verified by this demo. Automated accessibility checks do not replace a manual assistive-technology review.

The new checks use Chromium; physical iOS/Android installation, OS splash-screen refresh timing and camera wake-lock behavior still require device testing. WebKit could be downloaded in this environment but could not run because the system lacks its native libraries. Offline reopening provides a public fallback, not a cached private workspace; payments and pass verification remain online. Push notifications are outside this implementation.
