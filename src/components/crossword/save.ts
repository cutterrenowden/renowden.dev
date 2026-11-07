// Progress lives in one cookie per puzzle, scoped to /crosswords so the rest of the site never
// carries it. Only white squares are stored: a letter, "-" for blank, "(ABC)" for a rebus.
import type { Puzzle } from "@/lib/puz";
import type { Mark, Saved } from "./game";

const FORMAT = "1";
const YEAR = 60 * 60 * 24 * 365;
const name = (slug: string) => `xw_${slug}`;

function read(cookie: string, slug: string): string[] | null {
  const key = `${name(slug)}=`;
  const raw = cookie.split("; ").find((c) => c.startsWith(key));
  if (!raw) return null;
  try {
    const parts = decodeURIComponent(raw.slice(key.length)).split("~");
    return parts[0] === FORMAT && parts.length === 6 ? parts : null;
  } catch {
    return null;
  }
}

export function save(p: Puzzle, s: Saved) {
  let fills = "";
  let marks = "";
  p.answers.forEach((x, i) => {
    if (x === null) return;
    const f = s.fills[i];
    fills += !f ? "-" : f.length === 1 ? f : `(${f})`;
    marks += s.marks[i];
  });
  const value = [FORMAT, p.version, Math.round(s.ms).toString(36), s.solved ? 1 : 0, fills, marks].join("~");
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name(p.slug)}=${encodeURIComponent(value)}; path=/crosswords; max-age=${YEAR}; samesite=lax${secure}`;
}

export function load(p: Puzzle): Saved | null {
  const parts = read(document.cookie, p.slug);
  if (!parts || parts[1] !== p.version) return null;
  const [, , ms, solved, fillText, markText] = parts;
  const cells = (fillText.match(/\([^)]*\)|./g) ?? []).map((t) => (t === "-" ? "" : t.replace(/[()]/g, "")));
  const white = p.answers.flatMap((x, i) => (x === null ? [] : [i]));
  if (cells.length !== white.length || markText.length !== white.length) return null;

  const fills = p.answers.map(() => "");
  const marks: Mark[] = p.answers.map(() => 0);
  white.forEach((i, k) => {
    fills[i] = cells[k];
    marks[i] = Math.min(3, Number(markText[k]) || 0) as Mark;
  });
  return { fills, marks, ms: parseInt(ms, 36) || 0, solved: solved === "1" };
}

/** Enough for a list of puzzles to show where each one stands. */
export function peek(cookie: string, slug: string, version: string) {
  const parts = read(cookie, slug);
  if (!parts || parts[1] !== version) return null;
  return { ms: parseInt(parts[2], 36) || 0, solved: parts[3] === "1", started: /[^-]/.test(parts[4]) };
}
