# Maintaining Earthsiege Exhumed

Use Node.js 22 or newer. The Pages workflow uses Node 24. `npm ci`, `npm run build`, and `npm run check` need only this checkout. `dist/` is generated and ignored; `public/` contains the committed display snapshot.

## Local preview and checks

```sh
npm ci
npm run build
npm run check
SITE_PREFIX=/earthsiege-exhumed npm run preview
```

Open <http://127.0.0.1:4178/earthsiege-exhumed/>. `SITE_PREFIX` checks project Pages paths; omit it to serve at `/`. Use `PORT` to choose another local port.

The static checker covers HTML links and anchors, dynamic model/texture/launch dependencies, gallery thumbnails, sky and audio assets, tour destinations, and accidentally bundled installation files. The browser smoke test is described in `scripts/browser-check.mjs`; it requires Chromium (`npx playwright install chromium`, or `CHROMIUM_PATH=/usr/bin/chromium`). It checks the real controls and resource loading rather than mocking the renderer.

## Refreshing research data

These commands are maintainer operations, not build or deployment prerequisites:

```sh
node scripts/import-analysis.mjs ../earthsiege-reverse/analysis
node scripts/render-excerpts.mjs ../earthsiege-reverse/analysis/music
npm run build
npm run check
```

The importer reads the established analysis browser sources. It copies model and animation display data, palette and texture pixels, thumbnails, and a curated launch catalogue: one preferred launch context per supported source mission, with two captured random variations. Campaign examples prefer the main battle set. It also extracts the level-camera cloud atlas and unwrapped panorama for each of 24 world settings, and copies selected supporting research notes.

Public-specific changes live in the importer, the page templates, and `src/public-viewers.js`. Recovered animation mathematics and model assembly are copied unchanged. The source mission diagnostics remain private UI elements; there is no public artificial-counter mode. The display snapshot uses script-based data transport inherited from the research tools.

`public/data-provenance.json` records source hashes. `public/audio/provenance.json` records both full-render and excerpt hashes. Excerpts start eight seconds into the existing renders and last 24 seconds; FFmpeg FLAC compression level 12 changes no decoded sample amplitudes. Run the excerpt script with FFmpeg installed. Original render gain is retained in the metadata; it is not applied a second time.

Illustrations are actual captures of the public viewers. `scripts/capture-images.mjs` captures them with Playwright; `scripts/prepare-images.py` publishes the lossless captures and prepares the social card with Pillow. They are not generated concept art. The screenshot tool supports `SITE_URL` and `CHROMIUM_PATH`.

## Deployment

Pushes to `master` and manual workflow dispatches build, check and upload `dist/`, then deploy with the official GitHub Pages artifact/deploy actions. Pull requests run validation without deployment. Repository Settings → Pages must use **GitHub Actions** as its source. No custom domain is required. The native C++ repository is private at publication; add its public links only when it is released.

The site uses relative URLs and the canonical project URL <https://lost-engines.github.io/earthsiege-exhumed/>. A `<base>` on the 404 page keeps links working from unknown URL depths. The main research archive is not assumed to be hosted: supporting notes are published inside this site.

## Editorial scope

Keep the introduction intelligible to someone who has never played Earthsiege. Separate original data, verified code behavior, browser inspection choices and interpretation. Do not call the northern map arrangement a confirmed developer signature, or claim a key combination is a first discovery. See [content/research-sources.md](content/research-sources.md).
