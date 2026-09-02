import type { MetadataRoute } from "next";

import { absolute } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The board and the auth callback are application screens, not pages
      // worth having in an index.
      disallow: ["/auth/", "/uk/play/", "/en/play/", "/uk/profile", "/en/profile"],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}
