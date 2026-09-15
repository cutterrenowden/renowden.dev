#!/usr/bin/env node
/**
 * Build the photography manifest.
 *
 *   node scripts/build-photos.mjs <sourceDir>
 *
 * Source layout may be flat, or one subfolder per collection:
 *
 *   photos-src/Rocky Mountain/DSC_0001.jpg
 *   photos-src/Sedona/DSC_0042.jpg
 *
 * Each image is resized to fit MAX_EDGE, written to public/photography/,
 * and recorded in src/data/photos.json with dimensions, a base64 blur
 * placeholder, and whatever EXIF the file carries.
 *
 * Sequencing, titles, places and exposure are hand-controlled via
 * src/data/order.txt:
 *
 *   # one photo per line: filename | Title | Location | settings
 *   sedona_milkyway.png | Cathedral Rock | Sedona, Arizona
 *   DSC01954.JPG | | Colorado | 13mm f/2.2 1/800s ISO 160 2026-06-12
 *
 * Title and Location are optional. The settings field replaces whatever EXIF
 * the file carries: space-separated tokens in any order for focal length,
 * aperture, shutter, ISO and date.
 *
 * When the order file exists it is the curation list: only listed files are
 * published, in listed order — anything else in the source folder is skipped.
 * The title (or, failing that, the location) becomes the photo's slug.
 * Without an order file, every image ships in filename order.
 */
import { readdir, mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import { join, extname, basename, relative } from "node:path";
import sharp from "sharp";
import exifr from "exifr";

const MAX_EDGE = 2400;
const QUALITY = 82;
// The portfolio is shot on one body. A file whose EXIF names another camera
// has been through a phone on its way here, and that phone's lens and
// exposure are not this photograph's, so only EXIF from this body is kept.
const CAMERA = "Sony a6700";
const CAMERA_EXIF_MODEL = /ILCE-6700/i;
const EXTS = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"]);

const SRC = process.argv[2] ?? "photos-src";
const ORDER_FILE = process.argv[3] ?? "src/data/order.txt";
const OUT_DIR = "public/photography";
const MANIFEST = "src/data/photos.json";

const slugify = (s) =>
  s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (EXTS.has(extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

// EXIF gives us shutter speed as a float; photographers read it as a fraction.
function formatShutter(exposureTime) {
  if (!exposureTime) return null;
  if (exposureTime >= 1) return `${Number(exposureTime.toFixed(1))}s`;
  return `1/${Math.round(1 / exposureTime)}s`;
}

function titleFromFilename(file) {
  const raw = basename(file, extname(file));
  // Camera-default names (DSC_0042, IMG_1234) carry no meaning — drop them.
  if (/^(dsc|img|_dsc|p|dscf|pxl)[\s_-]?\d+$/i.test(raw)) return null;
  return raw.replace(/[_-]+/g, " ").trim();
}

/** "13mm f/2.2 1/800s ISO 160 2026-06-12" → the manifest fields it names. */
function parseSettings(text) {
  const out = {};
  if (!text) return out;
  for (const tok of text.split(/\s+/)) {
    let m;
    if ((m = tok.match(/^(\d+(?:\.\d+)?)mm$/i))) out.focalLength = `${Math.round(+m[1])}mm`;
    else if ((m = tok.match(/^f\/?(\d+(?:\.\d+)?)$/i))) out.aperture = `f/${Number((+m[1]).toFixed(1))}`;
    else if ((m = tok.match(/^(1\/\d+|\d+(?:\.\d+)?)s$/i))) out.shutter = `${m[1]}s`;
    else if ((m = tok.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/)))
      out.date = new Date(Date.UTC(+m[1], m[2] ? +m[2] - 1 : 0, m[3] ? +m[3] : 1)).toISOString();
  }
  const iso = text.match(/\bISO\s*(\d+)/i);
  if (iso) out.iso = `ISO ${iso[1]}`;
  return out;
}

/** Parse order.txt into [{file, title, location, settings}]. Missing file → empty list. */
async function loadOrder() {
  let raw;
  try {
    raw = await readFile(ORDER_FILE, "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [file, title, location, settings] = line.split("|").map((part) => part.trim());
      return { file, title: title || null, location: location || null, settings: parseSettings(settings) };
    });
}

async function main() {
  try {
    await stat(SRC);
  } catch {
    console.error(`No source directory at "${SRC}".`);
    console.error(`Usage: node scripts/build-photos.mjs <sourceDir>`);
    process.exit(1);
  }

  // Start clean so photos dropped from the source don't linger as orphans.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  let files = (await walk(SRC)).sort();
  if (!files.length) {
    console.error(`No images found under "${SRC}".`);
    process.exit(1);
  }

  // Hand-ordering: listed files lead in listed order, the rest follow.
  const order = await loadOrder();
  const entries = new Map(order.map((o) => [o.file.toLowerCase(), o]));
  const listed = new Set(entries.keys());
  if (order.length) {
    const rank = new Map(order.map((o, i) => [o.file.toLowerCase(), i]));
    for (const o of order) {
      if (!files.some((f) => basename(f).toLowerCase() === o.file.toLowerCase()))
        console.warn(`! order.txt lists "${o.file}" but no such file in ${SRC}`);
    }
    const skipped = files.filter((f) => !listed.has(basename(f).toLowerCase()));
    if (skipped.length)
      console.log(`– skipped (not in order.txt): ${skipped.map((f) => basename(f)).join(", ")}`);
    files = files
      .filter((f) => listed.has(basename(f).toLowerCase()))
      .sort((a, b) => rank.get(basename(a).toLowerCase()) - rank.get(basename(b).toLowerCase()));
    if (!files.length) {
      console.error("order.txt matched nothing in the source folder.");
      process.exit(1);
    }
  }

  const photos = [];
  const seen = new Set();

  for (const [i, file] of files.entries()) {
    const rel = relative(SRC, file);
    const parts = rel.split("/");
    const collection = parts.length > 1 ? parts[0] : null;

    // A file the order.txt names but leaves untitled is untitled on purpose —
    // only unlisted files fall back to the filename heuristic.
    const base = basename(file).toLowerCase();
    const entry = entries.get(base);
    const title = listed.has(base) ? entry.title : titleFromFilename(file);
    const location = entry?.location ?? null;
    let slug = slugify(title ?? location ?? basename(file, extname(file)));
    if (!slug || seen.has(slug)) slug = `${slug || "photo"}-${i}`;
    seen.add(slug);

    const image = sharp(file, { failOn: "none" }).rotate(); // honor EXIF orientation
    const meta = await image.metadata();

    const pipeline = image
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" });

    const { info } = await pipeline
      .clone()
      .toFile(join(OUT_DIR, `${slug}.jpg`))
      .then((info) => ({ info }));

    // 20px-wide inline preview — what next/image shows while the full file loads.
    const blur = await sharp(file, { failOn: "none" })
      .rotate()
      .resize(20)
      .webp({ quality: 40 })
      .toBuffer();

    const exif = (await exifr.parse(file, {
      pick: [
        "Make",
        "Model",
        "LensModel",
        "FocalLength",
        "FNumber",
        "ExposureTime",
        "ISO",
        "DateTimeOriginal",
      ],
    }).catch(() => null)) ?? {};

    const ownExif = CAMERA_EXIF_MODEL.test(exif.Model ?? "");
    const exposure = {
      lens: ownExif ? exif.LensModel ?? null : null,
      focalLength: ownExif && exif.FocalLength ? `${Math.round(exif.FocalLength)}mm` : null,
      aperture: ownExif && exif.FNumber ? `f/${Number(exif.FNumber.toFixed(1))}` : null,
      shutter: ownExif ? formatShutter(exif.ExposureTime) : null,
      iso: ownExif && exif.ISO ? `ISO ${exif.ISO}` : null,
      date: exif.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toISOString() : null,
      ...entry?.settings,
    };

    photos.push({
      slug,
      src: `/photography/${slug}.jpg`,
      width: info.width,
      height: info.height,
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      title,
      collection,
      location,
      camera: CAMERA,
      ...exposure,
      orientation: info.width >= info.height ? "landscape" : "portrait",
    });

    process.stdout.write(
      `\r  ${String(i + 1).padStart(3)}/${files.length}  ${slug}`.padEnd(70)
    );
  }

  await writeFile(MANIFEST, JSON.stringify(photos, null, 2) + "\n");

  const collections = [...new Set(photos.map((p) => p.collection).filter(Boolean))];
  console.log(`\n\n✓ ${photos.length} photos → ${OUT_DIR}`);
  console.log(`✓ manifest → ${MANIFEST}`);
  if (collections.length) console.log(`✓ collections: ${collections.join(", ")}`);
}

main().catch((err) => {
  console.error("\n" + err.stack);
  process.exit(1);
});
