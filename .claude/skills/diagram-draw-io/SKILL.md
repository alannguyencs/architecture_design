---
name: diagram-draw-io
description: Re-generate or create an architecture diagram in the "System Design Interview" book style (draw.io look — cyan tiers, green servers, blue DB cylinders, blue arrows, Arial labels) as an HTML page, rendered to PNG with Playwright. Ships a matched template of data/examples/figure-1-6-L2YNDDKF.png. Use when the user says "draw.io diagram", "sdi book diagram", "re-generate figure 1-6", "make a diagram like the System Design Interview book", or asks to rebuild a draw.io-style figure from data/examples as code.
---

# System Design Interview book diagram

Build the figure as one HTML page — absolutely positioned icons and labels plus
one SVG layer for arrows and dashed tiers — then screenshot it with headless
Chromium. For ByteByteGo post styles, use `diagram-bytebytego-flow` (still)
or `diagram-bytebytego-animated` (GIF) instead.

## Files

| Path (relative to this skill) | What it is |
|---|---|
| `assets/sdi-book.css` | Colour tokens and building blocks: `.tier` (solid cyan box), `.t` (Arial 42 px label), `.t.mask` (white background, sits on a line), `.t.code` (grey hostname highlight), `.icon`, `svg.edges` (`> path` arrows, `> rect.tier-dashed` dashed tiers) |
| `templates/figure-1-6.html` | Re-creation of `data/examples/figure-1-6-L2YNDDKF.png` (user → DNS → load balancer → web tier → master/slave DB) on a 1725 × 1827 canvas |
| `scripts/render.py` | HTML → PNG (`--scale`), optional `--webp` and `--compare <reference>` side-by-side sheet |

Icons drawn inline in the template, ready to copy: laptop, phone, DNS globe,
load balancer, green server, blue DB cylinder.

Needs Python `playwright` (with Chromium: `python3 -m playwright install chromium`) and Pillow.

## Re-generate figure 1-6

Run from the repo root:

```bash
python3 .claude/skills/diagram-draw-io/scripts/render.py \
  .claude/skills/diagram-draw-io/templates/figure-1-6.html \
  data/generated/figure-1-6.png --scale 1 \
  --compare data/examples/figure-1-6-L2YNDDKF.png
```

The canvas uses the reference's own pixel size, so `--scale 1` gives a
1725 × 1827 PNG, the same size as the original. Then **look at
`data/generated/figure-1-6_compare.png`** (Read tool) and fix any gap by editing
the template; re-render until the two sides match.

## Make a new figure in this style

1. Copy `templates/figure-1-6.html` to `templates/<kebab-name>.html` and set the
   canvas size in its `<style>`.
2. When copying a reference image, measure it before placing anything: find the
   shapes by colour (Pillow + `scipy.ndimage.label` on the palette colours in
   `sdi-book.css`) and use their bounding boxes as `left/top/width/height`.
3. Order inside `.canvas`:
   1. solid `.tier` boxes;
   2. the `svg.edges` layer (dashed tiers as `rect.tier-dashed`, arrows as `path` with
      `marker-end="url(#ah)"`, two-way arrows with `marker-start` too);
   3. icons;
   4. labels.

   Later elements sit on top, so a `.t.mask` label hides the line under it,
   like the "Write" / "Read" labels.
4. Arrows are straight lines (`M x y L x y`) in `#2e68a1`, 5 px, with the
   filled, notched draw.io "classic" head.
5. Render with `scripts/render.py`; pass `--compare` when there is a reference.

## Rules

- When re-creating someone else's figure, write output to `data/generated/`;
  never overwrite files in `data/examples/`.
- Style arrows with `svg.edges > path` (direct children) so the rule does not
  hit the `<marker>` path — otherwise the heads render hollow.
- Dashed tiers are SVG `rect`s, not CSS `border: dashed` — CSS dashes are too
  short to match draw.io and their length cannot be set.
