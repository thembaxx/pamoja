# Supplied reference artboards

These are the user's fourteen uploaded photographs of the Claude canvas. Their labels identify the intended audience and direction. The black canvas, expand icons and blue selection outlines are editor chrome and are excluded from the application.

| Canvas label               | Source                         | Application                                   |
| -------------------------- | ------------------------------ | --------------------------------------------- |
| Web · Leader dashboard     | [Image](leader-dashboard.jpg)  | `/`, desktop                                  |
| Supplier · Incoming orders | [Image](supplier-console.jpg)  | `/supplier`, desktop                          |
| B · Home                   | [Image](ledger-home.jpg)       | `/`, phone                                    |
| B · Pool detail            | [Image](ledger-pool.jpg)       | `/pools/maize`, phone                         |
| B · Order                  | [Image](ledger-order.jpg)      | `/orders` or `/orders/review?poolId=…`, phone |
| B · Pickup                 | [Image](ledger-pickup.jpg)     | `/pickups`, phone                             |
| Home                       | [Image](glass-home.jpg)        | `/?style=glass`, phone                        |
| Pool detail                | [Image](glass-pool.jpg)        | `/pools/maize?style=glass`, phone             |
| Escrow & order             | [Image](glass-order.jpg)       | `/orders?style=glass`, phone                  |
| QR pickup                  | [Image](glass-pickup.jpg)      | `/pickups?style=glass`, verified bundle       |
| Member · Join pool         | [Image](member-join.jpg)       | `/join/maize`                                 |
| Member · Pay               | [Image](member-pay.jpg)        | Continue from Join pool                       |
| Member · Pass              | [Image](member-pass.jpg)       | After funding, `/pass/:id`                    |
| Supplier · Delivery        | [Image](supplier-delivery.jpg) | `/supplier/delivery/order-1042`, loaded       |

The original written specification remains in [developer-handoff.md](../developer-handoff.md). Implementation captures and explicit financial/QR/accessibility differences are documented in [design QA](../../design-qa.md).
