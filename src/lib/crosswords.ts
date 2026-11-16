import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { parsePuz, type Puzzle } from "./puz";

// Every .puz in this folder is published at /crosswords/<file name>, read at build time.
// Name files YYYY-MM-DD-name.puz to give a puzzle a date; the date is not part of its URL.
const DIR = path.join(process.cwd(), "src/data/crosswords");

const DATE = /^(\d{4}-\d{2}-\d{2})-/;

const stem = (file: string) => path.basename(file, path.extname(file));

const slugOf = (file: string) =>
  stem(file)
    .replace(DATE, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function listCrosswords(): Puzzle[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.toLowerCase().endsWith(".puz"))
    .map((f) => parsePuz(fs.readFileSync(path.join(DIR, f)), slugOf(f), stem(f).match(DATE)?.[1]))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function getCrossword(slug: string): Puzzle | undefined {
  return listCrosswords().find((p) => p.slug === slug);
}

/**
 * Link-preview fields for a crossword page. A page that sets neither inherits the photography
 * card from the root layout; the image itself comes from the opengraph-image.tsx beside the page.
 */
export function shareCard(title: string, description: string, url: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title: `${title} — Cutter Renowden`, description, url, siteName: "Cutter Renowden", type: "website" },
    // Title, description and image fall through from openGraph.
    twitter: { card: "summary_large_image" },
  };
}
