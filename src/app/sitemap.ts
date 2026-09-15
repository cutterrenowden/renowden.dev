import type { MetadataRoute } from "next";

// The gallery is the site. `/` only redirects here, so it stays out of the
// sitemap rather than listing a URL that never serves a page.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://renowden.dev/photography",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
