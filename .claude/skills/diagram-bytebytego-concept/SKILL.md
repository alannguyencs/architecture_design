---
name: diagram-bytebytego-concept
description: Create a ByteByteGo-style "concept" diagram — a picture whose positions come from data or geometry rather than hand placement (tables, strips and grids of cells, sequence diagrams, timelines, hash rings, trees and mind maps, spatial grids) — as an HTML page that builds SVG with small JavaScript helpers, in the same white-page flow look as diagram-bytebytego-flow, rendered to PNG with Playwright. Use when the user asks to draw a table, a partition log or array of cells, a sequence diagram, a time window or timeline, a consistent-hashing ring, a trie / quadtree / Merkle tree, a chapter mind map, or a geohash grid in the ByteByteGo look, or to redraw a System Design Interview figure of that kind.
---

# ByteByteGo concept diagram

Some figures cannot be hand-placed sensibly: a ring needs points at angles, a log
needs N equal cells, a sequence diagram needs lifelines and time steps. This skill
draws those from data. The page is the same as in `diagram-bytebytego-flow` (white
canvas, pills, boxes, shared icons), plus an SVG layer that JavaScript fills.

Related skills: `diagram-bytebytego-flow` (hand-placed architecture pictures; use it
for boxes and arrows), `diagram-bytebytego-animated` (looping GIF).

## Status

The skill is being built in the order of report item 8.2
(`docs/reports/261014_bytebytego.md`). Done: the setup, the core helpers and the
`table` and `cells` components. Planned, each to be added as `BBG.<name>(spec)`:
`sequence`, `timeline`, `ring`, `tree` (with a mind-map mode), then `spatial`,
`code`, `venn`, `funnel`. Until a component exists, draw with the core helpers.

## Files

| Path (relative to this skill) | What it is |
|---|---|
| `assets/bbg-concept.js` | Core helpers on `window.BBG` (`el`, `group`, `text`, `label`, `measure`, `icon`, `layer`, `define`) and the components `BBG.table`, `BBG.cells` |
| `assets/bbg-concept.css` | Styles for drawn marks: `.c-box`, `.c-outline`, `.c-cell`, `.c-line`, `.c-thin`, `.c-dash`, `.c-strike`, `.c-muted`, fills `.c-green` … `.c-orange`, `text.mono` |
| `assets/bbg-flow.css` | The flow look's tokens and building blocks (generated copy) |
| `assets/bbg-icons.js` | Shared icon sprite and edge markers (generated copy) |
| `assets/bbg-parts.css`, `assets/bbg-parts.js` | Shared extra parts: edge styles, labels, shapes, boxes, variants (generated copies) |
| `templates/starter.html` | Starter page: load order, a strip of cells from an array, servers placed on a circle |
| `templates/table-cells-gallery.html` | One sample of every `table` and `cells` option, each modelled on a book figure — render it to look up an option |
| `templates/mq-isr.html` | Book figure: message-queue 24 (how ISR works) — `cells` strips joined by edges from `.at()` |
| `templates/leaderboard-table.html` | Book figure: gaming-leaderboard 22 (denormalized table) — `table` with a group header |
| `scripts/render.py` | HTML → PNG (`--scale`, `--webp`, `--compare`, `--variant`; generated copy) |

Needs Python `playwright` (with Chromium: `python3 -m playwright install chromium`) and Pillow.

## Make a diagram

1. Copy `templates/starter.html` to `templates/<kebab-name>.html`; set the `.canvas`
   size; keep the load order:
   1. stylesheets `bbg-flow.css`, `bbg-parts.css`, `bbg-concept.css`;
   2. `<script src="../assets/bbg-icons.js">` as the first child of `.canvas`;
   3. hand-placed HTML (title, pills, boxes) inside `.canvas`;
   4. after `.canvas`: `bbg-concept.js`, then the page's own `<script>`, then
      `bbg-parts.js` last.
2. In the page script, get the drawing surface with `const svg = BBG.layer()` and
   build from data:
   - `BBG.el(tag, attrs, parent)` — any SVG element (`'rect'`, `'path'`, …);
   - `BBG.group(parent, x, y, cls)` — a `<g>` moved to `(x, y)`, so a component can
     draw at `0, 0`;
   - `BBG.text(parent, x, y, 'two\nlines', { size, weight, anchor })` — centred text;
   - `BBG.label(parent, x, y, 'fetch', { size })` — text on a white backing, for edges;
   - `BBG.icon(parent, 'db', x, y, w, h)` — a shared icon centred on `(x, y)`.

   Style marks with the `.c-*` classes rather than inline colours; arrows use the
   shared markers (`marker-end="url(#m-arrow)"`).
3. Render from the repo root:

   ```bash
   python3 .claude/skills/diagram-bytebytego-concept/scripts/render.py \
     .claude/skills/diagram-bytebytego-concept/templates/<name>.html \
     data/generated/<name>.png --scale 1
   ```

   Look at the PNG (Read tool) and adjust; use `--scale 2` for the final export.

## Components

Every component takes one object, draws into `spec.parent || BBG.layer()`, and
returns a `<g>` with `width`, `height` and `at(…)`, which gives page coordinates
for edges: `const [x, y] = leader.at(5, 'right')`. The full option list is in the
comment above each component in `assets/bbg-concept.js`; the gallery template
shows each option.

**`BBG.table`** — schema tables, record rows, ranking lists.

```js
BBG.table({ x: 40, y: 120, title: 'url',              // optional title bar
  groups: [{ label: 'Primary key', span: 1 }, { label: 'Attributes', span: 4 }],
  columns: ['user_id', { label: 'score', align: 'right', mono: true }],
  rows: [{ cells: ['id', 'bigint'], key: 'PK' },       // key → adds a key column
         { cells: [...], hl: true }, { cells: [...], strike: true }, ['…', '…']],
  grid: 'all' | 'rows' | 'header' | 'none', frame: 'cylinder', frameLabel: 'Shard 0' });
```

Cells can be objects (`{ t: '2000', cls: 'c-green' }`); columns size themselves
to their text unless `width` is given. `at(row, col, side)` — row `-1` is the
header.

**`BBG.cells`** — strips and grids of cells: logs, partitions, arrays, bit
layouts, buckets, linked lists, queues.

```js
BBG.cells({ x: 80, y: 350, w: 60, h: 90,
  cells: [10, 11, { t: 14, cls: 'c-yellow', ghost: true }] /* or count: 16, start: 0 */,
  dir: 'h' | 'v', cols: 4, gap: 0, on: [0, 1], hl: [3], ghost: [15],
  link: true,                        // linked list; needs gap >= 24
  top: ['1 bit', …], bottom: [...], label: 'Partition-1', frame: true, frameLabel: 'server 1',
  spans: [{ from: 0, to: 9, label: 'segment-1' }],
  pointers: [{ at: 13, side: 'below', label: 'committed offset = 13' }] });
```

Give a cell its own `w` for a bit layout. `at(i, side)` returns the position of
cell `i`.

## Adding a component

Put it in `assets/bbg-concept.js` (or its own file loaded after it) as
`BBG.define('name', spec => { … })`. A component takes one plain object — data
plus a position, e.g. `{ x, y, rows: […] }` — draws into `spec.parent || BBG.layer()`,
and returns the `<g>` it drew, so pages can add marks on top. Add a template that
rebuilds the book figure named for it in report item 8.2.

## Shared kit

`bbg-flow.css`, `bbg-icons.js`, `bbg-parts.css`, `bbg-parts.js` and
`scripts/render.py` are copies of the master files in `.claude/skills/_shared/`.
Edit the master and run `python3 .claude/skills/_shared/sync.py`; never edit the
copies here. The icon list and samples are in
`diagram-bytebytego-flow/templates/kit-gallery.html`.

## Rules

- The header is the title only — no accent bar, no logo or brand name.
- When re-creating someone else's figure, write output to `data/generated/`; book
  figures are copyrighted, so rebuilt figures stay internal.
- Draw with CSS keyframes only if a page is ever animated (see
  `diagram-bytebytego-animated`); the helpers must not use timers.
