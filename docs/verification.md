# Verification

The verified story is: a member joins and funds a pool, the leader locks the price and places a funded order, the supplier confirms stock and checks the load, the leader's signed QR confirms delivery, then a member collects once using a signed pickup pass.

## Results

| Boundary                        | Evidence                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting and lint             | Oxfmt check and Oxlint with warnings denied pass                                                                                                                                      |
| TypeScript and production build | Strict TypeScript and `next build` pass on Node 24                                                                                                                                    |
| Domain and persistence          | 16 tests cover pricing, fees, rebates, refunds, transitions, idempotency, rollback, isolation, invitations, signatures, expiry, bundle atomicity and reference balance reconciliation |
| Browser → REST → SQLite → UI    | Complete join, pay, close, order, confirm, load, drop-off and pickup journey                                                                                                          |
| Shared invitations              | A new pool is shared and funded from a separate browser workspace                                                                                                                     |
| API validation                  | Missing sessions, forged tokens, invalid quantities, conflicting retries and unrelated origins are rejected                                                                           |
| Collection safety               | Duplicate pickups cannot release twice; all bundle lines validate before release; offline scans queue until online verification and explicit checks                                   |
| Workspace controls              | Pool search/filters, persisted settings, pagination and CSV download                                                                                                                  |
| Accessibility                   | Nine light reference views, six existing dark views and seven glass/member dark states have zero automated WCAG 2.1 AA violations                                                     |
| Responsive layout               | Seven route/direction combinations fit 320, 390, 768, 1024 and 1440px widths; each of the twelve phone artboards fits 390×844                                                         |
| Motion and direction            | Glass navigation preserves its direction; reduced-motion disables tier animation; date selection updates collections                                                                  |
| Visual captures                 | Fourteen production captures, zero JavaScript page errors, source-to-app comparison boards                                                                                            |

Fifteen Playwright tests cover these browser stories, including the preserved branding, SEO, device theme, install and service-worker flows. Tests use Chromium, real API requests and persisted state. Contrast audits use reduced motion to measure the resting UI consistently on fast and slow runners. Separate interaction checks retain animations and verify reduced-motion behavior. The primary flow exercises keyboard slide confirmation. The bundle flow requires both checkboxes before releasing maize ×2 and oil ×1, and verifies that all bundle memberships become collected.

Run `pnpm check`, `pnpm build`, then the production server and `pnpm test:e2e`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for a system Chromium executable. CI builds and runs browser tests against the production server. Design captures can be regenerated with `node scripts/capture-design.mjs`. Run `PWA_TESTS=1 pnpm test:e2e` with port 3000 free to let Playwright start the production server and include the offline-reopen test.

The upstream brand assets, public SEO endpoints, Vercel Analytics, appearance preferences, install controls, worker update flow, safe-area support and camera wake lock are retained. PWA install screenshots now show the reference-matched dashboard.

## Limits

Source comparison now uses the uploaded photographs. [Design QA](../design-qa.md) documents the deliberate fee, data, QR and accessibility differences. Browser camera hardware and a physical phone scan were not tested; token entry and sample-pass verification were tested. SignalR hub connectivity and real payment rails need external services and remain unverified. Automated accessibility checks do not replace a manual assistive-technology review.
