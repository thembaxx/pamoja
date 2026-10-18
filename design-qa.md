# Pamoja design QA

**Final result: passed with the explicit differences below.** The fourteen uploaded artboards replace the previously inaccessible canvas as the visual source. The implementation was reviewed against cropped app bounds in those photos; editor titles, black canvas and blue selection outlines are excluded.

## Source-to-implementation comparison

[Phone comparisons](docs/screenshots/phone-comparison.jpg) · [Desktop comparisons](docs/screenshots/desktop-comparison.jpg) · [Original artboards](docs/reference-artboards/README.md) · [Glass in dark mode](docs/screenshots/glass-home-dark.png)

Phone captures use 390 × 844. Desktop captures use 1280 × 812. Every supplied phone screen fits its 844px reference viewport. The UI also adapts to 320, 768, 1024 and 1440px widths; long tables scroll within their own containers.

| Supplied artboard          | Capture                                          | Implemented state                                                               |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Web · Leader dashboard     | [Desktop](docs/screenshots/dashboard.png)        | Light sidebar, escrow, category demand, four visible pool rows and right rail   |
| Supplier · Incoming orders | [Desktop](docs/screenshots/supplier-console.png) | Four incoming orders, selected Eastside invoice, payout and date-slot selection |
| B · Home                   | [Phone](docs/screenshots/ledger-home.png)        | Tabs, six open pools, treemap, pool score and bottom navigation                 |
| B · Pool detail            | [Phone](docs/screenshots/ledger-pool.png)        | Contract facts, Details/Members/Payments tabs, tier boxes and invite CTA        |
| B · Order                  | [Phone](docs/screenshots/ledger-order.png)       | Funded escrow, real invoice/rebate breakdown, stage strip and order action      |
| B · Pickup                 | [Phone](docs/screenshots/ledger-pickup.png)      | 104/142 collected, date strip, collection list and scanner action               |
| Home                       | [Phone](docs/screenshots/glass-home.png)         | Serif escrow, glass demand card, two pool cards and pill navigation             |
| Pool detail                | [Phone](docs/screenshots/glass-pool.png)         | Serif heading, rising vertical stripe tiers, activity and close/order action    |
| Escrow & order             | [Phone](docs/screenshots/glass-order.png)        | Glass escrow-to-invoice stack, rebate breakdown and slide-to-order              |
| QR pickup                  | [Phone](docs/screenshots/glass-pickup.png)       | Verified Nomsa D. bundle, maize ×2 and oil ×1, explicit release of three items  |
| Member · Join pool         | [Phone](docs/screenshots/member-join.png)        | $12.90 price, 64/100 joined, quantity stepper and $25.80 continuation           |
| Member · Pay               | [Phone](docs/screenshots/member-pay.png)         | $25.80 payment, method selector, goods, no member fee and payment slider        |
| Member · Pass              | [Phone](docs/screenshots/member-pass.png)        | Funded pass, actual signed QR, 65/100 progress, calendar and sharing            |
| Supplier · Delivery        | [Phone](docs/screenshots/supplier-delivery.png)  | PO-0317 loaded, four line checks, $1,439 payout and leader QR handoff           |

## Visual and interaction decisions

- Both leader phone directions are implemented. Ledger is the default; `?style=glass` selects the glass direction and persists through its navigation. The profile menu and Settings link to each direction and audience.
- Layouts use the specified three self-hosted fonts, pearl gradient, dark teal, mint and four category colors. Progress and tier charts use vertical stripes. Squircle.js provides continuous corners for glass cards and compact ledger controls; glass CTAs and navigation retain the illustrated pill shapes. Interface icons are Phosphor. The existing app-icon branding, public introduction, SEO and analytics are preserved.
- Page fades, one-shot scroll reveals, panel entry, tier-bar growth, price/quantity changes, tab selection, button presses, slider tracking/return, live indicators and short success bursts provide feedback. Reduced-motion preferences disable decorative animation. Reduced-transparency preferences provide opaque glass surfaces.
- Names and optional activity consent are collected after Continue in a dialog, keeping the illustrated join screen sparse. QR tools, expiry/refresh and downloads live behind the pass itself. The calendar button produces a real calendar file.
- Pickup verification remains a server action. A bundle is validated in full, each line must be checked, and one transaction releases all goods once. Offline scans queue until server verification. Camera scanning has a signed-token fallback.

## Explicit differences from the pictures

1. **Financial data:** The handoff and photos conflict on fee basis and settlement timing. The working order review shows the selected closed pool's actual funded balance, invoice and rebate, rather than copying incompatible weekly totals. A single 2.5% fee is included in the supplier invoice; members have no added fee. The reference $1,475.90 supplier invoice, $36.90 fee and $1,439.00 payout are preserved. The leader dashboard's imported opening balance reconciles $4,820.00. Upcoming order/rebate amounts reflect actual workspace state.
2. **Release copy:** Member payment text says funds are held until supplier delivery. Tier rebates are returned at pool close. Drop-off releases the supplier payout; pickup releases goods. These follow the working lifecycle instead of the contradictory “until you collect”/“after pickup” captions.
3. **QR patterns:** Screens render actual signed, expiring QR payloads. Their denser patterns differ from the decorative drawings in the mockups.
4. **Dates and state:** Dates roll to the upcoming Friday/Saturday to keep the demo usable. Counts, prices, statuses and names update from workspace data. The pictured verified pickup is captured after actual verification, not displayed as a default unverified success state.
5. **Accessibility:** Muted text, cents and oil-tile text are slightly darker to meet contrast requirements. Controls have visible keyboard focus and names that include their visible labels. Phone tables retain contained scrolling, and entry motion is clipped to its panel bounds.

## Verification

Formatting, lint, strict TypeScript, domain/storage tests and the production build are checked with `pnpm check` and `pnpm build`. Browser verification uses real REST requests, SQLite persistence and signed tokens. See [verification](docs/verification.md) for the final run evidence and runtime limits.

`node scripts/capture-design.mjs` recreates the fourteen reference captures, a dark preview and the install screenshots against a running server. It waits for hydration and fonts and disables decorative motion for stable stills. Side-by-side boards use crops of the supplied source photos scaled to the same viewport for visual review.
