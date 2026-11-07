import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Solver } from "@/components/crossword/solver";
import { getCrossword, listCrosswords } from "@/lib/crosswords";

// Every puzzle is built ahead of time from src/data/crosswords; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return listCrosswords().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/crosswords/[slug]">): Promise<Metadata> {
  const p = getCrossword((await props.params).slug);
  if (!p) return {};
  return {
    title: p.title,
    description: `A ${p.width}×${p.height} crossword${p.author ? ` by ${p.author}` : ""}.`,
    alternates: { canonical: `/crosswords/${p.slug}` },
  };
}

export default async function CrosswordPage(props: PageProps<"/crosswords/[slug]">) {
  const p = getCrossword((await props.params).slug);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-4 pb-24 md:px-10 md:pt-8 md:pb-32">
      <header className="mb-6 md:mb-8">
        <h1 className="text-[28px] leading-tight font-medium tracking-tight">{p.title}</h1>
        {p.notes && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{p.notes}</p>}
      </header>
      <Solver puzzle={p} />
    </div>
  );
}
