import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the public introduction is indexable; workspace routes contain session data.
  return [{ url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 1 }];
}
