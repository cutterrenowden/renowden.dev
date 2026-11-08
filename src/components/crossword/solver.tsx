"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import type { Dir, Entry, Puzzle } from "@/lib/puz";
import { MARK, fmt, geometry, initial, other, reduce, type Action, type State } from "./game";
import { load, save } from "./save";
import styles from "./solver.module.css";

const subscribe = () => () => {};
const ARROWS: Record<string, [Dir, 1 | -1]> = {
  ArrowLeft: ["a", -1],
  ArrowRight: ["a", 1],
  ArrowUp: ["d", -1],
  ArrowDown: ["d", 1],
};
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
// Toolbar buttons never take focus, so Space and Enter always reach the grid.
const keepFocus = (ev: MouseEvent) => ev.preventDefault();

export function Solver({ puzzle }: { puzzle: Puzzle }) {
  // The server can't read the solver's cookie, so it renders a blank grid. Once hydrated, the
  // game remounts with whatever progress was saved.
  const live = useSyncExternalStore(subscribe, () => true, () => false);
  return <Game key={live ? "live" : "static"} puzzle={puzzle} live={live} />;
}

function Game({ puzzle: p, live }: { puzzle: Puzzle; live: boolean }) {
  const g = useMemo(() => geometry(p), [p]);
  const [s, dispatch] = useReducer(
    (state: State, action: Action) => reduce(p, g, state, action),
    null,
    () => initial(p, g, live ? load(p) : null),
  );
  const latest = useRef(s);
  const items = useRef(new Map<string, HTMLLIElement>());
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    latest.current = s;
  });

  useEffect(() => {
    if (live) save(p, s);
  }, [live, p, s]);

  // The clock adds real elapsed time, so a throttled interval can't make it drift.
  useEffect(() => {
    if (!s.running) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", ms: now - last });
      last = now;
    }, 500);
    return () => clearInterval(id);
  }, [s.running]);

  // Leaving the tab pauses the clock and saves; coming back resumes only if that's what paused it.
  useEffect(() => {
    if (!live) return;
    let auto = false;
    const onVisibility = () => {
      if (document.hidden) {
        save(p, latest.current);
        if (latest.current.running) {
          auto = true;
          dispatch({ type: "run", on: false });
        }
      } else if (auto) {
        auto = false;
        dispatch({ type: "run", on: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [live, p]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (ev.metaKey || ev.ctrlKey || ev.altKey || target?.closest("input, textarea, select")) return;
      const { running, solved, rebus, flash } = latest.current;
      if (flash) {
        if (ev.key === "Escape") dispatch({ type: "dismiss" });
        return;
      }
      if (!running && !solved) return;
      const k = ev.key;
      if (target?.closest("button") && (k === "Enter" || k === " ")) return;
      const arrow = ARROWS[k];
      let a: Action | null = null;
      if (/^[a-z0-9]$/i.test(k)) a = { type: "letter", ch: k.toUpperCase() };
      else if (arrow) a = { type: "arrow", dir: arrow[0], step: arrow[1] };
      else if (k === "Backspace") a = { type: "back" };
      else if (k === "Delete") a = { type: "del" };
      else if (k === " ") a = { type: "turn" };
      else if (k === "Tab") a = { type: "jump", step: ev.shiftKey ? -1 : 1, skip: true };
      else if (k === "Enter") a = rebus ? { type: "rebus" } : { type: "jump", step: 1, skip: true };
      else if (k === "Escape") a = { type: "rebus" };
      if (!a) return;
      ev.preventDefault();
      dispatch(a);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const e = g.of[s.sel.i][s.sel.dir]!;
  const cross = g.of[s.sel.i][other(s.sel.dir)];

  // Keep the active and crossing clues visible inside their own lists, without scrolling the page.
  useEffect(() => {
    for (const key of [e.key, cross?.key]) {
      const li = key ? items.current.get(key) : undefined;
      const list = li?.parentElement;
      if (!li || !list || list.scrollHeight <= list.clientHeight) continue;
      const top = li.offsetTop;
      const bottom = top + li.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
    }
  }, [e.key, cross?.key]);

  const play = s.running && !s.solved;
  const covered = !s.running && !s.solved;
  const word = new Set(e.cells);
  const circles = new Set(p.circles);

  const pickClue = (f: Entry) => {
    dispatch({ type: "entry", key: f.key });
    // On a phone the lists sit below the grid; bring the grid back to where the typing happens.
    if (matchMedia("(max-width: 767px)").matches) boardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div className={styles.game} style={{ "--w": p.width, "--h": p.height } as CSSProperties}>
      <div className={styles.left}>
        <div className={styles.tools}>
          <button
            type="button"
            className={styles.clock}
            onMouseDown={keepFocus}
            onClick={() => dispatch({ type: "run", on: !s.running })}
            disabled={s.solved}
            aria-label={s.solved ? `Solved in ${fmt(s.ms)}` : s.running ? "Pause" : "Resume"}
          >
            <span>{fmt(s.ms)}</span>
            {!s.solved && <PlayPause running={s.running} />}
          </button>
          <span className={styles.grow} />
          <Menu
            label="Check"
            disabled={!play}
            items={[
              { label: "Cell", run: () => dispatch({ type: "check", scope: "cell" }) },
              { label: "Word", run: () => dispatch({ type: "check", scope: "word" }) },
              { label: "Puzzle", confirm: "Check every square?", run: () => dispatch({ type: "check", scope: "puzzle" }) },
            ]}
          />
          <Menu
            label="Reveal"
            disabled={!play}
            items={[
              { label: "Cell", run: () => dispatch({ type: "reveal", scope: "cell" }) },
              { label: "Word", run: () => dispatch({ type: "reveal", scope: "word" }) },
              { label: "Puzzle", confirm: "Reveal the whole puzzle?", run: () => dispatch({ type: "reveal", scope: "puzzle" }) },
            ]}
          />
          <Menu
            label="Clear"
            disabled={covered}
            items={[
              ...(play ? [{ label: "Word", run: () => dispatch({ type: "clear" }) }] : []),
              { label: "Puzzle", confirm: "Erase everything and reset the clock?", run: () => dispatch({ type: "reset" }) },
            ]}
          />
        </div>

        <div className={`${styles.clue} ${covered ? styles.hidden : ""}`}>
          <button type="button" className={styles.step} aria-label="Previous clue" onClick={() => dispatch({ type: "jump", step: -1, skip: false })}>
            ‹
          </button>
          <button type="button" className={styles.clueText} onMouseDown={keepFocus} onClick={() => dispatch({ type: "turn" })}>
            <b>
              {e.num}
              {e.dir === "a" ? "A" : "D"}
            </b>
            <span>{e.clue}</span>
          </button>
          <button type="button" className={styles.step} aria-label="Next clue" onClick={() => dispatch({ type: "jump", step: 1, skip: false })}>
            ›
          </button>
        </div>

        <div
          ref={boardRef}
          className={`${styles.board} ${s.rebus ? styles.rebus : ""} ${s.solved ? styles.done : ""}`}
          onClick={(ev) => {
            const cell = (ev.target as HTMLElement).closest<HTMLElement>("[data-i]");
            if (cell) dispatch({ type: "select", i: Number(cell.dataset.i) });
          }}
        >
          {p.answers.map((x, i) => {
            if (x === null) return <div key={i} className={`${styles.cell} ${styles.block}`} />;
            const fill = covered ? "" : s.fills[i];
            const mark = covered ? MARK.none : s.marks[i];
            const cls = [
              styles.cell,
              i === s.sel.i ? styles.sel : word.has(i) ? styles.word : "",
              circles.has(i) ? styles.circ : "",
              fill.length > 1 ? styles.multi : "",
              mark === MARK.wrong ? styles.wrong : mark === MARK.right ? styles.right : mark === MARK.shown ? styles.shown : "",
            ].join(" ");
            return (
              <div key={i} data-i={i} className={cls} style={{ "--len": fill.length } as CSSProperties}>
                <span className={styles.num}>{p.numbers[i] || ""}</span>
                <span className={styles.ltr}>{fill}</span>
              </div>
            );
          })}
          {s.flash && (
            <Notice
              flash={s.flash}
              title={p.title}
              ms={s.ms}
              revealed={s.marks.filter((m) => m === MARK.shown).length}
              onClose={() => dispatch({ type: "dismiss" })}
            />
          )}
          {covered && (
            <div className={styles.cover}>
              {s.ms ? <p className="label text-ink-muted">Paused</p> : null}
              <button type="button" className={styles.start} onClick={() => dispatch({ type: "run", on: true })}>
                {s.ms ? "Resume" : "Start"}
              </button>
            </div>
          )}
        </div>

        <div className={styles.keys}>
          {KEY_ROWS.map((row, r) => (
            <div key={row}>
              {r === 2 && (
                <button
                  type="button"
                  tabIndex={-1}
                  className={`${styles.wide} ${s.rebus ? styles.on : ""}`}
                  onMouseDown={keepFocus}
                  onClick={() => dispatch({ type: "rebus" })}
                >
                  {s.rebus ? "Done" : "Rebus"}
                </button>
              )}
              {[...row].map((ch) => (
                <button key={ch} type="button" tabIndex={-1} onMouseDown={keepFocus} onClick={() => dispatch({ type: "letter", ch })}>
                  {ch}
                </button>
              ))}
              {r === 2 && (
                <button
                  type="button"
                  tabIndex={-1}
                  className={styles.wide}
                  aria-label="Backspace"
                  onMouseDown={keepFocus}
                  onClick={() => dispatch({ type: "back" })}
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.lists} ${covered ? styles.hidden : ""}`}>
        {([
          ["Across", p.across],
          ["Down", p.down],
        ] as const).map(([title, list]) => (
          <section key={title} className={styles.col}>
            <h2 className="label">{title}</h2>
            <ol>
              {list.map((f) => (
                <li
                  key={f.key}
                  ref={(el) => {
                    if (el) items.current.set(f.key, el);
                    else items.current.delete(f.key);
                  }}
                  className={[
                    f === e ? styles.on : f === cross ? styles.cross : "",
                    f !== e && f.cells.every((j) => s.fills[j]) ? styles.full : "",
                  ].join(" ")}
                  onClick={() => pickClue(f)}
                >
                  <span className={styles.n}>{f.num}</span>
                  <span>{f.clue}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

// "45 seconds", "12:34 minutes", "1:02:05 hours"
const spoken = (ms: number) => {
  const t = Math.floor(ms / 1000);
  if (t < 60) return `${t} seconds`;
  return `${fmt(ms)} ${t < 3600 ? "minutes" : "hours"}`;
};

function Notice({
  flash,
  title,
  ms,
  revealed,
  onClose,
}: {
  flash: "solved" | "wrong";
  title: string;
  ms: number;
  revealed: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // The share sheet on phones (Messages is one tap away); a copied message where there isn't one.
  // Messages can't link a word, so the URL goes on its own line and iMessage turns it into a
  // preview card titled with the puzzle's name. It's sent inside `text`, not as a separate `url`:
  // given both, Apple's share sheet tends to keep the URL and drop the sentence.
  const share = async () => {
    const url = location.origin + location.pathname;
    const reveals = revealed === 0 ? "no reveals" : revealed === 1 ? "1 reveal" : `${revealed} reveals`;
    const message = `I solved the ${title} crossword in ${spoken(ms)} with ${reveals}!\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch {
        // Closing the sheet rejects; nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {}
  };

  // Portaled to <body> so the grid's container/stacking context can't position or clip it.
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        className={styles.modal}
        onClick={(ev) => ev.stopPropagation()}
      >
        <p className={`label ${styles.kicker}`}>
          {title}
          {revealed ? ` · ${revealed} revealed` : ""}
        </p>
        {flash === "solved" ? (
          <>
            <h2 id="notice-title">Congrats!</h2>
            <p className={styles.time}>{fmt(ms)}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={share}>
                {copied ? "Copied" : "Share"}
              </button>
              <button type="button" className={styles.quiet} onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="notice-title">Not quite</h2>
            <p className={styles.sub}>At least one square is wrong.</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={onClose}>
                Keep trying
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function PlayPause({ running }: { running: boolean }) {
  return (
    <svg viewBox="0 0 10 12" aria-hidden="true">
      {running ? (
        <path d="M1 1h2.6v10H1zM6.4 1H9v10H6.4z" fill="currentColor" />
      ) : (
        <path d="M1 1l8 5-8 5z" fill="currentColor" />
      )}
    </svg>
  );
}

type Item = { label: string; run: () => void; confirm?: string };

function Menu({ label, items, disabled }: { label: string; items: Item[]; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const shown = open && !disabled;

  useEffect(() => {
    if (!shown) return;
    const close = () => {
      setOpen(false);
      setAsking(null);
    };
    const onDown = (ev: PointerEvent) => {
      if (!root.current?.contains(ev.target as Node)) close();
    };
    // Capture on window so Escape closes the menu instead of reaching the grid as "rebus".
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.stopPropagation();
      close();
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [shown]);

  const done = (it: Item) => {
    it.run();
    setOpen(false);
    setAsking(null);
  };

  return (
    <div ref={root} className={styles.menu}>
      <button
        type="button"
        className={`label ${styles.menuButton}`}
        aria-expanded={shown}
        disabled={disabled}
        onMouseDown={keepFocus}
        onClick={() => {
          setOpen(!shown);
          setAsking(null);
        }}
      >
        {label}
      </button>
      {shown && (
        <div className={styles.menuList}>
          {items.map((it) =>
            asking === it.label ? (
              <div key={it.label} className={styles.confirm}>
                <p>{it.confirm}</p>
                <div>
                  <button type="button" onMouseDown={keepFocus} onClick={() => done(it)}>
                    Yes
                  </button>
                  <button type="button" onMouseDown={keepFocus} onClick={() => setAsking(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                key={it.label}
                type="button"
                onMouseDown={keepFocus}
                onClick={() => (it.confirm ? setAsking(it.label) : done(it))}
              >
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
