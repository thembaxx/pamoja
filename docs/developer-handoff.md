# Pamoja — Developer Handoff

_Community bulk-buying SaaS (Pinduoduo model) · 18 Oct 2026 · Design canvas: https://claude.ai/artifact/1VuEs6TDEbqrNQ9DRg2DmR_

## 1. What is being built

Community Leaders pool demand for essentials (maize, oil, toiletries). Members pay into escrow, the platform places one wholesale order, and members collect with a QR pass. “Pamoja” is a working name. One backend serves three audiences:

| Audience       | Surface                                       | Stack                         |
| -------------- | --------------------------------------------- | ----------------------------- |
| Leader (agent) | Mobile app                                    | React Native                  |
| Leader         | Web dashboard                                 | Web                           |
| Supplier       | Order console (web), delivery screen (mobile) | Web                           |
| Member         | Join, pay, pass flow                          | Mobile, RN or PWA (undecided) |

## 2. Screen inventory (canvas rows, top to bottom)

1. Leader mobile, direction A (glass): Home, Pool detail, Order, Pickup
2. Leader mobile, direction B (ledger): the same four screens
3. Leader web dashboard
4. Supplier: incoming orders console (web), delivery and QR confirm (mobile)
5. Member: Join pool, Pay into escrow, Pickup pass

## 3. Design tokens

| Token      | Value                                                  | Use                        |
| ---------- | ------------------------------------------------------ | -------------------------- |
| Ink        | #1B3338                                                | Text, dark panels, nav     |
| Mint       | #B9F8A8                                                | Primary CTA, active states |
| Ground     | #F3F3F1 (B) / gradient #F2F0EC to #D8D6D1 (A)          | Backgrounds                |
| Treemap    | #F6D474 maize, #6699CC oil, #BCAA85 rice, #82C77E soap | Demand by category         |
| Muted text | #5E6F6F                                                | Labels                     |
| Success    | #1F7A3A text, #3FBF5F live dot                         | Status                     |
| Border     | #D4D6D2                                                | Dividers (B)               |

**Type:** direction A uses Instrument Serif (numerals, titles) with Hanken Grotesk; direction B uses Schibsted Grotesk only.

**Signature components:** striped progress bar (repeating 2px stripe every 5px), category treemap, bordered date/stage strip, slide-to-confirm pill, dark “pool score” panel, live dot beside anything driven by SignalR.

**Suggested split (not decided):** glass for members, ledger for leaders and suppliers. Glass relies on backdrop blur, which is costly on low-end Android; use a plain semi-opaque fill there.

## 4. Domain model (proposed)

- **Pool:** product, supplier, closes\_at, pickup\_date, status, leader\_id
- **PoolTier:** pool\_id, min\_members, unit\_price (example: 20+ $14.20, 50+ $12.90, 100+ $11.40)
- **Membership:** pool\_id, member\_id, qty, price\_paid\_per\_unit, escrow\_hold\_id
- **EscrowHold:** amount, status (pending, held, released, refunded), provider\_ref
- **WholesaleOrder:** one per closed pool or batch, supplier\_id, lines, total, status, deliver\_by
- **PickupPass:** membership\_id, signed token, redeemed\_at, redeemed\_by
- **Payout:** supplier or leader, amount, fee, released\_at

## 5. Pool lifecycle and money

**Pool states:** Open, Closed, Ordered, Delivered, PickupOpen, Settled (or Cancelled at any point before Ordered).

**Pricing rule:** the current price is the unit price of the highest tier whose min\_members is met. Members pay at the price when they join. At close, anyone who paid more than the final tier price gets the difference back as a rebate.

**Escrow arithmetic shown in the mockups** (sample data): escrow $4,820.00 = supplier invoice $4,312.40 + service fee $120.50 + tier rebates $387.10. Supplier example: order $1,475.90, fee $36.90, payout $1,439.00.

**Release rule shown in the mockups:** the supplier is paid when the leader confirms drop-off by scanning a QR; members’ money is released against pickup.

## 6. Real-time with SignalR (proposed)

One hub, groups per pool and per leader. Joins and payments should go through REST so they stay idempotent; SignalR only broadcasts.

| Event (server to client) | Payload                                | Drives                              |
| ------------------------ | -------------------------------------- | ----------------------------------- |
| MemberJoined             | poolId, memberCount, qty, display name | Live activity, progress bars        |
| TierUnlocked             | poolId, tier, new price                | Price drop banner, rebate preview   |
| EscrowFunded             | poolId, amount                         | Escrow totals                       |
| OrderStatusChanged       | orderId, status                        | Stage strips                        |
| PickupVerified           | poolId, membershipId                   | Pickup list, “104 of 142 collected” |

Client: automatic reconnect with backoff, and fall back to polling when the connection is poor. Showing member names (“Nomsa D.”) in the feed needs member consent.

## 7. REST surface (proposed)

| Endpoint                                 | Purpose                                               |
| ---------------------------------------- | ----------------------------------------------------- |
| POST /pools, GET /pools, GET /pools/{id} | Leader creates and lists pools                        |
| POST /pools/{id}/join                    | Member joins with qty, returns payment intent         |
| POST /pools/{id}/close                   | Leader closes, triggers rebate calculation            |
| POST /orders                             | Place wholesale order from closed pools               |
| POST /orders/{id}/confirm                | Supplier confirms stock and delivery slot             |
| POST /pickups/verify                     | Agent submits scanned token, returns items to release |
| POST /orders/{id}/deliver                | Leader scans supplier QR, releases payout             |

## 8. React Native agent app notes

- Four tabs match the designs: Home, Pools, Orders, Pickup. Pool detail and Order are stack screens.
- QR pass: short-lived signed token (member, pool, expiry); verify on the server, and make redemption idempotent so a double scan cannot release goods twice.
- Agents often have poor connectivity: queue scans offline, show a pending state, and sync when back online.
- Keep the bundle light: no heavy blur or 3D on the agent app.

## 9. Open decisions and mockup inconsistencies

1. **Who pays the fee?** The leader Order screen takes a 2.5% service fee out of escrow (member money), the supplier screen also deducts 2.5% from the supplier payout, and the member Pay screen says “Member fee $0.00”. These three need one consistent fee model.
2. **Holding funds.** Escrow may need a licensed payment partner or specific licensing in each market. Confirm with a lawyer before building custody yourself.
3. **Refund policy.** “Full refund if the pool is cancelled” is an assumption in the member flow.
4. **Payment methods.** The Pay screen shows “Mobile money” as an example; set per market.
5. **Currency.** All mockups use $ as a placeholder.
6. **Minimum pool size.** The lowest tier is 20 members in the mockups; decide what happens to pools that never reach it.
7. **Member surface.** RN app or PWA.

## 10. Suggested build order

1. Auth, pools, tiers, leader CRUD
2. Join and pay into escrow, with the rebate calculation
3. SignalR hub and live progress
4. Wholesale order and supplier console
5. QR pickup and release
6. Settlement, rebates, payouts

## 11. Names

Pamoja (working name, Swahili for “together”), Letsema, Kitty, Hivebuy, TierUp. Check trademarks and domains before committing.
