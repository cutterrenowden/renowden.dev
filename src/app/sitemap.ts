import type { MetadataRoute } from "next";

// The gallery is the site. `/` is a placeholder that points here and carries
// the same canonical, so only the gallery is listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://renowden.dev/photography",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
