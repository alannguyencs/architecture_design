---
name: diagram-bytebytego-flow
description: Re-generate or create a diagram in the newer ByteByteGo "flow" style — white page, black pill section headings, dashed grey sections, black-outlined boxes, green job boxes, numbered black step circles, grey-outlined icon cards — as an HTML page rendered to PNG with Playwright. Ships a matched template of data/examples/1780498486178.jpeg (How OpenAI Built Its Data Agent). Also ships a book-figure template (System Design Interview figure 1-11), variant templates that draw several near-identical figures from one page, and a shared icon / shape kit. Use when the user says "bytebytego flow diagram", "re-generate the OpenAI data agent image", "make a pipeline/workflow diagram like ByteByteGo", asks to rebuild 1780498486178.jpeg (or a similar white-background ByteByteGo post) as code, or wants a System Design Interview figure redrawn in the ByteByteGo look.
---

# ByteByteGo flow diagram

Build the diagram as one HTML page — an icon sprite, an SVG back layer for
sections, an SVG edge layer, then absolutely positioned boxes, cards and
labels — and screenshot it with headless Chromium.

Related skills: `diagram-bytebytego-animated` (looping GIF) and
`diagram-draw-io` (draw.io book figures).

## Files

| Path (relative to this skill) | What it is |
|---|---|
| `assets/bbg-flow.css` | (Generated copy) Colour tokens and building blocks: `.title`, `.pill`, `.step`, `.bx.white/.green/.soft/.grey/.blue`, `.card` / `.card.tool` + `.tag`, `.t` (centred bold label), `.icon` (centred SVG), `svg .section`, `svg .group`, `svg.edges > path` (+ `.thin`) |
| `assets/bbg-icons.js` | Shared icon sprite and edge markers (generated — see "Shared kit" below) |
| `assets/bbg-parts.css` | Shared extra parts: edge styles, `.elabel`, `.shp` shapes, `.f-*` fills, `.hbox`, `.split`, `.tlist`, `.mono`, `.hl`, `.failed`, `.qstrip`, `svg .lane`, `svg .solid`, `.legend`, `.step.lbl` / `.step.sm` (generated copy) |
| `assets/bbg-parts.js` | Draws `.shp` outlines and applies the page variant (generated copy) |
| `templates/openai-data-agent.html` | Re-creation of `data/examples/1780498486178.jpeg` on a 1280 × 1654 canvas |
| `templates/scale-web-data-tier.html` | Book figure 1-11 (web tier, data tier, cache, CDN) in this look — the template to copy for book figures |
| `templates/youtube-dag-variants.html` | Variant example: book figures 14-10 … 14-21 from one page (`data-hl`) |
| `templates/mq-ack-variants.html` | Variant example: message-queue figures 25–27 from one page (`data-only`), with `.qstrip` cells |
| `templates/web-crawler-pages.html` | Book figure 9-1 (web pages linked into a graph) — uses the shared `.webpage` part |
| `templates/kit-gallery.html` | Every shared icon by id, and a sample of each edge, shape and box — render it to look up a part |
| `scripts/render.py` | HTML → PNG (`--scale`), optional `--webp`, `--compare <reference>` side-by-side sheet, `--variant NAME` (repeatable; generated copy) |

Icons come from the shared sprite: put `<script src="../assets/bbg-icons.js"></script>`
as the first child of `.canvas`, then use one with
`<svg class="icon" style="left:X; top:Y;" width="W" height="H"><use href="#db"/></svg>`
(`left/top` is the icon's centre). Recolour an icon's main fill with
`style="--icon-fill:#ffa5a5"`. Groups: clients (`laptop`, `phone`, `monitor`, `tv`,
`browser`, `user`, `user-mobile`), network (`dns`, `lb`, `cdn`, `cloud`, `gateway`),
compute (`server`, `rack`, `cluster`, `worker`, `function`, `spinner`), storage (`db`,
`db-stack`, `nosql`, `sql-db`, `kv-db`, `graph-db`, `cache`, `cache-stack`, `redis`,
`bucket`, `bucket-line`, `disk`, `doc`, `folder`, `zip`, `log`, `table`, `memory`),
messaging (`envelope`, `queue`, `stream`, `chat*`), domain (`bell`, `push`, `sms`,
`lock`, `cold`, `bank`, `card`, `cash`, `coin`, `cart`, `ring-buffer`, `state`,
`funnel`), markers (`x-mark`, `check`, `block-arrow`), media (`video-file`, `clapper`,
`camera`, `upload`, `user-db`) and the OpenAI template's icons. Render
`templates/kit-gallery.html` to see them all.

Needs Python `playwright` (with Chromium: `python3 -m playwright install chromium`) and Pillow.

## Re-generate the OpenAI data agent image

Run from the repo root:

```bash
python3 .claude/skills/diagram-bytebytego-flow/scripts/render.py \
  .claude/skills/diagram-bytebytego-flow/templates/openai-data-agent.html \
  data/generated/openai-data-agent.png --scale 1 \
  --compare data/examples/1780498486178.jpeg
```

Output: `data/generated/openai-data-agent.png` (1280 × 1654) and
`openai-data-agent_compare.png`. **Look at the compare sheet** (Read tool) and fix
any gap by editing the template; re-render until both sides match.

## Make a new diagram in this style

1. Copy the template to `templates/<kebab-name>.html`; set `.canvas` size.
   Keep the `<defs>` sprite and delete the rest of the body content.
2. When copying a reference image, overlay a 50 px coordinate grid on it
   (Pillow `ImageDraw`, labels every 100 px), split it into bands of about 560 px,
   and read positions off the grid. The connector lines join most shapes into
   one blob, so colour-based measuring alone does not work here.
3. Stack order inside `.canvas` (later = on top):
   1. the icon sprite (`<script src="../assets/bbg-icons.js">`);
   2. the back SVG layer (`rect.section` dashed grey, `rect.group` dashed green tint);
   3. the header;
   4. the `svg.edges` layer;
   5. pills, boxes, cards, icons and labels.

   Edges go under the boxes, so a line can end at a box centre and still look
   clean.
4. Edges: orthogonal paths with rounded corners
   (`M x y H x2 Q cx cy x3 y3 V y4`), black, 3 px, open chevron head
   `marker-end="url(#m-arrow)"`. Two-way arrows add `marker-start`. Loops use a
   single `Q` curve each way. Also available:
   - straight diagonals (`M x1 y1 L x2 y2`), curves (`C …`), undirected (no marker);
   - path classes `dash`, `dot`, `red`, `blue`, `green`, `bold`, `faded`, with the
     matching heads `#m-arrow-red`, `#m-arrow-blue`, `#m-arrow-green`; `#m-tri-ink`
     (filled head), `#m-dot`; span arrows put `#m-span` on both ends;
   - `.elabel` for a label on an edge (white chip, `.chip` adds a border, `--rot`
     tilts it); `.legend` explains the edge styles;
   - the `block-arrow` icon for a fat hollow "becomes" arrow.
5. Mark the reading order with `.step` circles (`left/top` is the circle centre);
   `.step.lbl` holds a label such as `M1` or `4.a`, `.step.sm` is smaller.
6. Shapes beyond boxes: `<div class="shp diamond f-yellow" style="left;top;width;height">`
   — `diamond`, `hexagon`, `ellipse`, `cylinder`, `parallelogram`, `brace`, `bracket`
   (`data-dir`), drawn by `bbg-parts.js` (load it last in `<body>`). Other boxes:
   `.hbox` (header + bullets), `.split` (cells, `.v` stacks), `.tlist` (+ `.mono`),
   `.qstrip` (small cell strip), `.webpage` (a small browser page: window dots, blue
   `<a>` link lines or grey `.wp-line` text lines), fills `.f-*`, states `.hl` and `.failed`; zones
   `svg .lane` (divider line) and `svg .solid` (solid outline).
7. Several figures that differ only in a highlight or a few labels: write one page
   and mark elements with `data-hl="v1 v2"`, `data-only="v1"` or `data-not="v1"`;
   render with `--variant v1 --variant v2 …` (one PNG each, `out-v1.png`). Set a
   default with `<html data-variant="v1">`. See the two `*-variants.html` templates.
8. Render with `scripts/render.py --scale 1`; use `--scale 2` for a sharper
   export once the layout is final.

## Shared kit

`assets/bbg-flow.css`, `assets/bbg-icons.js`, `assets/bbg-parts.css`,
`assets/bbg-parts.js` and `scripts/render.py` are copies of the master files in
`.claude/skills/_shared/`, shared with `diagram-bytebytego-animated` and
`diagram-bytebytego-concept`. To add an icon or a part, edit the
master and run `python3 .claude/skills/_shared/sync.py` (`--check` reports stale
copies). Never edit the copies here.

## Rules

- The header is the title only — no accent bar, no logo or brand name.
- When re-creating someone else's image, write output to `data/generated/`;
  never overwrite files in `data/examples/`.
- Product logos in the sprite (`slack`, `notion`, `airflow`, `openai`, `gdoc`)
  and brand-like icons (`redis`, `sql-db`, …) are simplified look-alikes, not the
  real marks.
- Style edges with `svg.edges > path` (direct children) so the rule does not
  hit the `<marker>` path.
- In `.card`, keep text in a `<span>` (nowrap) and break lines with `<br>`,
  so the browser never adds a third line.
