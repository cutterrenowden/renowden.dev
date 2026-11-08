"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Progress } from "./progress";

export type Item = { slug: string; title: string; date: string; width: number; height: number; version: string };

const sizeOf = (p: Item) => `${p.width}×${p.height}`;

// MMDDYYYY, split by hand so the date never shifts with the viewer's time zone.
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${m}${d}${y}`;
};

/** The puzzle list, with a size filter and `children` centered in the bar above it. */
export function CrosswordList({ puzzles, children }: { puzzles: Item[]; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  // One option per size that exists, smallest first; a new size shows up on its own.
  const sizes = [...new Map(puzzles.map((p) => [sizeOf(p), p.width * p.height])).entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([s]) => s);
  const shown = picked.length ? puzzles.filter((p) => picked.includes(sizeOf(p))) : puzzles;
  const toggle = (s: string) => setPicked((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <>
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div />
        <div className="text-center text-[13px] text-ink-faint">{children}</div>
        {/* Sizes open inline, to the left of the icon, so nothing covers the list. */}
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          {open &&
            sizes.map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-1.5 text-[13px] text-ink-muted">
                <input
                  type="checkbox"
                  className="size-3 cursor-pointer accent-yale"
                  checked={picked.includes(s)}
                  onChange={() => toggle(s)}
                />
                {s}
              </label>
            ))}
          <button
            type="button"
            aria-label="Filter by size"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="relative -mr-1 p-1 text-ink-muted transition-colors hover:text-ink"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2 3.5h12L9.5 8.5V13l-3-1.5V8.5L2 3.5Z" />
            </svg>
            {picked.length > 0 && !open && <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-yale" />}
          </button>
        </div>
      </div>
      <ul className="border-t border-rule">
        {shown.map((p) => (
          <li key={p.slug} className="border-b border-rule">
            <Link href={`/crosswords/${p.slug}`} className="group flex flex-wrap items-baseline gap-x-6 gap-y-2 py-6">
              <span className="text-[22px] font-medium tracking-tight">
                <span className="link-rule">{p.title}</span>
              </span>
              {/* Fixed widths keep size and date in columns from row to row. */}
              <span className="ml-auto flex items-baseline gap-6 text-[13px] text-ink-faint tabular-nums">
                <Progress slug={p.slug} version={p.version} />
                <span className="w-12 text-right">{sizeOf(p)}</span>
                <span className="w-16 text-right">{p.date && formatDate(p.date)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
