// Solver state and every rule for moving, typing, checking and revealing. Pure, so it runs the same
// in the reducer and in tests.
import type { Dir, Entry, Puzzle } from "@/lib/puz";

export const MARK = { none: 0, wrong: 1, right: 2, shown: 3 } as const;
export type Mark = (typeof MARK)[keyof typeof MARK];
export type Scope = "cell" | "word" | "puzzle";
type Sel = { i: number; dir: Dir };

/** What survives a reload. */
export type Saved = { fills: string[]; marks: Mark[]; ms: number; solved: boolean };

/** A one-time notice: the puzzle was just solved, or the grid just filled up with a mistake in it. */
export type Flash = "solved" | "wrong" | null;

export type State = Saved & {
  sel: Sel;
  rebus: boolean;
  running: boolean;
  flash: Flash;
};

export type Action =
  | { type: "run"; on: boolean }
  | { type: "tick"; ms: number }
  | { type: "reset" }
  | { type: "select"; i: number }
  | { type: "entry"; key: string }
  | { type: "turn" }
  | { type: "arrow"; dir: Dir; step: 1 | -1 }
  | { type: "jump"; step: 1 | -1; skip: boolean }
  | { type: "letter"; ch: string }
  | { type: "back" }
  | { type: "del" }
  | { type: "rebus" }
  | { type: "check" | "reveal"; scope: Scope }
  | { type: "clear" }
  | { type: "dismiss" };

export type Geometry = {
  of: { a?: Entry; d?: Entry }[];
  ents: Entry[];
  white: number[];
  byKey: Map<string, Entry>;
};

export function geometry(p: Puzzle): Geometry {
  const of: Geometry["of"] = p.answers.map(() => ({}));
  const ents = [...p.across, ...p.down];
  for (const e of ents) for (const i of e.cells) of[i][e.dir] = e;
  return {
    of,
    ents,
    white: p.answers.flatMap((x, i) => (x === null ? [] : [i])),
    byKey: new Map(ents.map((e) => [e.key, e])),
  };
}

export const other = (d: Dir): Dir => (d === "a" ? "d" : "a");

export function fmt(ms: number): string {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function initial(p: Puzzle, g: Geometry, saved: Saved | null): State {
  const first = g.ents[0];
  return {
    fills: saved?.fills ?? p.answers.map(() => ""),
    marks: saved?.marks ?? p.answers.map(() => MARK.none),
    ms: saved?.ms ?? 0,
    solved: saved?.solved ?? false,
    sel: { i: first.cells[0], dir: first.dir },
    rebus: false,
    running: false,
    flash: null,
  };
}

/** A rebus square also accepts its first letter, the Across Lite convention. */
export const correct = (p: Puzzle, s: Saved, i: number) => {
  const want = p.answers[i]!;
  return s.fills[i] === want || (want.length > 1 && s.fills[i] === want[0]);
};

const locked = (s: State, i: number) => s.marks[i] >= MARK.right;
const firstEmpty = (s: State, e: Entry) => e.cells.find((i) => !s.fills[i]) ?? e.cells[0];
const fix = (g: Geometry, sel: Sel): Sel =>
  g.of[sel.i][sel.dir] || !g.of[sel.i][other(sel.dir)] ? sel : { i: sel.i, dir: other(sel.dir) };
const turn = (g: Geometry, sel: Sel): Sel =>
  g.of[sel.i][other(sel.dir)] ? { i: sel.i, dir: other(sel.dir) } : sel;

function put(s: State, i: number, v: string): State {
  const fills = s.fills.slice();
  const marks = s.marks.slice();
  fills[i] = v;
  if (marks[i] === MARK.wrong) marks[i] = MARK.none;
  return { ...s, fills, marks };
}

// Next white square along a row or column, hopping over blocks; -1 at the edge.
function walk(p: Puzzle, i: number, dir: Dir, step: number): number {
  let r = Math.floor(i / p.width);
  let c = i % p.width;
  for (;;) {
    if (dir === "a") c += step;
    else r += step;
    if (r < 0 || c < 0 || r >= p.height || c >= p.width) return -1;
    if (p.answers[r * p.width + c] !== null) return r * p.width + c;
  }
}

function jump(g: Geometry, s: State, e: Entry, step: number, skip: boolean): Sel {
  const L = g.ents;
  const k = L.indexOf(e);
  const at = (n: number) => L[(((k + step * n) % L.length) + L.length) % L.length];
  let f = at(1);
  if (skip)
    for (let n = 1; n < L.length; n++)
      if (at(n).cells.some((i) => !s.fills[i])) {
        f = at(n);
        break;
      }
  return { i: firstEmpty(s, f), dir: f.dir };
}

// Where the cursor goes after a letter: the next blank in the word, else the first blank before it,
// else the next unfinished entry. Overwriting a word that was already full just steps forward.
function advance(g: Geometry, s: State, e: Entry, i: number, wasFull: boolean): Sel {
  const k = e.cells.indexOf(i);
  if (wasFull) return { i: e.cells[Math.min(k + 1, e.cells.length - 1)], dir: e.dir };
  const blank = (j: number) => !s.fills[j];
  const next = e.cells.slice(k + 1).find(blank) ?? e.cells.slice(0, k).find(blank);
  if (next !== undefined) return { i: next, dir: e.dir };
  const L = g.ents;
  const at = L.indexOf(e);
  for (let n = 1; n < L.length; n++) {
    const f = L[(at + n) % L.length];
    const j = f.cells.find(blank);
    if (j !== undefined) return { i: j, dir: f.dir };
  }
  return { i, dir: e.dir };
}

// Solved when every square is right; that stops the clock.
function finish(p: Puzzle, g: Geometry, s: State): State {
  if (s.solved || !g.white.every((i) => correct(p, s, i))) return s;
  return { ...s, solved: true, running: false, rebus: false };
}

const full = (g: Geometry, s: State) => !s.rebus && g.white.every((i) => s.fills[i]);

// Notices fire on the change, not the condition: a grid that loads solved or full stays quiet, and
// overwriting squares in a full grid doesn't nag again.
export function reduce(p: Puzzle, g: Geometry, prev: State, a: Action): State {
  if (a.type === "dismiss") return prev.flash ? { ...prev, flash: null } : prev;
  const next = step(p, g, prev, a);
  if (next === prev) return prev;
  if (next.solved && !prev.solved) return { ...next, flash: "solved" };
  if (!next.solved && full(g, next) && !full(g, prev)) return { ...next, flash: "wrong" };
  return next;
}

function step(p: Puzzle, g: Geometry, prev: State, a: Action): State {
  switch (a.type) {
    case "run":
      return prev.solved || prev.running === a.on ? prev : { ...prev, running: a.on, rebus: false };
    case "tick":
      return prev.running ? { ...prev, ms: prev.ms + a.ms } : prev;
    case "reset":
      return initial(p, g, null);
  }

  let s = prev;
  const play = s.running && !s.solved;

  // Rebus entry: letters pile up in one square until Enter/Esc; any other key commits first.
  if (s.rebus && play) {
    const i = s.sel.i;
    if (a.type === "letter") return put(s, i, (s.fills[i] + a.ch).slice(0, 12));
    if (a.type === "back") return put(s, i, s.fills[i].slice(0, -1));
    s = finish(p, g, { ...s, rebus: false });
    if (a.type === "rebus") {
      const e = g.of[i][s.sel.dir]!;
      const k = e.cells.indexOf(i);
      return { ...s, sel: { i: e.cells[Math.min(k + 1, e.cells.length - 1)], dir: e.dir } };
    }
  }

  // Moving around works while solving and after; nothing works behind the pause screen.
  if (!s.running && !s.solved) return s;
  const { i, dir } = s.sel;
  const e = g.of[i][dir]!;
  switch (a.type) {
    case "select":
      return { ...s, sel: a.i === i ? turn(g, s.sel) : fix(g, { i: a.i, dir }) };
    case "entry": {
      const f = g.byKey.get(a.key);
      return f ? { ...s, sel: { i: firstEmpty(s, f), dir: f.dir } } : s;
    }
    case "turn":
      return { ...s, sel: turn(g, s.sel) };
    case "arrow": {
      // An arrow across the current direction turns first, as in most solvers.
      if (a.dir !== dir && g.of[i][a.dir]) return { ...s, sel: { i, dir: a.dir } };
      const j = walk(p, i, a.dir, a.step);
      return j < 0 ? s : { ...s, sel: fix(g, { i: j, dir }) };
    }
    case "jump":
      return { ...s, sel: jump(g, s, e, a.step, a.skip) };
  }

  if (!play) return s;
  switch (a.type) {
    case "letter": {
      const wasFull = e.cells.every((j) => s.fills[j]);
      const t = locked(s, i) ? s : put(s, i, a.ch);
      return finish(p, g, { ...t, sel: advance(g, t, e, i, wasFull) });
    }
    case "back": {
      if (s.fills[i] && !locked(s, i)) return put(s, i, "");
      const k = e.cells.indexOf(i);
      let sel: Sel;
      if (k > 0) sel = { i: e.cells[k - 1], dir };
      else {
        const f = g.ents[(g.ents.indexOf(e) - 1 + g.ents.length) % g.ents.length];
        sel = { i: f.cells[f.cells.length - 1], dir: f.dir };
      }
      const t = { ...s, sel };
      return locked(t, sel.i) ? t : put(t, sel.i, "");
    }
    case "del":
      return locked(s, i) ? s : put(s, i, "");
    case "rebus":
      return locked(s, i) ? s : { ...s, rebus: true };
    case "check": {
      const marks = s.marks.slice();
      for (const j of scope(g, s, e, a.scope))
        if (s.fills[j] && marks[j] < MARK.right) marks[j] = correct(p, s, j) ? MARK.right : MARK.wrong;
      return { ...s, marks };
    }
    case "reveal": {
      const fills = s.fills.slice();
      const marks = s.marks.slice();
      for (const j of scope(g, s, e, a.scope)) {
        if (marks[j] >= MARK.right) continue;
        if (correct(p, s, j)) marks[j] = MARK.right;
        else {
          fills[j] = p.answers[j]!;
          marks[j] = MARK.shown;
        }
      }
      return finish(p, g, { ...s, fills, marks });
    }
    case "clear": {
      const fills = s.fills.slice();
      const marks = s.marks.slice();
      for (const j of e.cells)
        if (marks[j] < MARK.right) {
          fills[j] = "";
          marks[j] = MARK.none;
        }
      return { ...s, fills, marks };
    }
  }
  return s;
}

const scope = (g: Geometry, s: State, e: Entry, sc: Scope) =>
  sc === "cell" ? [s.sel.i] : sc === "word" ? e.cells : g.white;
