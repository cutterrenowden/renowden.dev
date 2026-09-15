import Link from "next/link";

// A placeholder for the apex so the domain always answers with something,
// even if the gallery's URL moves. The portfolio itself lives at /photography.
export default function HomePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="label text-ink">Cutter Renowden</h1>
      <Link
        href="/photography"
        className="label link-rule text-ink-muted transition-colors duration-300 hover:text-ink"
      >
        Photography
      </Link>
    </div>
  );
}
