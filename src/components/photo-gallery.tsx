"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbox } from "@/components/lightbox";
import { photoYear, type Photo } from "@/lib/photos";

const ALL = "All";

type Placed = { photo: Photo; index: number };

/**
 * Deterministic masonry: each photo drops into the currently shortest column,
 * measured by aspect ratio (heights are known from the manifest, so this is
 * SSR-safe — no layout measuring, no reflow). Array order stays the hand-set
 * sequence: it drives the lightbox and fills the columns top-first.
 */
function distribute(photos: Photo[], columnCount: number): Placed[][] {
  const columns: Placed[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);
  photos.forEach((photo, index) => {
    const target = heights.indexOf(Math.min(...heights));
    columns[target].push({ photo, index });
    heights[target] += photo.height / photo.width;
  });
  return columns;
}

export function PhotoGallery({
  photos,
  collections,
}: {
  photos: Photo[];
  collections: string[];
}) {
  const [filter, setFilter] = useState<string>(ALL);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [columnCount, setColumnCount] = useState(2);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setColumnCount(mq.matches ? 1 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const visible = useMemo(
    () => (filter === ALL ? photos : photos.filter((p) => p.collection === filter)),
    [photos, filter]
  );

  const columns = useMemo(
    () => distribute(visible, columnCount),
    [visible, columnCount]
  );

  // A photo's slug in the hash makes any frame in the set linkable.
  useEffect(() => {
    const slug = window.location.hash.slice(1);
    if (!slug) return;
    const i = photos.findIndex((p) => p.slug === slug);
    if (i >= 0) {
      setFilter(ALL);
      setOpenIndex(i);
    }
  }, [photos]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = openIndex === null ? "" : visible[openIndex]?.slug ?? "";
    window.history.replaceState(null, "", url.toString().replace(/#$/, ""));
  }, [openIndex, visible]);

  return (
    <>
      {collections.length > 1 && (
        <div className="mb-14 flex flex-wrap gap-x-8 gap-y-4 md:mb-20">
          {[ALL, ...collections].map((name) => (
            <button
              key={name}
              onClick={() => setFilter(name)}
              data-active={filter === name}
              className="label link-rule text-ink-faint transition-colors duration-300 hover:text-ink data-[active=true]:text-ink"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4 md:gap-6 xl:gap-8">
        {columns.map((column, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col">
            {column.map(({ photo, index }) => (
              <Frame
                key={photo.slug}
                photo={photo}
                index={index}
                onOpen={() => setOpenIndex(index)}
              />
            ))}
          </div>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={visible}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </>
  );
}

function Frame({
  photo,
  index,
  onOpen,
}: {
  photo: Photo;
  index: number;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const year = photoYear(photo);
  const caption = photo.title ?? photo.collection;

  return (
    <button
      ref={ref}
      onClick={onOpen}
      aria-label={`Expand ${photo.title ?? "photograph"}`}
      className="group mb-4 block w-full text-left md:mb-6 xl:mb-8"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(14px)",
        transition: "opacity 0.9s var(--ease-gallery), transform 0.9s var(--ease-gallery)",
      }}
    >
      <div className="relative overflow-hidden bg-paper-sunk">
        <Image
          src={photo.src}
          alt={photo.title ?? "Photograph by Cutter Renowden"}
          width={photo.width}
          height={photo.height}
          placeholder="blur"
          blurDataURL={photo.blurDataURL}
          loading={index < 6 ? "eager" : "lazy"}
          sizes="(max-width: 640px) 100vw, 50vw"
          className="w-full transition-transform duration-[1200ms] ease-[var(--ease-gallery)] group-hover:scale-[1.02]"
        />
      </div>
      {(caption || year) && (
        <div className="mt-3 flex items-baseline justify-between gap-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
          {caption && <span className="label truncate text-ink-muted">{caption}</span>}
          {year && <span className="label ml-auto shrink-0 text-ink-faint">{year}</span>}
        </div>
      )}
    </button>
  );
}
