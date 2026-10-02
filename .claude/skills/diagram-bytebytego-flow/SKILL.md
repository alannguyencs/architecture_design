---
name: diagram-bytebytego-flow
description: Re-generate or create a diagram in the newer ByteByteGo "flow" style — white page, black pill section headings, dashed grey sections, black-outlined boxes, green job boxes, numbered black step circles, grey-outlined icon cards — as an HTML page rendered to PNG with Playwright. Ships a matched template of data/examples/1780498486178.jpeg (How OpenAI Built Its Data Agent). Use when the user says "bytebytego flow diagram", "re-generate the OpenAI data agent image", "make a pipeline/workflow diagram like ByteByteGo", or asks to rebuild 1780498486178.jpeg (or a similar white-background ByteByteGo post) as code.
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
| `assets/bbg-flow.css` | Colour tokens and building blocks: `.title`, `.pill`, `.step`, `.bx.white/.green/.soft/.grey/.blue`, `.card` / `.card.tool` + `.tag`, `.t` (centred bold label), `.icon` (centred SVG), `svg .section`, `svg .group`, `svg.edges > path` (+ `.thin`) |
| `templates/openai-data-agent.html` | Re-creation of `data/examples/1780498486178.jpeg` on a 1280 × 1654 canvas |
| `scripts/render.py` | HTML → PNG (`--scale`), optional `--webp` and `--compare <reference>` side-by-side sheet |

The template's `<symbol>` sprite holds reusable icons: `db`, `db-pink`, `gdoc`,
`slack`, `notion`, `chat`, `chat-lines`, `chat-pair`, `table`, `annotate`,
`sparkles`, `search`, `memory`, `grid`, `book`, `nodes`, `user`, `openai`,
`building`, `openbook`, `tagicon`, `drop`, `airflow`. Use one with
`<svg class="icon" style="left:X; top:Y;" width="W" height="H"><use href="#db"/></svg>`
(`left/top` is the icon's centre).

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
   1. the icon sprite;
   2. the back SVG layer (`rect.section` dashed grey, `rect.group` dashed green tint);
   3. the header;
   4. the `svg.edges` layer;
   5. pills, boxes, cards, icons and labels.

   Edges go under the boxes, so a line can end at a box centre and still look
   clean.
4. Edges: orthogonal paths with rounded corners
   (`M x y H x2 Q cx cy x3 y3 V y4`), black, 3 px, open chevron head
   `marker-end="url(#ah)"`. Two-way arrows add `marker-start`. Loops use a
   single `Q` curve each way.
5. Mark the reading order with `.step` circles (`left/top` is the circle centre).
6. Render with `scripts/render.py --scale 1`; use `--scale 2` for a sharper
   export once the layout is final.

## Rules

- The header is the title only — no accent bar, no logo or brand name.
- When re-creating someone else's image, write output to `data/generated/`;
  never overwrite files in `data/examples/`.
- Product logos in the sprite (`slack`, `notion`, `airflow`, `openai`, `gdoc`)
  are simplified look-alikes made for this template, not the real marks.
- Style edges with `svg.edges > path` (direct children) so the rule does not
  hit the `<marker>` path.
- In `.card`, keep text in a `<span>` (nowrap) and break lines with `<br>`,
  so the browser never adds a third line.
