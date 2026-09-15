"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbox } from "@/components/lightbox";
import type { Photo } from "@/lib/photos";

const ALL = "All";

/**
 * One photograph per beat, centred, never two on a screen, all at one weight.
 * It's how the one-at-a-time sites hang a single image in a lot of paper, run
 * as a scroll instead of a click-through.
 *
 * Every frame fits one box, and one rule sizes it at every window: the
 * smallest of the page width, max(62% of the page, 560px), and 80% of the
 * window's height times the frame's ratio. Landscapes meet the width limit
 * and portraits the height limit, so a vertical frame hangs tall instead of
 * being squeezed to a landscape's height at half the area, and every frame is
 * always seen whole. The 560px floor is what keeps a phone from getting a
 * 62% picture; it fades out on its own once 62% is wider than it, so there is
 * no breakpoint and nothing jumps. The ratio comes in per figure as a CSS
 * variable.
 */
const BOX = "w-[min(100%,max(62%,560px),calc(80vh*var(--ratio)))]";

const SIZES: Record<Photo["orientation"], string> = {
  landscape: "(max-width: 640px) 92vw, (max-width: 950px) 560px, 58vw",
  portrait: "(max-width: 640px) 92vw, (max-width: 950px) 560px, 40vw",
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

      {visible.map((photo, index) => (
        <Reveal
          key={photo.slug}
          className="flex justify-center mb-[18vh] last:mb-0 md:mb-[26vh]"
        >
          <Frame
            photo={photo}
            index={index}
            width={BOX}
            sizes={SIZES[photo.orientation]}
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
  const title = photo.title ?? photo.collection;
  const where = photo.location;

  return (
    <figure
      className={width}
      style={{ "--ratio": photo.width / photo.height } as React.CSSProperties}
    >
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
          title if there is one, then the place off to the right. */}
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
