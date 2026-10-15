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
`table`, `cells`, `sequence`, `timeline`, `ring`, `tree`, `spatial`, `code`, `venn`
and `funnel` components — every component the report planned — and the animation
helpers that `scripts/render_gif.py` turns into a looping GIF (see "Animate").

## Files

| Path (relative to this skill) | What it is |
|---|---|
| `assets/bbg-concept.js` | Core helpers on `window.BBG` (`el`, `group`, `text`, `label`, `measure`, `icon`, `layer`, `define`) and the components `BBG.table`, `BBG.cells`, `BBG.sequence`, `BBG.timeline`, `BBG.ring`, `BBG.tree`, `BBG.spatial`, `BBG.code`, `BBG.venn`, `BBG.funnel` |
| `assets/bbg-concept.css` | Styles for drawn marks: `.c-box`, `.c-outline`, `.c-cell`, `.c-line`, `.c-thin`, `.c-dash`, `.c-strike`, `.c-muted`, `.c-event`, `.c-lock`, `.c-note`, `.c-window`, fills `.c-green` … `.c-orange`, line colours `.c-red-line` / `.c-blue-line` / `.c-green-line`, ring marks `.c-ring-line`, `.c-node`, `.c-key`, `.c-*-arc`, tree marks `.c-leaf`, `.c-note-group`, `text.mono` |
| `assets/world-110m.js` | Country outlines for the `spatial` world base: Natural Earth 1:110m Admin 0 v5.1.2 (public domain), 177 countries, 117 KB; rebuild with `scripts/build_world.py` |
| `assets/d3-hierarchy.min.js` | d3-hierarchy 3.1.2 (ISC licence, header kept), stored locally so rendering never needs the network; `BBG.tree` uses its tidy layout for top-down trees |
| `assets/bbg-flow.css` | The flow look's tokens and building blocks (generated copy) |
| `assets/bbg-icons.js` | Shared icon sprite and edge markers (generated copy) |
| `assets/bbg-parts.css`, `assets/bbg-parts.js` | Shared extra parts: edge styles, labels, shapes, boxes, variants (generated copies) |
| `templates/starter.html` | Starter page: load order, a strip of cells from an array, servers placed on a circle |
| `templates/table-cells-gallery.html` | One sample of every `table` and `cells` option, each modelled on a book figure — render it to look up an option |
| `templates/mq-isr.html` | Book figure: message-queue 24 (how ISR works) — `cells` strips joined by edges from `.at()` |
| `templates/leaderboard-table.html` | Book figure: gaming-leaderboard 22 (denormalized table) — `table` with a group header |
| `templates/sequence-timeline-gallery.html` | One sample of each `sequence` (vertical layout) and `timeline` option, modelled on book figures |
| `templates/wallet-tcc-try.html` | Book figure: digital-wallet 7 (TCC try phase) — `sequence` with `dir: 'right'` lanes, events, a lock bar, a note |
| `templates/rate-limiter-sliding-counter.html` | Book figure: rate-limiter 4-11 (sliding window counter) — `timeline` with windows, stacks, a marker and spans |
| `templates/ring-gallery.html` | One sample of each `ring` option: hash-space ticks, virtual-node ranges, replicas, coordinator put/ACK, heartbeat mesh, a removed server |
| `templates/consistent-hashing-lookup.html` | Book figure: consistent-hashing 5-7 (server lookup) — `ring` with servers, keys and clockwise hops |
| `templates/tree-gallery.html` | One sample of each `tree` option: trie with a highlighted path, quadtree with edge labels, folder tree, short mind map |
| `templates/autocomplete-trie-cache.html` | Book figure: autocomplete 13-8 (top-k cached at each trie node) — `tree` with notes |
| `templates/chapter-summary-message-queue.html` | Book figure: the message-queue chapter summary — `tree` in `mind` mode; every Volume 2 summary has this shape |
| `templates/spatial-gallery.html` | One sample of each `spatial` option: search radius, geofence, nine geohash cells, routing tiles, Hilbert curve, growing search area, quadtree squares, world with highlighted countries |
| `templates/geohash-world-grid.html` | Book figure: proximity 8 (geohash divides the world) — two `spatial` calls on the world base |
| `templates/code-funnel-gallery.html` | `code` in its three themes (SQL, HTML, editor, terminal) and a `funnel` (hotel QPS) |
| `templates/cap-theorem.html` | Book figure: key-value 6-1 (CAP theorem) — `venn` with three sets |
| `templates/animated-concepts.html` | All four animations in one GIF: `ring.walk`, `sequence.play`, `timeline.slide`, `cells.step` |
| `scripts/build_world.py` | Downloads the pinned Natural Earth file and writes `assets/world-110m.js` |
| `scripts/render_gif.py` | HTML → looping GIF: pauses every animation, seeks it frame by frame, encodes with ffmpeg (`--loop-ms`, `--frame-ms`, `--keep-frames`; generated copy) |
| `scripts/render.py` | HTML → PNG (`--scale`, `--webp`, `--compare`, `--variant`; generated copy) |

Needs Python `playwright` (with Chromium: `python3 -m playwright install chromium`) and Pillow;
GIFs also need `ffmpeg` on PATH.

## Make a diagram

1. Copy `templates/starter.html` to `templates/<kebab-name>.html`; set the `.canvas`
   size; keep the load order:
   1. stylesheets `bbg-flow.css`, `bbg-parts.css`, `bbg-concept.css`;
   2. `<script src="../assets/bbg-icons.js">` as the first child of `.canvas`;
   3. hand-placed HTML (title, pills, boxes) inside `.canvas`;
   4. after `.canvas`: `d3-hierarchy.min.js`, `world-110m.js` (only for world
      maps), `bbg-concept.js`, then the page's own `<script>`, then `bbg-parts.js`
      last.
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

**`BBG.sequence`** — messages between actors over time. Every point is
`(actor, t)`; `dir: 'down'` is a UML sequence diagram (actor boxes on top, dashed
lifelines), `dir: 'right'` puts actors on lanes with time running right (two-phase
commit, TCC).

```js
BBG.sequence({ x: 60, y: 110, dir: 'down', gap: 300, step: 44, length: 9,
  actors: [{ id: 'c', label: 'Client', icon: 'phone' }, { id: 's', label: 'Server', sub: '(API)' }],
  messages: [{ from: 'c', to: 's', t: 1, label: 'Pay $10', step: '1' },
             { from: 's', to: 'c', t: 2, mark: 'x', color: 'red', dash: true },
             { from: 'a', to: 'a', t: 3, self: true, back: 1, label: 'Aggregate' },
             { from: 'coord', to: 'a', t: 0.6, t2: 2.4, label: 'Try' }],   // t2 → diagonal
  events: [{ actor: 'a', t: 2.4, label: 'A=$1' }, { actor: 'a', t: 3, kind: 'tick', label: 'lock A' }],
  spans: [{ actor: 'a', from: 1, to: 5 }, { actor: 'a', from: 3.3, to: 7, kind: 'lock' }],
  separators: [{ t: 3.7, label: 'connection closed' }], phases: [{ from: 0, to: 4, label: 'Prepare' }],
  notes: [{ actor: 'a', t: 5, text: 'UPDATE …', mono: true, dy: -70 }],
  sides: [{ actor: 's', t: 2, text: 'Payment failed' }], dots: [9], footer: true });
```

`at(actor, t)` returns a point's position.

**`BBG.timeline`** — a time axis with what happens along it.

```js
BBG.timeline({ x: 110, y: 200, width: 740, from: 0, to: 180, tickEvery: 30, unit: 'Second',
  plotH: 300, yLabel: 'Number of requests', axis: 'bottom' | 'top' | 'none', grid: true,
  stacks: [{ t: 1, n: 3, extra: 2 }],                       // extra = grey "rate limited" squares
  windows: [{ from: 18, to: 78, h: 300, cls: 'c-soft', line: 'green', label: 'Rolling minute' },
            { row: 2, from: 0, to: 60, label: 'Window 1' }],  // row → a box on a labelled row
  rows: [{ label: 'Event Time', line: true }], events: [{ row: 0, t: 20, label: '1' }],
  markers: [{ t: 78, label: 'Current time' }], spans: [{ from: 18, to: 60, label: '70%', y: 245 }],
  series: [{ points: [[0, .3], [1, .6]] }], candles: [{ t: 1, open, close, high, low }], yFrom, yTo });
```

Span `y` is measured up from the axis (negative = below it). `tx(t)` and `py(v)`
return page positions for extra marks. An event's `note` (with `noteColor`) puts a
word such as `miss` / `hit` under its circle on a white backing, so the dashed
`grid` never strikes through it; other text inside the rows should use `BBG.label`
for the same reason. Row labels move left by themselves to stay clear of an event
at the very start of the axis.

**`BBG.ring`** — a hash ring.

```js
BBG.ring({ cx: 620, cy: 420, r: 230,
  nodes: [{ id: 's0', at: 40 },                      // at = degrees clockwise from 12 o'clock
          { id: 'k0', at: 352, kind: 'key' },        // also kind 'empty' and 'box' (a coordinator)
          { id: 's1_0', at: 90 }],                   // s<n>… ids get server n's colour; or cls: 'c-green'
  hops:  [{ from: 'k0', to: 's0', dash: true, color: 'red', out: 34 }],   // clockwise, outside the ring
  arcs:  [{ from: 's0_0', to: 's1_1', cls: 'c-blue-arc', out: 22 }],      // a server's range
  links: [{ from: 'coord', to: 's0', label: 'put(key1, val1)', back: 'ACK', backDash: true },
          { from: 's0', to: 's1', pair: true, color: 'blue' }],           // pair = both ways
  ticks: [{ at: 0, labels: ['xn', 'x0'] }] });
```

`at(id)` returns a node's position; `point(deg, radius)` any point on or off the
ring. Several hops into one server: give each a different `out` (innermost = the
shortest sweep) and their arrowheads are spread round the server automatically,
the innermost nearest the side it comes from, so the legs never cross; `spread: 32`
on the ring sets the minimum degrees between heads (widened to keep 22 px apart on
small nodes; `0` turns it off), and `end: ±deg` on one hop turns just that head. Put the server legend in HTML (`.bx f-purple` …), as the template does.

**`BBG.tree`** — tries, quadtrees, folder trees and chapter mind maps.

```js
BBG.tree({ x: 40, y: 120, mode: 'down' | 'mind' | 'right', arrows: true, level: 100, gap: 22,
  root: { label: '', tag: 'root', children: [
    { label: 'b', note: '[best: 35, bet: 29]', children: [               // note: cached list beside it
      { label: 'bee: 20', leaf: true, hl: true, edge: { label: 'nw', color: 'blue', bold: true, dash: true } },
      'bet: 29' ] },                                                     // a string is a plain node
    { label: '4m', kind: 'circle' }, { label: '80', kind: 'square' },   // also 'box', 'text', 'folder'
  ] } });
```

`down` is a top-down tree with straight edges; `mind` is a left-to-right mind map
with curved branches (the root is a box, the rest plain text unless `kind: 'box'`);
`right` is an indented tree with elbow lines (folders). `down` uses d3-hierarchy's
tidy tree, so shallow and deep branches share horizontal space (the quadtree is
half as wide as with one column per leaf); notes and the labels beside circles
and squares are counted in the spacing. `mind` and `right` give every leaf its own
row and centre each parent on its children — a tidy layout would let text at
different depths collide there. Give nodes an `id` to use `at(id, side)`.

**`BBG.spatial`** — maps and spatial grids.

```js
BBG.spatial({ x: 60, y: 180, width: 560, height: 560,
  base: 'plain' | 'world' | 'streets',
  world: { projection: 'mercator', crop: [-180, -85, 180, 85], countries: { USA: 'c-purple' }, graticule: 30, axes: true },
  streets: { angle: -28, spacing: 70 },
  grid: { cols: 4, rows: 4, labels: [['01 01', …], …], hl: [[1, 1, 'c-green']], bold: [[0, 0]] },
  splits: [{ rect: [0, 0, 0.5, 0.5], cols: 2, rows: 2, labels, bold: true }],   // subdivide part of the frame
  points: [{ at: [0.5, 0.5], label: 'me', cls: 'c-yellow' }, { ll: [-100, 40], icon: 'user' }],
  circles: [{ at: [0.5, 0.5], r: 110 }], polygons: [{ points: [[0.2, 0.3], …], label: 'Geofence' }],
  paths: [{ points: [...], color: 'red' }], callouts: [{ ll: [104, 35], dx: 40, dy: -60, label: 'Asia' }],
  hilbert: { order: 3 } });
```

`at` is a fraction of the frame (0..1 from the top-left); `ll` is longitude,
latitude on a world base. A point outside the frame (`at` below 0 or above 1) is
drawn unclipped beside the map — the nearest thing a search does *not* read;
`clip: false` forces that. Country codes are Natural Earth `ADM0_A3` (USA, CHN,
BRA, DEU …). Street-level figures use the schematic `streets` base instead of real
map tiles: those need attribution and the network, and a drawn street grid fits
the ByteByteGo look better.

**`BBG.code`** — `BBG.code({ x, y, text, lang: 'sql' | 'html' | 'js' | 'shell' | 'plain', theme: 'light' | 'dark' | 'terminal', title, size })`.
Light syntax colouring; `dark` adds an editor window bar; leading spaces are kept.

**`BBG.venn`** — `BBG.venn({ cx, cy, r, sets: [{ label, cls }, …], overlaps: { '01': 'CA', '02': 'CP', '12': 'AP' } })`, two or three sets.

**`BBG.funnel`** — `BBG.funnel({ x, y, width, height, levels: [{ label, cls }, …], upright: false })`; the first level is the widest, `upright` makes a pyramid.

## Animate

Some components can also move, for a looping GIF. Each method adds Web Animations
(`element.animate`), which `render_gif.py` pauses and seeks frame by frame, so every
frame is exact. One loop is `BBG.LOOP` ms (2250 by default); set it at the top of
the page script and pass the same value as `--loop-ms`.

| Method | What moves |
|---|---|
| `ring.walk({ from: 'k0', to: 's0', start: 0, end: 0.45 })` | a token walks clockwise along the ring and waits at the server |
| `sequence.play()` | a token runs along each message in time order, one message per share of the loop |
| `timeline.slide({ row: 0, from: 0, to: 3, by: 1, count: 3, label })` | a window steps along the axis (`smooth: true` glides) |
| `cells.step({ cells: [3, 4, 5], label: 'consumer offset', fill: 'c-green' })` | a pointer steps from cell to cell, filling cells as it passes |

`start` / `end` are fractions of the loop, so several motions can take turns. For
anything else, the core has `BBG.travel(parent, points, { from, to })`,
`BBG.steps(node, offsets)`, `BBG.showDuring(node, from, to)` and `BBG.sample(path)`.
These motions tell a story and start again at the end of the loop; for motion that
runs continuously (bobbing icons, flowing streaks) use `diagram-bytebytego-animated`.

```bash
python3 .claude/skills/diagram-bytebytego-concept/scripts/render_gif.py \
  .claude/skills/diagram-bytebytego-concept/templates/animated-concepts.html \
  data/generated/animated-concepts.gif --loop-ms 3000
```

## Adding a component

Put it in `assets/bbg-concept.js` (or its own file loaded after it) as
`BBG.define('name', spec => { … })`. A component takes one plain object — data
plus a position, e.g. `{ x, y, rows: […] }` — draws into `spec.parent || BBG.layer()`,
and returns the `<g>` it drew, so pages can add marks on top. Add a template that
rebuilds the book figure named for it in report item 8.2.

## Shared kit

`bbg-flow.css`, `bbg-icons.js`, `bbg-parts.css`, `bbg-parts.js`,
`scripts/render.py` and `scripts/render_gif.py` are copies of the master files in `.claude/skills/_shared/`.
Edit the master and run `python3 .claude/skills/_shared/sync.py`; never edit the
copies here. The icon list and samples are in
`diagram-bytebytego-flow/templates/kit-gallery.html`.

## Rules

- The header is the title only — no accent bar, no logo or brand name.
- When re-creating someone else's figure, write output to `data/generated/`; book
  figures are copyrighted, so rebuilt figures stay internal.
- Animate only with CSS keyframes or `element.animate`, never timers
  (`setTimeout`, `requestAnimationFrame`): `render_gif.py` can only seek animations
  that `document.getAnimations()` returns.
