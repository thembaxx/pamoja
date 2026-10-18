import type { MetadataRoute } from "next";
import { privatePaths, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/about", "/llms.txt", "/llm.txt"],
      disallow: [...privatePaths, "/*?*invite=", "/offline.html"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
