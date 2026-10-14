---
name: diagram-bytebytego-animated
description: Re-generate or create an animated ByteByteGo-style diagram as a looping GIF — pastel icons with thick black outlines that move (bob, wiggle, spin, pulse, light up), plus a green streak that runs along every flow line — built as an HTML page and captured frame-by-frame with Playwright, then encoded with ffmpeg. Ships a matched template of data/examples/0_CqXxd5b308ZJ2DSJ.gif (How to Design a System Like YouTube) and a book-figure template (System Design Interview figure 14-4), and shares an icon / shape kit with diagram-bytebytego-flow. Use when the user says "animated diagram", "make a GIF diagram", "re-generate the YouTube GIF", "animate this architecture", or asks to rebuild 0_CqXxd5b308ZJ2DSJ.gif.
---

# ByteByteGo animated diagram

The diagram is a still HTML page; the animation is ordinary CSS keyframes.
`scripts/render_gif.py` pauses every animation, steps the clock one frame at a
time (`animation.currentTime = t`), screenshots each frame, and has ffmpeg
build a GIF with one shared palette. Frames are exact and repeatable — no
screen recording.

Related still-image skills: `diagram-bytebytego-flow`, `diagram-draw-io`.

## What the reference GIF does (measured)

| Property | Value |
|---|---|
| Size | 1329 × 1536 |
| Loop | 75 frames × 30 ms = 2.25 s, loops forever |
| Moving parts | icons only (≈0.2 % of pixels per frame) + a green streak along each line |

Icon motions: upload arrow bobs · load-balancer nodes light up purple in
turn · user-DB head bobs · video-file and camera icons wiggle · transcoding
spinners orbit · clapper play button pulses · envelopes bob in sequence ·
CDN corner dots light up. The flow lines carry a bright green dash that runs
from start to end once per loop and is hidden at frame 0.

## Files

| Path (relative to this skill) | What it is |
|---|---|
| `assets/bbg-animated.css` | Colour tokens, loop timing (`--loop` 2.25 s, `--half`, `--third`), header (`.title`, `.title-pill`, `.rule`), `.svc` dashed service boxes (`.api/.status/.server`), `.step`, `.t`, `.icon`, edges and `path.flow` streaks, animation classes `.a-bob .a-wiggle .a-spin .a-pulse .a-light` |
| `assets/bbg-icons.js` | Shared icon sprite and edge markers (generated — see "Shared kit" below) |
| `assets/bbg-parts.css` | Shared extra parts: edge styles, labels, shapes, fills, boxes, legend, labelled steps (generated copy) |
| `assets/bbg-parts.js` | Draws `.shp` outlines and applies the page variant (generated copy) |
| `templates/youtube-system-design.html` | Re-creation of the YouTube GIF on a 1329 × 1536 canvas, plus a small script that adds a streak copy of every edge |
| `templates/youtube-upload-flow.html` | Book figure 14-4 (video uploading flow) in this look, built mostly from shared icons — the template to copy for book figures |
| `scripts/render_gif.py` | HTML → GIF (`--loop-ms`, `--frame-ms`, `--scale`, `--compare ref.gif`, `--keep-frames`, `--variant NAME`); also writes `<name>_frame0.png` (generated copy) |
| `scripts/render.py` | HTML → still PNG (`--compare` uses the reference's first frame; `--variant` repeatable; generated copy) |

Needs Python `playwright` (Chromium: `python3 -m playwright install chromium`),
Pillow, and `ffmpeg` on PATH.

## Re-generate the YouTube GIF

Run from the repo root:

```bash
python3 .claude/skills/diagram-bytebytego-animated/scripts/render_gif.py \
  .claude/skills/diagram-bytebytego-animated/templates/youtube-system-design.html \
  data/generated/youtube-system-design.gif \
  --compare data/examples/0_CqXxd5b308ZJ2DSJ.gif
```

Output: `youtube-system-design.gif` (1329 × 1536, 75 frames, ≈1.2 MB, about 10 s
to render), `_frame0.png`, and `_compare.png`. The compare sheet has the
reference on the left and the render on the right, at 0, ¼, ½ and ¾ of the
loop. **Look at the compare sheet** (Read tool), fix gaps in the template and
re-render.

For layout-only work, the still render is faster:

```bash
python3 .claude/skills/diagram-bytebytego-animated/scripts/render.py \
  .claude/skills/diagram-bytebytego-animated/templates/youtube-system-design.html \
  data/generated/youtube-still.png --scale 1 --compare data/examples/0_CqXxd5b308ZJ2DSJ.gif
```

## Make a new animated diagram

1. Copy the template to `templates/<kebab-name>.html`; set `.canvas` size;
   keep the header, the edge `<svg>` (with its `#ah` marker) and the closing
   `<script>`.
2. Build and check the **still** first (`render.py`). Lay out the flow on a big
   loop: curved edges are cubic paths (`M … C …`), and icons sit on the
   curves with opaque fills so they break the line.
3. Then animate. Put the moving part of an icon in its own `<g>`/element with
   one class (for a shared icon, wrap the whole `<use>`:
   `<svg width="72" height="72"><g class="anim a-spin"><use href="#worker" width="72" height="72"/></g></svg>`;
   an animation *inside* a `<use>` cannot be seeked, so an icon whose parts move
   separately — load-balancer nodes, CDN dots, queue envelopes — stays inline):
   - `.a-bob` — up/down (arrows, heads, envelopes);
   - `.a-wiggle` — rotate ±7° (file, camera icons; add `.anim` so it turns
     around its own centre);
   - `.a-spin` — full turn per loop. Set `style="transform-origin:<cx>px <cy>px"`
     in the icon's viewBox units, because the orbiting dot makes its bounding box
     off-centre;
   - `.a-pulse` — scale up and down (add `.anim`);
   - `.a-light` — fill white → purple → white (circles; leave out `fill`).

   Stagger copies with a negative `animation-delay` (e.g. `-0.56s`) so they
   move one after another.
4. Every duration must divide the loop (`--loop`, `--half`, `--third`) so the last
   frame runs straight back into the first. If you change `--loop`, pass the same
   value as `--loop-ms`.
5. Streaks are automatic for every `svg.edges > path`; add `class="no-flow"` to
   a path to skip it. With the shared kit, use `marker-end="url(#m-tri)"` for this
   skill's filled head; the edge classes, `.elabel`, `.shp` shapes, `.step.lbl`
   (labels like `3a.1`) and variants (`data-hl` / `data-only`) work as in
   `diagram-bytebytego-flow`.
6. Render with `render_gif.py`. For a smaller file: fewer moving parts, a
   bigger `--frame-ms` (e.g. 40), or `gifsicle -O3` afterwards.

## Shared kit

Load `<script src="../assets/bbg-icons.js"></script>` as the first child of
`.canvas`, link `../assets/bbg-parts.css` after `bbg-animated.css`, and load
`../assets/bbg-parts.js` last in `<body>`. Icons: `<use href="#id"/>`, recoloured
with `style="--icon-fill:…"`; the list and samples are in
`diagram-bytebytego-flow/templates/kit-gallery.html`. These files and
`scripts/render.py` are copies of `.claude/skills/_shared/`; edit the master and run
`python3 .claude/skills/_shared/sync.py`. `scripts/render_gif.py` is a shared copy
too. Never edit the copies here.

## Rules

- The header is the title and the title pill only — no accent bar, no logo
  or brand name.
- When re-creating someone else's image, write output to `data/generated/`;
  never overwrite files in `data/examples/`.
- Animate with CSS keyframes only (no `setTimeout` / `requestAnimationFrame`):
  the capture script can only seek animations that `document.getAnimations()`
  returns.
- The streak uses `pathLength="1000"` with `stroke-dasharray: 90 1910`. The
  gap must be longer than the path, or a second dash appears at the end of the
  line at frame 0.
- Icons (Redis-like cache, bucket, server, etc.) are simplified drawings made
  for this template, not the real marks.
