import type { MetadataRoute } from "next";
import { siteDescription, siteTitle } from "@/lib/site";
import { themeColors } from "@/lib/theme";
export default function manifest(
  theme: keyof typeof themeColors = "light",
): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteTitle,
    short_name: "Pamoja",
    description: siteDescription,
    start_url: "/",
    scope: "/",
    lang: "en",
    dir: "ltr",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: themeColors[theme],
    theme_color: themeColors[theme],
    categories: ["shopping", "finance", "social"],
    icons: [
      { src: "/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Browse community pools",
        short_name: "Pools",
        url: "/pools",
        icons: [{ src: "/icons/app-192.png", sizes: "192x192" }],
      },
      {
        name: "Open collection desk",
        short_name: "Pickups",
        url: "/pickups",
        icons: [{ src: "/icons/app-192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1440x1000",
        type: "image/png",
        form_factor: "wide",
        label: "Pamoja community dashboard",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "Community pools on your phone",
      },
    ],
  };
}
