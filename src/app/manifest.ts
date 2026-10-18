import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pamoja — Together, for less.",
    short_name: "Pamoja",
    description: "Community buying, better together.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F3F1",
    theme_color: "#1B3338",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
