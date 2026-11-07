import fs from "node:fs";
import path from "node:path";
import { parsePuz, type Puzzle } from "./puz";

// Every .puz in this folder is published at /crosswords/<file name>, read at build time.
const DIR = path.join(process.cwd(), "src/data/crosswords");

const slugOf = (file: string) =>
  path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function listCrosswords(): Puzzle[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.toLowerCase().endsWith(".puz"))
    .map((f) => parsePuz(fs.readFileSync(path.join(DIR, f)), slugOf(f)))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getCrossword(slug: string): Puzzle | undefined {
  return listCrosswords().find((p) => p.slug === slug);
}
