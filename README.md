# renowden.dev

Photography portfolio. Next.js 16 (App Router, Turbopack), Tailwind v4, deployed on Vercel.

The gallery lives at `/photography`; `/` redirects there.

## Develop

```bash
npm install
npm run dev
```

## Adding photographs

Exports never go into `public/` by hand. Drop full-size files in a source folder
(`photos-src/`, flat or one subfolder per collection), list the ones you want
published in `src/data/order.txt`, then:

```bash
npm run photos photos-src
```

That resizes each image to 2400px on the long edge, writes it to
`public/photography/`, and records dimensions, a blur placeholder, and whatever
EXIF the file carries into `src/data/photos.json`.

`order.txt` is the curation list and it does two jobs:

- **Only listed files are published**, top to bottom in the order given.
- **Position sets size.** One photograph per beat, centred; each hangs at a
  different size than the one before it, and the first and last are always
  large. Moving a line in `order.txt` changes how large that photograph hangs.

Add a title with `filename | Title` (the title also becomes the URL slug, so
every frame is linkable at `/photography#slug`).

## Deploy

Pushes to `main` deploy automatically. Preview any branch with `npx vercel`, and
promote with `npx vercel --prod`.
