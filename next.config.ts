import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first for the grid; quality 90 is reserved for the expanded plate,
    // where the default 75 visibly softens fine detail.
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
  },
};

export default nextConfig;
