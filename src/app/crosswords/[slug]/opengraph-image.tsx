import { notFound } from "next/navigation";
import { previewImage } from "@/components/crossword/preview";
import { getCrossword, listCrosswords } from "@/lib/crosswords";

export { contentType, size } from "@/components/crossword/preview";
export const alt = "Crossword grid";

// One image per puzzle, drawn at build time alongside its page.
export function generateStaticParams() {
  return listCrosswords().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = getCrossword((await params).slug);
  if (!p) notFound();
  return previewImage(
    {
      label: "Crossword",
      title: p.title,
      detail: [`${p.width}×${p.height}`, p.author].filter(Boolean).join(" · "),
    },
    p,
  );
}
