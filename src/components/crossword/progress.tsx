"use client";

import { useSyncExternalStore } from "react";
import { fmt } from "./game";
import { peek } from "./save";

const subscribe = () => () => {};

/** "Solved · 12:04" or "In progress · 3:10", read from the puzzle's cookie. Empty until hydrated. */
export function Progress({ slug, version }: { slug: string; version: string }) {
  const cookie = useSyncExternalStore(subscribe, () => document.cookie, () => "");
  const p = peek(cookie, slug, version);
  if (!p || (!p.solved && !p.started && !p.ms)) return null;
  return (
    <span className="label text-ink-muted">
      {p.solved ? "Solved" : "In progress"} · {fmt(p.ms)}
    </span>
  );
}
