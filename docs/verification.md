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

Six Playwright tests cover these browser stories. The browser run uses a real Chromium process, actual REST requests, persisted SQLite state and server-signed QR tokens. It does not mock the application API.

The suite is available with `pnpm test:e2e`. CI runs the same checks and uses the production server after building. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for a system Chromium executable.

## Limits

Exact source visual comparison remains blocked because the canvas needs authentication; see [design QA](../design-qa.md). Browser camera hardware and a physical phone scan were not tested; token entry and sample-pass verification were tested. SignalR hub connectivity and real payment rails require external services and are not verified by this demo. Automated accessibility checks do not replace a manual assistive-technology review.
