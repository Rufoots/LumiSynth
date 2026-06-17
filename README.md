# LumiSynth

LumiSynth is a browser-based real-time video instrument built with vanilla JavaScript, raw WebGL2, Canvas 2D, Vite, Playwright, and Cloudflare Pages Functions.

It takes a local video, image, webcam feed, or a generative GLSL shader, runs a GPU effect pipeline, detects and tracks visual regions in real time, and draws expressive overlays on top. The product is designed like a synthesizer: immediate controls, dense but readable UI, no framework hiding the rendering pipeline.

## Product Snapshot

Users can:

- Upload a video or image, open a webcam, or launch a generative shader (Dive Clouds, Phantom Star, Star Nest, Hyperkart).
- Choose a STRUCTURE effect for geometry and pattern (ASCII, Erode, Watershed, Pixel Sort, Melt, FreqMod, Motion Edge, and more).
- Pick a single COLOR effect (Maps, Unique dreamcore pack, or custom Chroma ramp).
- Fine-tune with the always-on GRADE pass (hue rotate + saturation).
- Add up to three FX RACK effects: stateful feedback passes (Flow Field, Drag, Luma Drag, Tunnel, Burn-In, Wobble Tape) and stateless signal effects (CRT, Scanlines, Degrade, Noise, and others).
- Track blobs using motion, luma, dark, saturation, edge, sharp, or color-key detection.
- Draw overlays: shapes, labels, and line styles (velocity, pulse, constellation, MST, star, hub curves).
- Add Track FX: echo blobs, radar sweep, heatmap residue.
- Set an export resolution (720p / 1080p / 4K) before saving a PNG snapshot or recording a video clip.
- Login for gated exports and cloud preset flows, with local internal login available before the real D1 database is configured.

The media stays in the browser. The Cloudflare backend stores account/session data, presets, and export events — not uploaded video files.

## Architecture

```text
Video / image / webcam / generative shader
  -> blobDetector.js      CPU detection: motion/luma/dark/sat/edge/sharp/color-key
  -> kalman.js            nearest-neighbor identity tracking + Kalman smoothing
  -> oneEuroFilter.js     display-level smoothing for tracked blobs
  -> STRUCTURE            WebGL2 full-frame geometry/pattern effect
  -> COLOR                single WebGL2 color effect (maps / unique / chroma)
  -> GRADE                always-on hue-rotate + saturation pass
  -> FX RACK              0-3 chained WebGL2 passes (feedback or stateless)
  -> PER-BLOB             optional CPU filter inside blob regions
  -> overlays.js          Canvas 2D shapes, labels, line styles, Track FX
  -> Snap / Rec           PNG or MediaRecorder canvas export at chosen resolution
```

The GL modules share one offscreen WebGL2 canvas, one context, one uploaded video texture, one quad VAO, and a pair of chain FBOs. `main.js` orchestrates frame upload, effect dispatch, ping-pong rendering, and final 2D canvas compositing. FX RACK feedback effects maintain per-slot ping-pong FBO pairs in `glFx.js` for inter-frame accumulation.

## Technical Highlights

| Area | What to look at |
|---|---|
| Real-time rendering | Shared WebGL2 context in `src/glContext.js`, shader dispatch in `src/glFilters.js` and `src/glFx.js` |
| Pipeline design | STRUCTURE → COLOR → GRADE → FX RACK chain in `src/main.js`, compose pass in `src/glCompose.js` |
| Feedback effects | Per-slot ping-pong FBOs in `src/glFx.js`; `resetFxFeedback()` wired into state resets |
| Generative sources | Raymarched GLSL library in `src/shaderSource.js`; registry-driven knob panel, own GL context |
| Tracking | Blob detector in `src/blobDetector.js`, Kalman tracker in `src/kalman.js`, One Euro smoothing in `src/oneEuroFilter.js` |
| Creative overlays | Track shapes, labels, MST/star/constellation/curved hub lines, echo/radar/heatmap in `src/overlays.js` |
| Export | Resolution picker (DISP/720p/1080p/4K), quality-labeled filenames, bitrate-scaled MediaRecorder |
| Backend slice | Cloudflare Pages Function API in `functions/api/[[path]].js`, D1 schema in `migrations/0001_auth_presets.sql` |
| Quality gates | Vite build, Playwright smoke tests |

## Tech Stack

- Vanilla JavaScript modules
- Raw WebGL2 and GLSL
- Canvas 2D
- Vite
- Playwright
- Cloudflare Pages Functions + D1 (scaffolded)

Intentional constraints: no TypeScript, no React/Svelte/Solid, no Tailwind, no shadcn, no three.js.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

```bash
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
npm run test:e2e   # Playwright smoke tests
npm run cf:dev     # Cloudflare Pages local dev (Functions + D1)
npm run cf:deploy  # deploy to Cloudflare Pages
```

## Internal Login (Before Cloudflare D1)

On `localhost` or `127.0.0.1`:

1. Enter any email in the Account panel and click **Send Code**.
2. Use the 6-digit code shown in the toast (no email sent).
3. Test Snap/Rec export gating and preset save/load/delete locally.

Internal auth and presets are stored in `localStorage`. Not the production auth path.

## Adding Shaders With BigBrain Mode

In a Cursor chat, say `use BigBrain mode`, then provide the TouchDesigner GLSL source, the intended effect slug, whether it belongs in STRUCTURE, COLOR, or FX RACK, and the `uParams.xyzw` mapping. BigBrain mode reads `.cursor/skills/bigbrain-mode/WEBGL_REFERENCE.md` and wires the effect through dispatcher, schemas, UI, and verification.

## Cloudflare Hosting

Frontend: Cloudflare Pages serves the built Vite app from `dist/`.
Backend: `functions/api/[[path]].js` as a Cloudflare Pages Function with D1 binding named `DB`.

Production env vars:

```text
RESEND_API_KEY
AUTH_FROM_EMAIL
APP_ORIGIN
```

The real D1 `database_id` is intentionally not committed — add it after creating the Cloudflare D1 database.

## GitHub Pages

The static frontend is also deployable to GitHub Pages via the included workflow (`.github/workflows/deploy.yml`). Auth and cloud presets require the Cloudflare backend and will not function on GitHub Pages.

Live: `https://sourikduttanyu.github.io/lumisynth/`

## Code Layout

```text
.
├── index.html
├── src/
│   ├── main.js              # state, render loop, UI wiring
│   ├── schemas.js           # defaults, effect schemas, rack factories
│   ├── shaderSource.js      # generative GLSL source library
│   ├── glContext.js         # shared WebGL2 context and FBO chain
│   ├── glCompose.js         # STRUCTURE → COLOR compose pass
│   ├── glFilters.js         # stateless full-frame GL effects
│   ├── glFx.js              # stateful FX RACK feedback effects
│   ├── ascii.js             # WebGL2 ASCII renderer
│   ├── blobDetector.js      # CPU blob detection modes
│   ├── kalman.js            # tracker and stable IDs
│   ├── oneEuroFilter.js     # adaptive display smoothing
│   ├── overlays.js          # Canvas 2D tracking overlay and Track FX
│   ├── filters.js           # CPU per-blob filters
│   └── style.css
├── functions/api/[[path]].js
├── migrations/0001_auth_presets.sql
├── tests/e2e/smoke.spec.js
├── .github/workflows/deploy.yml
├── vite.config.js
├── playwright.config.js
├── wrangler.toml
└── package.json
```

## Troubleshooting

**Camera will not open**: allow camera access in browser permissions.

**No blobs appear**: lower threshold, increase max blobs, or switch detection mode.

**WebGL effects do not render**: use a browser with WebGL2 support; check the console for shader compile errors.

**Cloudflare API unavailable locally**: use `npm run dev` with the internal login fallback, or configure Pages Functions/D1 and run `npm run cf:dev`.
