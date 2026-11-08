// Reader for Across Lite .puz files, the format most crossword editors export.
// Layout reference: https://code.google.com/archive/p/puz/wikis/FileFormat.wiki

export type Dir = "a" | "d";

export type Entry = {
  key: string;
  dir: Dir;
  num: number;
  clue: string;
  /** Row-major cell indices, in reading order. */
  cells: number[];
};

export type Puzzle = {
  slug: string;
  /** ISO date (YYYY-MM-DD), taken from the file name; empty when the name has none. */
  date: string;
  title: string;
  author: string;
  copyright: string;
  notes: string;
  width: number;
  height: number;
  /** Row-major. null is a block; otherwise the answer, several letters for a rebus square. */
  answers: (string | null)[];
  numbers: number[];
  circles: number[];
  across: Entry[];
  down: Entry[];
  /** Changes whenever the grid or answers do, so saved progress for an older version is dropped. */
  version: string;
};

export function parsePuz(bytes: Uint8Array, slug: string, date = ""): Puzzle {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  const fail = (why: string) => new Error(`${slug}.puz: ${why}`);

  if (ascii(0x02, 0x0e) !== "ACROSS&DOWN\0") throw fail("not a .puz file");
  if (view.getUint16(0x32, true) !== 0) throw fail("answers are scrambled; unlock them in your editor and export again");

  const width = bytes[0x2c];
  const height = bytes[0x2d];
  const count = view.getUint16(0x2e, true);
  const size = width * height;
  const grid = ascii(0x34, 0x34 + size);

  // Version 2 files are UTF-8; older ones are Windows-1252 (curly quotes live in 0x80–0x9F).
  const decoder = new TextDecoder(ascii(0x18, 0x1a) === "2." ? "utf-8" : "windows-1252");
  let at = 0x34 + 2 * size; // skip the solution and the blank player grid
  const text = () => {
    if (at >= bytes.length) return "";
    let end = bytes.indexOf(0, at);
    if (end < 0) end = bytes.length;
    const s = decoder.decode(bytes.subarray(at, end)).trim();
    at = end + 1;
    return s;
  };
  const title = text();
  const author = text();
  const copyright = text();
  const clues = Array.from({ length: count }, () => text());
  const notes = text();

  // Extra sections: 4-byte name, 2-byte length, 2-byte checksum, data, NUL.
  const sections = new Map<string, Uint8Array>();
  while (at + 8 <= bytes.length) {
    const length = view.getUint16(at + 4, true);
    sections.set(ascii(at, at + 4), bytes.subarray(at + 8, at + 8 + length));
    at += 8 + length + 1;
  }

  // Rebus squares: GRID holds (key + 1) per cell, RTBL maps keys to answers as " 0:HEART; 1:STAR;".
  const rebusGrid = sections.get("GRID");
  const rebus = new Map<number, string>();
  for (const part of decoder.decode(sections.get("RTBL") ?? new Uint8Array()).split(";")) {
    const m = part.match(/^\s*(\d+):(.+)$/);
    if (m) rebus.set(Number(m[1]), m[2].trim().toUpperCase());
  }
  const answers = [...grid].map((ch, i) =>
    ch === "." ? null : (rebusGrid?.[i] && rebus.get(rebusGrid[i] - 1)) || ch.toUpperCase(),
  );

  const ext = sections.get("GEXT");
  const circles = ext ? answers.flatMap((_, i) => (ext[i] & 0x80 ? [i] : [])) : [];

  // Standard numbering. Clues are stored in number order, across before down for a shared number.
  const open = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < height && c < width && answers[r * width + c] !== null;
  const numbers = answers.map(() => 0);
  const across: Entry[] = [];
  const down: Entry[] = [];
  let num = 0;
  let k = 0;
  const run = (dir: Dir, i: number): Entry => {
    const cells: number[] = [];
    for (let r = Math.floor(i / width), c = i % width; open(r, c); dir === "a" ? c++ : r++) cells.push(r * width + c);
    return { key: `${dir}${num}`, dir, num, clue: clues[k++] ?? "", cells };
  };
  for (let i = 0; i < size; i++) {
    const r = Math.floor(i / width);
    const c = i % width;
    if (!open(r, c)) continue;
    const a = !open(r, c - 1) && open(r, c + 1);
    const d = !open(r - 1, c) && open(r + 1, c);
    if (!a && !d) continue;
    numbers[i] = ++num;
    if (a) across.push(run("a", i));
    if (d) down.push(run("d", i));
  }
  if (k !== count) throw fail(`grid has ${k} entries but the file has ${count} clues`);

  const covered = new Set([...across, ...down].flatMap((e) => e.cells));
  const stray = answers.findIndex((x, i) => x !== null && !covered.has(i));
  if (stray >= 0) throw fail(`square ${stray} is not part of any entry`);

  return {
    slug,
    date,
    title: title || slug,
    author,
    copyright,
    notes,
    width,
    height,
    answers,
    numbers,
    circles,
    across,
    down,
    version: hash(`${width}x${height}:${answers.map((x) => x ?? ".").join(",")}`),
  };
}

// FNV-1a; only needs to notice edits, not resist them.
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}
