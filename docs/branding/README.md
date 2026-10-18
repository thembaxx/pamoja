# Pamoja brand assets

The attached reference was a grid of distinct, tactile app icons. Pamoja takes that material quality into a mint community knot on a forest-teal tile: three ribbons meeting around a shared centre. The existing name, tagline, community promise and product-category colors are retained.

- `pamoja-master.webp`: the full-bleed master artwork, generated for this direction. Preserve a square canvas; apply corner rounding in the host UI or operating system.
- `public/icons/app-192.png` and `app-512.png`: regular app icons.
- `public/icons/maskable-192.png` and `maskable-512.png`: additional padding keeps the mark inside the central maskable safe zone. Do not substitute the unpadded icons for these.
- `public/icons/apple-touch-icon.png`: opaque 180px Apple home-screen icon.
- `public/icons/favicon-32.png` and `public/favicon.ico`: compact raster favicons. `src/app/icon.svg` is a simplified vector adaptation of the knot for scalable favicon use.
- `public/brand/social-card.png`: 1200 × 630 share preview.
- `public/screenshots/`: seeded demo screenshots used by the install manifest.

The inline wordmark uses the locally bundled Schibsted Grotesk font. Instrument Serif provides the warmer editorial accent; Hanken Grotesk remains the member-flow typeface.

The page canvas is `#f3f3f1` in light mode and `#142528` in dark mode. Mint `#b9f8a8` stays the primary accent. Functional text and surfaces use semantic CSS properties, while product fills and their dark ink retain a stable contrast in both themes.

Source reference: the user-provided app-icon grid. The [web.dev theming lesson](https://web.dev/learn/design/theming) informs browser theme colors, native control color schemes and system preferences. The supplied Google share link returned an error page during implementation.
