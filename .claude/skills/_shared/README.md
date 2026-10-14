# Shared ByteByteGo kit

Master copies of the parts that `diagram-bytebytego-flow`,
`diagram-bytebytego-animated` and `diagram-bytebytego-concept` share. Each skill
keeps its own copy so it still works when copied on its own; `sync.py` keeps the
copies in step.

| File | What it is | Copied to (in each skill) |
|---|---|---|
| `bbg-icons.svg` | Icon `<symbol>`s and edge `<marker>`s | `assets/bbg-icons.js` (wrapped so a `<script>` tag inserts the sprite) |
| `bbg-parts.css` | Edge styles, edge labels, shapes, fills, boxes, legend, labelled steps | `assets/bbg-parts.css` |
| `bbg-parts.js` | Draws `.shp` outlines; applies the page variant (`#v=name`) | `assets/bbg-parts.js` |
| `bbg-flow.css` | The flow look's tokens and building blocks | `assets/bbg-flow.css` (flow and concept only) |
| `render.py` | HTML → PNG, with `--compare` and `--variant` | `scripts/render.py` |
| `render_gif.py` | HTML → looping GIF: seeks every animation frame by frame, encodes with ffmpeg | `scripts/render_gif.py` (animated and concept only) |
| `sync.py` | Writes the copies; `--check` exits 1 if any copy is stale | — |

```bash
python3 .claude/skills/_shared/sync.py          # after editing anything here
python3 .claude/skills/_shared/sync.py --check  # before committing
```

The sprite is loaded by a script, not by `<use href="file.svg#id">`, because
Chromium blocks external SVG references between `file://` pages.

To see every icon and part, render the gallery:

```bash
python3 .claude/skills/diagram-bytebytego-flow/scripts/render.py \
  .claude/skills/diagram-bytebytego-flow/templates/kit-gallery.html \
  data/generated/kit-gallery.png --scale 1
```

Icon rules: thick black outline (about 3 px at 48 px), pastel fill, the main fill
written as `style="fill:var(--icon-fill, <default>)"` so a page can recolour it.
Brand-like icons are simplified look-alikes, never the real marks.
