"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbox } from "@/components/lightbox";
import { photoYear, type Photo } from "@/lib/photos";

const ALL = "All";

type Scale = "large" | "medium" | "small";
type Placed = { photo: Photo; index: number; scale: Scale };

/**
 * One photograph per beat, centred, never two on a screen. It's how the
 * one-at-a-time sites hang a single image in a lot of paper, run as a scroll
 * instead of a click-through. What keeps the column from reading as a feed is
 * that no two consecutive frames share a size.
 *
 * The sequence itself is hand-set in src/data/order.txt; position here decides
 * how large a frame hangs. First and last are always large.
 */
const RHYTHM: readonly Scale[] = ["medium", "small", "medium", "large", "medium", "small"];

function place(photos: Photo[]): Placed[] {
  const last = photos.length - 1;
  return photos.map((photo, index) => ({
    photo,
    index,
    scale: index === 0 || index === last ? "large" : RHYTHM[(index - 1) % RHYTHM.length],
  }));
}

// A portrait at a landscape's width stands far taller than the screen, so
// each scale carries its own width per orientation. Phone widths keep the
// size rhythm visible rather than collapsing every frame to full width.
const WIDTH: Record<Scale, Record<Photo["orientation"], string>> = {
  large: { landscape: "w-full md:w-[64%]", portrait: "w-[84%] md:w-[40%]" },
  medium: { landscape: "w-[86%] md:w-[48%]", portrait: "w-[70%] md:w-[32%]" },
  small: { landscape: "w-[70%] md:w-[34%]", portrait: "w-[56%] md:w-[24%]" },
};

const SIZES: Record<Scale, Record<Photo["orientation"], string>> = {
  large: { landscape: "(max-width: 768px) 92vw, 60vw", portrait: "(max-width: 768px) 78vw, 38vw" },
  medium: { landscape: "(max-width: 768px) 80vw, 45vw", portrait: "(max-width: 768px) 65vw, 30vw" },
  small: { landscape: "(max-width: 768px) 65vw, 32vw", portrait: "(max-width: 768px) 52vw, 23vw" },
};

export function PhotoGallery({
  photos,
  collections,
}: {
  photos: Photo[];
  collections: string[];
}) {
  const [filter, setFilter] = useState<string>(ALL);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = useMemo(
    () => (filter === ALL ? photos : photos.filter((p) => p.collection === filter)),
    [photos, filter]
  );

  const placed = useMemo(() => place(visible), [visible]);

  // A photo's slug in the hash makes any frame in the set linkable. The hash is
  // a browser-owned value, so it is read as a subscription: once on mount, and
  // again whenever someone navigates to another slug. Writing the hash below
  // uses replaceState, which fires no hashchange, so the two never loop.
  useEffect(() => {
    const openFromHash = () => {
      const slug = window.location.hash.slice(1);
      if (!slug) return;
      const i = photos.findIndex((p) => p.slug === slug);
      if (i >= 0) {
        setFilter(ALL);
        setOpenIndex(i);
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
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

      {placed.map(({ photo, index, scale }) => (
        <Reveal
          key={photo.slug}
          className="flex justify-center mb-[18vh] last:mb-0 md:mb-[26vh]"
        >
          <Frame
            photo={photo}
            index={index}
            width={WIDTH[scale][photo.orientation]}
            sizes={SIZES[scale][photo.orientation]}
            onOpen={() => setOpenIndex(index)}
          />
        </Reveal>
      ))}

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
  width,
  sizes,
  onOpen,
}: {
  photo: Photo;
  index: number;
  width: string;
  sizes: string;
  onOpen: () => void;
}) {
  const year = photoYear(photo);
  const title = photo.title ?? photo.collection;
  const where = [photo.location, year].filter(Boolean).join(", ");

  return (
    <figure className={width}>
      <button
        onClick={onOpen}
        aria-label={`Expand ${title ?? `plate ${index + 1}`}`}
        className="group block w-full cursor-zoom-in text-left"
      >
        <div className="overflow-hidden bg-paper-sunk">
          <Image
            src={photo.src}
            alt={title ?? "Photograph by Cutter Renowden"}
            width={photo.width}
            height={photo.height}
            placeholder="blur"
            blurDataURL={photo.blurDataURL}
            priority={index === 0}
            sizes={sizes}
            className="w-full transition-transform duration-[1400ms] ease-[var(--ease-gallery)] group-hover:scale-[1.015]"
          />
        </div>
      </button>

      {/* Stated, not hovered, the way every reference site captions: a plate
          number so untitled frames still read as part of a sequence, then the
          title if there is one, then place and year off to the right. */}
      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="label flex min-w-0 gap-4 leading-relaxed text-ink-muted">
          <span className="shrink-0 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
          {title && <span className="min-w-0">{title}</span>}
        </span>
        {where && <span className="label min-w-0 text-right leading-relaxed text-ink-muted">{where}</span>}
      </figcaption>
    </figure>
  );
}

/** Fades a block up as it enters, once. */
function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
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
      { rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: "opacity 1.1s var(--ease-gallery), transform 1.1s var(--ease-gallery)",
      }}
    >
      {children}
    </div>
  );
}
