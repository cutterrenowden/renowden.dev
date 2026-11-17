import type { Metadata } from "next";
import { PhotoGallery } from "@/components/photo-gallery";
import { collections, photos } from "@/lib/photos";

export const metadata: Metadata = {
  title: "Photography",
  description: "Cutter Renowden's personal site.",
};

export default function PhotographyPage() {
  return (
    <div className="mx-auto max-w-[1800px] px-6 pt-6 pb-24 md:px-10 md:pt-14 md:pb-36">
      <h1 className="sr-only">Photography by Cutter Renowden</h1>
      {photos.length === 0 ? (
        <EmptyState />
      ) : (
        <PhotoGallery photos={photos} collections={collections()} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-t border-rule pt-10">
      <p className="label text-ink-faint">No photographs yet</p>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">
        Drop exported images into a source folder, list them in{" "}
        <code className="text-ink">src/data/order.txt</code>, then run{" "}
        <code className="text-ink">npm run photos &lt;folder&gt;</code>.
      </p>
    </div>
  );
}
