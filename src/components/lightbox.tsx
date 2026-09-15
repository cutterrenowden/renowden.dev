"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { exifLine, type Photo } from "@/lib/photos";

type Props = {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

const SWIPE_THRESHOLD = 50;
// One sizes string for the plate and its preloaded neighbours, so the browser
// requests the identical srcset entry it will actually render next.
const PLATE_SIZES = "(max-width: 768px) 92vw, 80vw";

export function Lightbox({ photos, index, onClose, onNavigate }: Props) {
  const photo = photos[index];
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      // Wrap around so the collection reads as a loop, not a dead end.
      onNavigate((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onNavigate]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Tab") {
        // Keep focus inside the dialog — the page behind is scroll-locked but
        // would otherwise still receive tab stops.
        const root = rootRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>("button, [href]")
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        const inside = active instanceof HTMLElement && root.contains(active);
        if (e.shiftKey && (!inside || active === first)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (!inside || active === last)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Lock the page behind the overlay, compensating for the scrollbar so the
  // layout underneath doesn't jump as it disappears.
  useEffect(() => {
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prev = { overflow: body.style.overflow, padding: body.style.paddingRight };
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    closeRef.current?.focus();
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.padding;
    };
  }, []);

  if (!photo) return null;

  // Neighbours to warm the cache with — deduped so a one- or two-photo set
  // doesn't render the same slug twice.
  const neighbours = [
    photos[(index - 1 + photos.length) % photos.length],
    photos[(index + 1) % photos.length],
  ].filter((p, i, arr) => p.slug !== photo.slug && arr.findIndex((q) => q.slug === p.slug) === i);

  const exif = exifLine(photo);
  const headline = photo.title ?? photo.location ?? photo.collection;
  // Where it was made sits with the exposure once the headline is a title;
  // when the place is the headline it isn't repeated.
  const detail = [photo.title ? photo.location : null, exif].filter(Boolean).join("  ·  ");

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={photo.title ?? "Expanded photograph"}
      className="fixed inset-0 z-50 flex flex-col bg-paper/97 backdrop-blur-xl"
      style={{ animation: "lightbox-in 0.4s var(--ease-gallery) both" }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      <style>{`
        @keyframes lightbox-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes plate-in {
          from { opacity: 0; transform: scale(0.985) }
          to { opacity: 1; transform: none }
        }
      `}</style>

      {/* z-20 keeps the header above the full-height nav zones below — without
          it the right-hand zone would swallow clicks meant for Close. */}
      <header className="relative z-20 flex shrink-0 items-center justify-between px-6 py-6 md:px-10">
        <span className="label text-ink-muted tabular-nums">
          {String(index + 1).padStart(2, "0")}
          <span className="text-ink-faint"> / {String(photos.length).padStart(2, "0")}</span>
        </span>
        <button
          ref={closeRef}
          onClick={onClose}
          className="label link-rule text-ink-muted transition-colors duration-300 hover:text-ink"
        >
          Close
        </button>
      </header>

      {/* Full-height click targets flanking the plate — the left quarter of
          the screen steps back, the right quarter steps forward. */}
      {photos.length > 1 && (
        <>
          <button
            aria-label="Previous photograph"
            onClick={() => go(-1)}
            className="absolute inset-y-0 left-0 z-10 w-1/4 cursor-w-resize focus-visible:outline-offset-[-2px]"
          />
          <button
            aria-label="Next photograph"
            onClick={() => go(1)}
            className="absolute inset-y-0 right-0 z-10 w-1/4 cursor-e-resize focus-visible:outline-offset-[-2px]"
          />
        </>
      )}

      <div className="flex min-h-0 flex-1 items-center justify-center px-6 md:px-20">
        <Image
          key={photo.slug}
          src={photo.src}
          alt={photo.title ?? "Photograph by Cutter Renowden"}
          width={photo.width}
          height={photo.height}
          placeholder="blur"
          blurDataURL={photo.blurDataURL}
          priority
          quality={90}
          sizes={PLATE_SIZES}
          className="max-h-full w-auto max-w-full object-contain"
          style={{ animation: "plate-in 0.5s var(--ease-gallery) both" }}
        />
      </div>

      <footer className="relative z-20 flex shrink-0 flex-col gap-1.5 px-6 py-6 text-center md:px-10 md:py-8">
        {headline && (
          <p className="label text-ink-muted">
            {headline}
          </p>
        )}
        {detail && <p className="label text-ink-faint">{detail}</p>}
      </footer>

      {/* Warm the neighbours so arrow-keying through the set never stutters. */}
      {neighbours.length > 0 && (
        <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
          {neighbours.map((p) => (
            <Image
              key={p.slug}
              src={p.src}
              alt=""
              width={p.width}
              height={p.height}
              quality={90}
              sizes={PLATE_SIZES}
              aria-hidden
            />
          ))}
        </div>
      )}
    </div>
  );
}
