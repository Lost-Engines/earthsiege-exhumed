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

The home and gallery illustrations are actual captures of the public viewers. `scripts/capture-images.mjs` captures them with Playwright; `scripts/prepare-images.py` publishes the lossless captures and prepares the social card with Pillow. They are not generated concept art. The screenshot tool supports `SITE_URL` and `CHROMIUM_PATH`.

## Deployment

Pushes to `master` and manual workflow dispatches build, check and upload `dist/`, then deploy with the official GitHub Pages artifact/deploy actions. Pull requests run validation without deployment. Repository Settings → Pages must use **GitHub Actions** as its source. No custom domain is required. The native C++ repository is private at publication; add its public links only when it is released.

The site uses relative URLs and the canonical project URL <https://lost-engines.github.io/earthsiege-exhumed/>. A `<base>` on the 404 page keeps links working from unknown URL depths. The main research archive is not assumed to be hosted: supporting notes are published inside this site.

## Editorial scope

Keep the introduction intelligible to someone who has never played Earthsiege. Separate original data, verified code behavior, browser inspection choices and interpretation. Do not call the northern map arrangement a confirmed developer signature, or claim a key combination is a first discovery. See [content/research-sources.md](content/research-sources.md).

Write for curious readers, including people who have never played the game. Describe what they can see, hear or learn. Keep useful uncertainties close to the relevant finding, without repeating disclaimers throughout the page. Avoid formulaic contrasts and phrases such as “not a claim that” or “rebuilding it meant”. Use a normal keyboard hyphen when a dash is needed; do not use em dashes.

## Graphics-engine article

The article at `graphics/` is authored in `content/graphics-engine.md`. It uses original renderer output, retained DOSBox captures and separately labelled explanatory SVGs. `src/graphics.js` adds the drawing-progress slider, layer selection and affine-triangle comparison; every example retains a still image without JavaScript. Nothing animates automatically.

To regenerate its assets from the sibling analysis workspace:

```sh
cd ../earthsiege-reverse
PYTHONPATH=tools .venv/bin/python tools/build_graphics_article.py
cd ../earthsiege-exhumed
python3 scripts/import-graphics.py ../earthsiege-reverse
npm run build
npm run check
```

The analysis generator requires its existing Unicorn/Pillow environment and original game data. The importer needs Python 3's standard library. It refreshes the relevant research notes, generates the six SVG diagrams and records all published hashes in `public/graphics/manifest.json`. `provenance.json` retains the original executable hash and per-image capture method. These dependencies are only for regeneration; the committed article builds with the ordinary Node workflow.

With the preview server running, use `CHROMIUM_PATH=/usr/bin/chromium npm run check:graphics`. It checks progress endpoints, environment switching, texture interpolation and overlay controls, mobile layout, dark mode and the JavaScript-disabled article. `npm run check:browser` also covers the new navigation and article across its responsive sweep.

## Damage and physics article

The article at `combat/` is authored in `content/combat.md`. Its original-code
captures and explanatory diagrams are published under `public/combat/`.
`src/combat.js` adds component-loss selection, shield-threshold inspection and
the salvage slider. No animation starts automatically; the static article and
figures remain useful with JavaScript disabled.

To regenerate:

```sh
cd ../earthsiege-reverse
PYTHONPATH=tools .venv/bin/python tools/build_combat_article.py
cd ../earthsiege-exhumed
python3 scripts/import-combat.py ../earthsiege-reverse
npm run build
npm run check
CHROMIUM_PATH=/usr/bin/chromium npm run check:combat
```

The last command needs the preview server described above. It checks actual
captured shield and salvage boundaries, six damage states, the plotted marker,
keyboard input, nine viewport widths, navigation, dark mode and the no-JS
fallback. The static checker verifies every combat asset's hash. The importer
requires only Python's standard library and generates seven SVG diagrams;
regenerating original captures uses the analysis workspace's Unicorn/Pillow
setup and original data. Neither is a public build prerequisite.

Keep the article's scope tied to the base CD executable in its provenance.
Controlled internal-damage inputs isolate reactor consequences; the still model
views precede collapse animation. Salvage curves isolate valuation and do not
bypass the eligibility rules in a real mission. Weapon payload figures include
the firing charge but precede difficulty scaling and do not describe DPS.
