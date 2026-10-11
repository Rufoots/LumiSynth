# Idea: Dimensional UI — decompose the image from the ground up

_Saved 2026-10-11. Pick this up at the start of the next session._

## The problem

The current UI (STRUCTURE → COLOR rack → FX rack) treats effects as a flat list of
looks. That isn't how the app actually gets used. In practice you **take the video
apart and rebuild it in layers**: edges first, then what grows out of the edges,
then what fills between them, then depth, then colour, then depth applied to colour.

The new UI should follow that order, so the sidebar reads as one sequence that
decomposes the image.

## Proposed chain

```
SOURCE (video / webcam)
  ↓
0  ANALYSE    (hidden, computed once per frame and shared by every later stage)
              edge map · luma · motion · depth field · RF-DETR segmentation mask
  ↓
1  EDGE       draw the outlines of the image
  ↓
2  EXTEND     stretch and pull pixels out from those edges
  ↓
3  FILL       structural fill between the edges
  ↓
4  DIMENSION  depth, parallax, extrusion
  ↓
5  COLOR      the current colour rack
  ↓
6  SCULPT     add depth to the colour (lighting from depth/normals)
  ↓
7  FX RACK
  ↓
OUTPUT
```

### 1 · EDGE: the outline
How the edges get drawn. Some ideas:
- **ASCII edges**: glyphs picked by edge direction (`/ | \ -`), not by luma
- **Spectral edges**: a prism-like chromatic split along the edge normal
- **Ink / XDoG**: clean comic-style lines (difference-of-Gaussians with a threshold)
- **Topogram contours**: iso-luma contour lines, like a map
- **Fringe edges**: interference fringes whose density follows edge slope (from the
  Interferometry Notebook rule "fringe density must encode a real quantity")
- **Motion edges**: only edges that changed since the previous frame
- **Neon / bloom halo** around edges

### 2 · EXTEND: stretch things out from the edges
The edge map is the **seed or mask**: pixels get pulled out *from the edges*, not
across the whole frame.
- **Pixel sort**: sort spans that start or stop at an edge
- **Melt**: drip downward from edges
- **Wisp**: smoke-like advection from the edges
- **Streak / smear** along the edge normal or the motion vector
- More candidates: slit-scan, datamosh flow, flowfield feedback seeded at edges

### 3 · FILL: structure between the edges
The other structure shaders that fill the gaps and separate regions: ASCII fill,
halftone/dither, cells, mosaic, erode, FreqMod raster, etc.

### 4 · DIMENSION: where wisp / streak / holograph go
The open question was where effects that are both structural and dimensional belong
(wisp streak, holograph). Proposed answer:

> **Treat dimension as a field, not just a stage.** Compute one depth field in
> ANALYSE (from luma, distance to the nearest edge, motion, or the segmentation mask).
> Every stage can read it. The DIMENSION stage holds the effects whose main job is
> to *displace by depth*: holograph, parallax, extrude, wisp-streak in depth mode.

So wisp can sit in EXTEND (seeded from edges) *or* in DIMENSION (driven by depth),
using the same shader with a different input. That removes the need to pick one
home for it.

### The better route to dimension: RF-DETR segmentation
Pixel sort and the extrude-style effects fake depth. The better approach we worked
out is to **cut the subject out with the RF-DETR segmentation model and extrude
that**.
- The seg mask goes into ANALYSE as the best depth source (subject = near,
  background = far)
- DIMENSION gets a **Cutout Extrude** effect: the masked subject pushed forward,
  with sides and shadow
- Bonus: a subject/background split, so FILL or COLOR can run differently on each
  (ASCII background, clean subject, and so on)

### 6 · SCULPT: dimension applied to colour
Sculpt runs after COLOR and lights the coloured image using the shared
depth/normal field, so colour gets volume.

## Roadmap for the next few updates
1. **UI re-bucket (no new shaders).** Rebuild the sidebar as the stages above and move
   existing effects into EDGE / EXTEND / FILL / DIMENSION / COLOR / SCULPT. Bump
   `STORAGE_KEY`, because the saved-state schema changes.
2. **Shared analysis textures.** Edge map plus depth field rendered once per frame
   into FBOs; EXTEND effects take the edge map as their seed.
3. **New EDGE looks.** Direction-aware ASCII edges, spectral edges, XDoG ink.
4. **RF-DETR segmentation → mask texture.** Cutout Extrude in DIMENSION;
   subject/background split.
5. **Sculpt reads the shared depth field** instead of working out its own.

## Open questions
- Is each stage a single slot, or a rack like COLOR (0–3 slots)?
- Can the user reorder stages, or is the order fixed? Fixed order is the point of
  the idea; reordering could be an "advanced" option.
- Does RF-DETR run in the browser (ONNX/WebGPU) or on the backend? This decides
  the latency and the frame rate of the mask.

## References
- "Depth page" candidates found in your artifacts:
  - Interferometry Notebook (depth from disagreeing layers):
    https://claude.ai/code/artifact/cae8dce7-d75b-4cab-ba4d-a38678a3581f
  - Holograph Notebook: https://claude.ai/artifact/PpQ7Y5An9MndpiDycAs4E2
- Note: the cloud clone of `rufoots/lumisynth` is behind the local build (it has no
  sculpt, pixel sort, wisp, holograph, etc.), so effect names above follow how
  they're used in the app, not this repo's `schemas.js`.
