import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/pwa-provider";
import { siteDescription, siteName, siteTitle, siteUrl } from "@/lib/site";
import { themeBootstrap, themeColors } from "@/lib/theme";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s · Pamoja" },
  description: siteDescription,
  applicationName: siteName,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Pamoja" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/brand/social-card.png",
        width: 1200,
        height: 630,
        alt: "Pamoja. A little each. A lot together.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/brand/social-card.png"],
  },
  formatDetection: { telephone: false },
  other: { "mobile-web-app-capable": "yes" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColors.light },
    { media: "(prefers-color-scheme: dark)", color: themeColors.dark },
  ],
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <PwaProvider>{children}</PwaProvider>
        <noscript>
          <p className="noscript-note">
            Enable JavaScript to use your community workspace.{" "}
            <a href="/about">Learn about Pamoja</a>.
          </p>
        </noscript>
      </body>
    </html>
  );
}
