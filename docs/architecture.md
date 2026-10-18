# Pamoja implementation

The browser uses a Next.js App Router page and a scoped REST API. Pages render an initial server snapshot and hydrate into a shared client provider. Mutations go through REST. Polling and the optional SignalR connection refresh the same server snapshot.

## REST contract

Successful responses are `{ "data": ... }`; errors are `{ "error": "A readable message" }`. All responses containing workspace state are private and uncached. Every mutation other than session initialization requires an `Idempotency-Key` containing 8–100 alphanumeric, underscore or hyphen characters. A reused key replays the initial result; using it with different details returns 409.

| Method   | Endpoint                    | Result                                                                            |
| -------- | --------------------------- | --------------------------------------------------------------------------------- |
| POST     | `/api/session`              | Create/resume demo session; optional `{ invite }` joins a shared sample workspace |
| GET      | `/api/snapshot`             | Pools, memberships, orders, activity and workspace configuration                  |
| GET/POST | `/api/pools`                | List/create pools                                                                 |
| GET      | `/api/pools/:id`            | One pool                                                                          |
| POST     | `/api/pools/:id/join`       | Pending membership/payment intent: `{ name, quantity, consent }`                  |
| POST     | `/api/payments/:id/confirm` | Simulate a funded payment; no payment provider is called                          |
| POST     | `/api/pools/:id/close`      | Lock final tier and record rebates                                                |
| POST     | `/api/pools/:id/cancel`     | Cancel before ordering and record full refunds                                    |
| POST     | `/api/orders`               | Place a fully funded order: `{ poolId }`                                          |
| POST     | `/api/orders/:id/confirm`   | Supplier confirms stock and slot: `{ slot }`                                      |
| POST     | `/api/orders/:id/load`      | Mark confirmed order loaded                                                       |
| GET      | `/api/orders/:id/pass`      | Short-lived signed leader delivery handoff token                                  |
| POST     | `/api/orders/:id/deliver`   | Verify `{ token }`, release supplier payout and open pickup                       |
| GET      | `/api/passes/:membershipId` | Short-lived signed member pickup token                                            |
| POST     | `/api/pickups/verify`       | Validate `{ token }` and return items without redeeming                           |
| POST     | `/api/pickups/redeem`       | Atomically redeem once using `{ token }`                                          |
| POST     | `/api/invites`              | Create/reuse a seven-day sample-workspace invite: `{ poolId }`                    |
| POST     | `/api/settings`             | Save `{ groupName, leaderName }`                                                  |

## State and financial invariants

`Open → Closed → Ordered → PickupOpen → Settled`. `Open` and `Closed` can transition to `Cancelled`. Supplier orders use `Placed → Confirmed → Loaded → Delivered`. Drop-off confirmation moves the pool to `PickupOpen` in the same transaction, so an intermediate delivered-but-uncollectable state is unnecessary.

All stored amounts are integer cents. The member count includes funded memberships rather than units. The current tier is the highest threshold reached; below the minimum, the base price is quoted but the pool cannot close. A member's unit price is locked when their payment intent is created. Later tier drops are returned at close.

For a closed pool:

```text
gross member payments = final wholesale invoice + member tier rebates
final wholesale invoice = supplier payout + supplier service fee
supplier service fee = round(invoice × 250 / 10000)
```

There is no additional member fee. Rebate amounts reduce held balances. An order's invoice must exactly equal funded membership amounts after rebates. The seeded Eastside order is a pre-funded imported batch preserving the artboard's $1,475.90 invoice, $36.90 supplier fee and $1,439.00 payout. `external` supplier orders belong to other communities and do not enter the leader's escrow balance. `openingEscrow` records the imported weekly opening balance; funded memberships and unpaid community orders reconcile the displayed $4,820.00. `weeklyDemand` is a separate imported weekly demand snapshot that increases with newly funded joins. `personId` allows the same person to join multiple pools while the dashboard counts 142 distinct active members.

Cancelling a pool marks funded memberships as refunded and unpaid intents as cancelled. Cancelled intents do not appear as payments or refunds in the escrow ledger, and do not count toward tiers or savings.

A membership may carry a `pickupBundle` identifying other paid memberships collected on the same pass. Verification returns every line and validates every pool before mutation. Redemption marks all remaining lines at one timestamp within the SQLite transaction. A pass for any line of the bundle resolves the same collection; it cannot release those goods again.

Delivery confirmation and member redemption are repeat-safe regardless of request key. The last collection settles a pool. Payment confirmation is also repeat-safe. Domain errors inside a SQLite transaction roll back all changes, including request replay records.

## Runtime and deployment

Node 22.13+ supplies `node:sqlite`; Node 24 LTS is recommended and used in CI. SQLite stores each demo workspace as a versioned document, plus separate invite and metadata tables. This keeps the demo's changes atomic and its deployment small. It is not a production relational financial ledger.

The data directory and secrets are ignored by Git. QR signatures are stable across restarts using a secret stored in SQLite. Configuring `PAMOJA_QR_SECRET` overrides it. Changing that value invalidates outstanding QR tokens. Restoring a database restores its default signing secret too.

Production deployment needs a persistent disk and one Node service. Use a shared database and a provider-backed settlement design before moving to multiple stateless services. No external deployment is created by this repository.

The upstream branding, `/about` metadata and discovery endpoints, device theme, install controls, service-worker update flow, offline public fallback, camera wake lock and Vercel Analytics integration are preserved. Reference layouts use the shared light/dark theme tokens; profile/device controls are inside menus and Settings so the supplied light artboards stay sparse.

## Design mapping

The leader ledger direction and supplier screens use Schibsted Grotesk, `#1B3338` ink, `#F3F3F1` ground, `#D4D6D2` borders and `#B9F8A8` CTAs. Category tiles preserve the handoff's four colors. The oil tile uses slightly darker foreground text for AA contrast. The glass leader direction (`?style=glass`) and member screens use Hanken Grotesk and Instrument Serif with the specified pearl gradient. Glass fills have a reduced-transparency fallback, and motion respects reduced-motion preferences.

Squircle.js supplies continuous corners on compact controls, category tiles and glass cards. Interface icons use Phosphor; installed app marks and the favicon retain the upstream community-knot branding. The member QR and leader delivery-handoff QR are encoded signed tokens. Real QR payloads are intentionally denser than the decorative drawings in the source.

`design.tsx` owns shared phone headers, money typography, glass squircles, date strips, stages, the slider and direction-preserving navigation. `MotionRoot` runs a one-shot IntersectionObserver reveal for on-screen sections. CSS handles route/panel transitions, tab feedback, price changes, rising tier stripes and short celebrations. `prefers-reduced-motion` disables decorative animations; sliders and keyboard confirmation remain functional.
