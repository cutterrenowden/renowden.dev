import manifest from "@/data/photos.json";

export type Photo = {
  slug: string;
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
  title: string | null;
  collection: string | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
  date: string | null;
  orientation: "landscape" | "portrait";
};

export const photos = manifest as Photo[];

export function collections(list: Photo[] = photos): string[] {
  return [...new Set(list.map((p) => p.collection).filter((c): c is string => c !== null))];
}

/** The single line of shooting data shown under an expanded photo. */
export function exifLine(photo: Photo): string {
  return [photo.camera, photo.focalLength, photo.aperture, photo.shutter, photo.iso]
    .filter(Boolean)
    .join("  ·  ");
}

export function photoYear(photo: Photo): string | null {
  return photo.date ? new Date(photo.date).getFullYear().toString() : null;
}
