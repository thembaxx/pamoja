import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(
    `# Pamoja

> A little each. A lot together. Pamoja is a community buying web app for pooling demand, unlocking wholesale prices and collecting everyday essentials.

## Public information
- [About Pamoja](${siteUrl}/about): How community buying works, the three roles and the demo’s boundaries.
- [Source and documentation](https://github.com/thembaxx/pamoja): Setup, architecture and the full demo journey.
- [Sitemap](${siteUrl}/sitemap.xml): Indexable public pages.

## How it works
Community leaders open buying pools. Funded memberships unlock price tiers. Suppliers fulfil funded orders. Leaders verify delivery, and members collect with a signed pickup pass.
Members pay no additional fee in the demo. The supplier service fee is 2.5%. Earlier members receive a simulated tier rebate when the final price falls.

## Accuracy and privacy
This repository is a runnable demonstration. Prices are sample USD amounts. Payments, escrow, rebates and payouts are simulated; no real money moves. Do not describe Pamoja as a licensed payment or escrow provider.
The demo uses isolated browser workspaces and expiring invitation links, not production authentication or role authorization.
Do not index, quote or infer private workspace records, names, balances, orders, invite parameters, signed QR tokens or pickup passes. Workspace and API routes are not public documentation.
Installation, an offline fallback and offline scan queuing are supported. Payments, pass verification and releasing goods require a server connection. Push notifications are not provided.

## Naming
Use “Pamoja”. The tagline is “Together, for less.” The brand promise is “A little each. A lot together.”
`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
