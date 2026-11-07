import type { Metadata } from "next";
import Link from "next/link";
import { Progress } from "@/components/crossword/progress";
import { listCrosswords } from "@/lib/crosswords";

export const metadata: Metadata = {
  title: "Crosswords",
  description: "Crosswords by Cutter Renowden.",
  alternates: { canonical: "/crosswords" },
};

export default function CrosswordsPage() {
  const puzzles = listCrosswords();
  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-6 pb-24 md:px-10 md:pt-14 md:pb-36">
      <h1 className="label text-ink-muted">Crosswords</h1>
      {puzzles.length === 0 ? (
        <p className="mt-8 border-t border-rule pt-8 text-[15px] text-ink-muted">
          Drop a .puz file into <code className="text-ink">src/data/crosswords/</code>.
        </p>
      ) : (
        <ul className="mt-8 border-t border-rule">
          {puzzles.map((p) => (
            <li key={p.slug} className="border-b border-rule">
              <Link
                href={`/crosswords/${p.slug}`}
                className="group flex flex-wrap items-baseline gap-x-6 gap-y-2 py-6"
              >
                <span className="text-[22px] font-medium tracking-tight">
                  <span className="link-rule">{p.title}</span>
                </span>
                <span className="label text-ink-faint">
                  {p.width}×{p.height}
                </span>
                <span className="ml-auto">
                  <Progress slug={p.slug} version={p.version} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
