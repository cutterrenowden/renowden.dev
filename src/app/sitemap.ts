import type { MetadataRoute } from "next";
import { listCrosswords } from "@/lib/crosswords";

// `/` is a placeholder that points at the gallery and carries the same
// canonical, so it isn't listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://renowden.dev/photography",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://renowden.dev/crosswords",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...listCrosswords().map((p) => ({
      url: `https://renowden.dev/crosswords/${p.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
