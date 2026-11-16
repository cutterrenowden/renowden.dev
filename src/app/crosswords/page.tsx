import type { Metadata } from "next";
import { CrosswordList } from "@/components/crossword/crossword-list";
import { listCrosswords, shareCard } from "@/lib/crosswords";

const description = "Crosswords by Cutter Renowden, as seen in the Yale Daily News.";

export const metadata: Metadata = {
  title: "Crosswords",
  description,
  alternates: { canonical: "/crosswords" },
  ...shareCard("Crosswords", description, "/crosswords"),
};

export default function CrosswordsPage() {
  // Only what the list needs; answers and clues stay out of the page payload.
  const puzzles = listCrosswords().map(({ slug, title, date, width, height, version }) => ({
    slug,
    title,
    date,
    width,
    height,
    version,
  }));
  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-6 pb-24 md:px-10 md:pt-14 md:pb-36">
      <h1 className="sr-only">Crosswords</h1>
      {puzzles.length === 0 ? (
        <p className="border-t border-rule pt-8 text-[15px] text-ink-muted">
          Drop a .puz file into <code className="text-ink">src/data/crosswords/</code>.
        </p>
      ) : (
        <CrosswordList puzzles={puzzles}>
          As seen in the{" "}
          <span className="underline decoration-yale decoration-1 underline-offset-4">Yale Daily News</span>
        </CrosswordList>
      )}
    </div>
  );
}
