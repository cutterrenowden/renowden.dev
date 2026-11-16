import { ImageResponse } from "next/og";
import type { Puzzle } from "@/lib/puz";

// The link-preview card for the crossword pages: a title beside the puzzle's empty grid.
// next/og lays out with flexbox only and can't read the site's CSS variables, so the colors
// here repeat globals.css and solver.module.css.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#faf9f7";
const INK = "#1a1a18";
const INK_MUTED = "#6e6b63";
const GRID_LINE = "#9b978e";

/** The square the grid is fitted into, in px. */
const BOARD = 500;

type Text = { label: string; title: string; detail: string };

export function previewImage(text: Text, puzzle?: Puzzle) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 76px",
          background: PAPER,
          color: INK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 500 }}>
          <div style={{ fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", color: INK_MUTED }}>
            {text.label}
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: text.title.length > 11 ? 64 : 86,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {text.title}
          </div>
          <div style={{ marginTop: 30, fontSize: 27, color: INK_MUTED }}>{text.detail}</div>
        </div>
        {puzzle && <Grid p={puzzle} />}
      </div>
    ),
    size,
  );
}

// Blocks, numbers and circles only: the answers are never drawn.
function Grid({ p }: { p: Puzzle }) {
  const span = Math.max(p.width, p.height);
  const cell = Math.floor((BOARD - 4 - (span - 1)) / span); // less the 2px border and 1px lines
  return (
    <div style={{ display: "flex", width: BOARD, height: BOARD, alignItems: "center", justifyContent: "center" }}>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 1, background: GRID_LINE, border: `2px solid ${INK}` }}
      >
        {Array.from({ length: p.height }, (_, r) => (
          <div key={r} style={{ display: "flex", gap: 1 }}>
            {Array.from({ length: p.width }, (_, c) => {
              const i = r * p.width + c;
              return (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    position: "relative",
                    width: cell,
                    height: cell,
                    background: p.answers[i] === null ? INK : "#fff",
                  }}
                >
                  {p.circles.includes(i) && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: cell,
                        height: cell,
                        border: "1px solid #7d7d7d",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                  {p.numbers[i] > 0 && (
                    <div
                      style={{
                        display: "flex", // next/og requires it on any div whose child isn't a string
                        position: "absolute",
                        top: cell * 0.06,
                        left: cell * 0.08,
                        fontSize: cell * 0.3,
                        lineHeight: 1,
                      }}
                    >
                      {p.numbers[i]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
