// ByteByteGo concept helpers: build SVG drawings from data instead of hand-placed
// coordinates. This file is the core; each component (table, cells, sequence,
// timeline, ring, tree, …) registers itself with BBG.define and is then called as
// BBG.<name>(spec).
//
// Load order in a page:
//   <script src="../assets/bbg-icons.js"></script>   first child of .canvas
//   <script src="../assets/bbg-concept.js"></script> after .canvas, then the page's own <script>
//   <script src="../assets/bbg-parts.js"></script>   last
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // Create an SVG element, set its attributes, append it to parent (if given).
  // Attribute names are written as in SVG ('stroke-width', 'text-anchor').
  function el(tag, attrs = {}, parent = null) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      node.setAttribute(k, v);
    }
    if (parent) parent.append(node);
    return node;
  }

  // A group (<g>) moved to (x, y), with an optional class.
  function group(parent, x = 0, y = 0, cls = null) {
    return el('g', { transform: x || y ? `translate(${x} ${y})` : null, class: cls }, parent);
  }

  // Text with "\n" line breaks; (x, y) is the centre of the whole block unless
  // anchor/baseline say otherwise. size and lineHeight are in px.
  function text(parent, x, y, str, { size = 16, weight = 600, anchor = 'middle', lineHeight = 1.25, cls = null, fill = null } = {}) {
    const lines = String(str).split('\n');
    const step = size * lineHeight;
    const top = y - (step * (lines.length - 1)) / 2;
    const t = el('text', {
      x, y: top, 'text-anchor': anchor, 'dominant-baseline': 'central',
      'font-size': size, 'font-weight': weight, class: cls, fill,
    }, parent);
    lines.forEach((line, i) => {
      el('tspan', { x, dy: i ? step : 0 }, t).textContent = line;
    });
    return t;
  }

  // Place a shared icon (from bbg-icons.js) centred on (x, y).
  function icon(parent, id, x, y, w, h = w, attrs = {}) {
    return el('use', { href: `#${id}`, x: x - w / 2, y: y - h / 2, width: w, height: h, ...attrs }, parent);
  }

  // The drawing surface: an SVG layer that covers the whole .canvas, added on
  // first use. Components draw into it, under any HTML boxes placed after it.
  function layer(name = 'concept') {
    const canvas = document.querySelector('.canvas');
    let svg = canvas.querySelector(`:scope > svg.layer.${name}`);
    if (!svg) {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      svg = el('svg', { class: `layer ${name}`, width: w, height: h, viewBox: `0 0 ${w} ${h}` });
      canvas.append(svg);
    }
    return svg;
  }

  // Width in px of one line of text, as the page font would draw it.
  const MONO = '"SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  let ctx = null;
  function measure(str, { size = 16, weight = 600, mono = false } = {}) {
    ctx = ctx || document.createElement('canvas').getContext('2d');
    ctx.font = `${weight} ${size}px ${mono ? MONO : getComputedStyle(document.body).fontFamily}`;
    return Math.max(...String(str).split('\n').map(line => ctx.measureText(line).width));
  }

  // Text on a white backing, so it can sit on top of a line (like .elabel).
  function label(parent, x, y, str, opts = {}) {
    const { size = 15, weight = 600, padX = 6, padY = 3, lineHeight = 1.25 } = opts;
    const lines = String(str).split('\n').length;
    const w = measure(str, { size, weight, mono: opts.mono }) + 2 * padX;
    const h = lines * size * lineHeight + 2 * padY;
    const anchor = opts.anchor || 'middle';
    const left = anchor === 'start' ? x - padX : anchor === 'end' ? x - w + padX : x - w / 2;
    const g = el('g', { class: 'c-label' }, parent);
    el('rect', { x: left, y: y - h / 2, width: w, height: h, rx: 5, fill: '#fff' }, g);
    text(g, x, y, str, { size, weight, anchor, lineHeight, cls: opts.mono ? 'mono' : opts.cls });
    return g;
  }

  // ---- Animation (for scripts/render_gif.py) ----
  // Everything uses the Web Animations API (element.animate), which
  // document.getAnimations() returns, so render_gif.py can pause and seek it frame by
  // frame. One loop is BBG.LOOP ms; pass the same value to render_gif.py --loop-ms.
  const LOOP = 2250;
  const tr = p => `translate(${p[0]}px, ${p[1]}px)`;
  function loopAnimate(node, keyframes) {
    return node.animate(keyframes, { duration: BBG.LOOP, iterations: Infinity, easing: 'linear' });
  }
  // Points along an SVG path element (every `step` px).
  function sample(path, step = 6) {
    const len = path.getTotalLength(), n = Math.max(2, Math.ceil(len / step));
    return Array.from({ length: n + 1 }, (_, i) => { const q = path.getPointAtLength(len * i / n); return [q.x, q.y]; });
  }
  // A token that runs along `points` during the part [from, to] of the loop and is
  // hidden outside it (hold: true keeps it at the end until the loop restarts).
  function travel(parent, points, { from = 0, to = 1, r = 8, cls = 'c-token', hold = false } = {}) {
    const dot = el('circle', { r, class: cls }, parent);
    const first = points[0], last = points[points.length - 1], kf = [];
    if (from > 0) kf.push({ offset: 0, transform: tr(first), opacity: 0 }, { offset: from, transform: tr(first), opacity: 0 });
    points.forEach((p, i) => kf.push({ offset: from + (to - from) * i / (points.length - 1), transform: tr(p), opacity: 1 }));
    if (to < 1) kf.push({ offset: Math.min(1, to + 1e-4), transform: tr(last), opacity: hold ? 1 : 0 }, { offset: 1, transform: tr(last), opacity: hold ? 1 : 0 });
    loopAnimate(dot, kf);
    return dot;
  }
  // Move `node` through `offsets` ([dx, dy] each), holding each for an equal share of the loop.
  function steps(node, offsets) {
    const n = offsets.length, kf = [];
    offsets.forEach((o, i) => kf.push({ offset: i / n, transform: tr(o) }, { offset: (i + 1) / n - 1e-4, transform: tr(o) }));
    kf.push({ offset: 1, transform: tr(offsets[n - 1]) });
    return loopAnimate(node, kf);
  }
  // Show `node` only during the part [from, to] of the loop.
  function showDuring(node, from, to = 1) {
    const kf = [{ offset: 0, opacity: from > 0 ? 0 : 1 }];
    if (from > 0) kf.push({ offset: from - 1e-4, opacity: 0 }, { offset: from, opacity: 1 });
    if (to < 1) kf.push({ offset: to, opacity: 1 }, { offset: to + 1e-4, opacity: 0 });
    kf.push({ offset: 1, opacity: to < 1 ? 0 : 1 });
    return loopAnimate(node, kf);
  }

  const BBG = {
    NS, MONO, el, group, text, icon, layer, measure, label,
    LOOP, sample, travel, steps, showDuring, animate: loopAnimate,
    components: {},
    // Register a component: BBG.define('ring', spec => { … }); then BBG.ring({ … }).
    define(name, fn) {
      if (this[name]) throw new Error(`BBG.${name} already exists`);
      this.components[name] = fn;
      this[name] = fn;
    },
  };
  window.BBG = BBG;
})();

// ---------------------------------------------------------------------------
// table — schema tables, record rows, ranking lists.
//
// BBG.table({
//   x, y,                              top-left corner
//   title: 'url',                      optional title bar (titleFill: 'c-green')
//   groups: [{ label: 'Primary key', span: 1 }, { label: 'Attributes', span: 4 }],
//   columns: ['user_id', { label: 'score', align: 'right', mono: true, muted: true, width: 90 }],
//   rows: [
//     ['lovelove', 309],                                   plain row
//     { cells: ['id', 'bigint'], key: 'PK' },              key marker → adds a key column
//     { cells: [...], hl: true },  { cells: [...], strike: true },  { cells: [...], fill: 'c-soft' },
//     ['…', '…'],
//   ],
//   cells may be objects: { t: '2000', cls: 'c-green', weight: 800 }
//   size: 16, rowH, padX: 14, grid: 'all' | 'rows' | 'header' | 'none',
//   headFill: 'c-grey', frame: 'cylinder', frameLabel: 'Shard 0', parent
// })
// Returns the <g>; g.width, g.height and g.at(row, col, side) give positions
// (row/col count body rows and the caller's columns; side: center, left, right, top, bottom).
// ---------------------------------------------------------------------------
BBG.define('table', spec => {
  const s = { x: 0, y: 0, size: 16, padX: 14, grid: 'all', headFill: 'c-grey', titleFill: 'c-green', radius: 10, ...spec };
  const fs = s.size, line = fs * 1.25;
  const rowH = s.rowH || Math.round(fs * 2.2);
  const cols = (s.columns || []).map(c => (typeof c === 'string' ? { label: c } : { ...c }));
  const rows = s.rows.map(r => (Array.isArray(r) ? { cells: r } : { ...r, cells: [...r.cells] }));
  const asCell = v => (v !== null && typeof v === 'object' ? { ...v, t: String(v.t ?? '') } : { t: v === undefined || v === null ? '' : String(v) });
  rows.forEach(r => { r.cells = r.cells.map(asCell); });

  const keyed = rows.some(r => r.key);
  if (keyed) {
    cols.unshift({ label: s.keyLabel || '', align: 'center', weight: 800, isKey: true });
    rows.forEach(r => r.cells.unshift({ t: r.key || '', weight: 800 }));
  }
  const ncol = Math.max(cols.length, ...rows.map(r => r.cells.length));
  while (cols.length < ncol) cols.push({ label: '' });
  const hasHead = cols.some(c => c.label);

  // Column widths: widest of header and cells, unless given.
  const widths = cols.map((c, i) => {
    if (c.width) return c.width;
    let w = BBG.measure(c.label || '', { size: fs, weight: 700 });
    rows.forEach(r => {
      const cell = r.cells[i];
      if (cell) w = Math.max(w, BBG.measure(cell.t, { size: fs, weight: cell.weight || c.weight || 500, mono: c.mono }));
    });
    return Math.max(Math.ceil(w + 2 * s.padX), c.isKey ? 44 : 40);
  });
  const xs = [0];
  widths.forEach(w => xs.push(xs[xs.length - 1] + w));
  const tw = xs[xs.length - 1];

  // Rows top to bottom: title, groups, header, body (multi-line cells grow their row).
  let y = 0;
  const band = (h) => { const top = y; y += h; return { top, h }; };
  const titleBand = s.title ? band(Math.round(rowH * 1.2)) : null;
  const groupBand = s.groups ? band(rowH) : null;
  const headBand = hasHead ? band(rowH) : null;
  const bodyBands = rows.map(r => {
    const lines = Math.max(1, ...r.cells.map(c => c.t.split('\n').length));
    return band(rowH + (lines - 1) * line);
  });
  const th = y;

  // Frame (cylinder) sits around the table; the table moves down inside it.
  const outer = BBG.group(s.parent || BBG.layer(), s.x, s.y, 'c-table');
  let ox = 0, oy = 0;
  if (s.frame === 'cylinder') {
    const pad = 22, ry = 26, fw = tw + 2 * pad;
    const labelH = s.frameLabel ? fs * 1.6 : 0;
    const fh = th + 2 * ry + labelH + 2 * pad;
    BBG.el('path', { d: `M0 ${ry} V${fh - ry} A${fw / 2} ${ry} 0 0 0 ${fw} ${fh - ry} V${ry}`, class: 'c-box' }, outer);
    BBG.el('ellipse', { cx: fw / 2, cy: ry, rx: fw / 2, ry, class: 'c-box' }, outer);
    if (s.frameLabel) BBG.text(outer, fw / 2, 2 * ry + labelH / 2 + 4, s.frameLabel, { size: fs * 1.05, weight: 700 });
    ox = pad; oy = 2 * ry + labelH + pad / 2;
    outer.width = fw; outer.height = fh;
  } else {
    outer.width = tw; outer.height = th;
  }
  const g = BBG.group(outer, ox, oy);

  // Clip fills to the rounded outline.
  const clipId = `c-clip-${Math.random().toString(36).slice(2, 9)}`;
  const clip = BBG.el('clipPath', { id: clipId }, BBG.el('defs', {}, g));
  BBG.el('rect', { width: tw, height: th, rx: s.radius }, clip);
  const fills = BBG.el('g', { 'clip-path': `url(#${clipId})` }, g);
  BBG.el('rect', { width: tw, height: th, class: 'c-white' }, fills);

  const cellText = (str, x0, w, top, h, { align = 'left', weight = 500, mono = false, muted = false, size = fs } = {}) => {
    const x = align === 'center' ? x0 + w / 2 : align === 'right' ? x0 + w - s.padX : x0 + s.padX;
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
    const cls = [mono ? 'mono' : '', muted ? 'c-muted' : ''].join(' ').trim() || null;
    return BBG.text(g, x, top + h / 2, str, { size, weight, anchor, cls });
  };

  if (titleBand) {
    BBG.el('rect', { y: titleBand.top, width: tw, height: titleBand.h, class: s.titleFill }, fills);
    BBG.text(g, tw / 2, titleBand.top + titleBand.h / 2, s.title, { size: fs * 1.15, weight: 800 });
  }
  if (groupBand) {
    BBG.el('rect', { y: groupBand.top, width: tw, height: groupBand.h, class: s.headFill }, fills);
    let c = keyed ? 1 : 0;
    s.groups.forEach(gr => {
      const x0 = xs[c], x1 = xs[Math.min(c + (gr.span || 1), ncol)];
      cellText(gr.label, x0, x1 - x0, groupBand.top, groupBand.h, { align: 'center', weight: 700 });
      gr.x0 = x0; gr.x1 = x1;
      c += gr.span || 1;
    });
  }
  if (headBand) {
    BBG.el('rect', { y: headBand.top, width: tw, height: headBand.h, class: s.headFill }, fills);
    cols.forEach((c, i) => cellText(c.label || '', xs[i], widths[i], headBand.top, headBand.h, { align: c.align, weight: 700 }));
  }
  rows.forEach((r, ri) => {
    const b = bodyBands[ri];
    const rowFill = r.hl ? 'c-yellow' : r.fill;
    if (rowFill) BBG.el('rect', { y: b.top, width: tw, height: b.h, class: rowFill }, fills);
    r.cells.forEach((cell, ci) => {
      if (cell.cls) BBG.el('rect', { x: xs[ci], y: b.top, width: widths[ci], height: b.h, class: cell.cls }, fills);
      const c = cols[ci];
      cellText(cell.t, xs[ci], widths[ci], b.top, b.h, {
        align: cell.align || c.align, weight: cell.weight || c.weight || 500,
        mono: cell.mono ?? c.mono, muted: r.strike || cell.muted || c.muted,
      });
    });
    if (r.strike) {
      const x0 = xs[keyed ? 1 : 0] + s.padX / 2;
      BBG.el('path', { d: `M${x0} ${b.top + b.h / 2} H${tw - s.padX / 2}`, class: 'c-strike' }, g);
    }
  });

  // Grid lines, then the outline on top.
  const lines = BBG.el('g', { class: 'c-thin' }, g);
  const hline = yy => BBG.el('path', { d: `M0 ${yy} H${tw}` }, lines);
  const headEnd = headBand ? headBand.top + headBand.h : groupBand ? groupBand.top + groupBand.h : titleBand ? titleBand.top + titleBand.h : 0;
  if (titleBand) hline(titleBand.top + titleBand.h);
  if (s.grid !== 'none') {
    if (groupBand) hline(groupBand.top + groupBand.h);
    if (headBand) hline(headBand.top + headBand.h);
  }
  if (s.grid === 'all' || s.grid === 'rows') bodyBands.slice(1).forEach(b => hline(b.top));
  if (s.grid === 'all') {
    const colTop = groupBand ? groupBand.top + groupBand.h : titleBand ? titleBand.top + titleBand.h : 0;
    xs.slice(1, -1).forEach(xx => BBG.el('path', { d: `M${xx} ${colTop} V${th}` }, lines));
    if (groupBand) {
      // Group boundaries (and the key column edge) also cut through the group row.
      const cuts = new Set(s.groups.map(gr => gr.x1).filter(xx => xx < tw));
      if (keyed) cuts.add(xs[1]);
      cuts.forEach(xx => BBG.el('path', { d: `M${xx} ${groupBand.top} V${groupBand.top + groupBand.h}` }, lines));
    }
  } else if (keyed && s.grid !== 'none') {
    BBG.el('path', { d: `M${xs[1]} ${headEnd} V${th}` }, lines);
  }
  BBG.el('rect', { width: tw, height: th, rx: s.radius, class: 'c-outline' }, g);

  const k = keyed ? 1 : 0;
  outer.at = (row, col = 0, side = 'center') => {
    const b = row < 0 ? (headBand || titleBand) : bodyBands[row];
    const x0 = col < 0 ? 0 : xs[col + k], x1 = col < 0 ? tw : xs[col + k + 1];
    const p = { center: [(x0 + x1) / 2, b.top + b.h / 2], left: [x0, b.top + b.h / 2], right: [x1, b.top + b.h / 2],
                top: [(x0 + x1) / 2, b.top], bottom: [(x0 + x1) / 2, b.top + b.h] }[side];
    return [s.x + ox + p[0], s.y + oy + p[1]];
  };
  return outer;
});

// ---------------------------------------------------------------------------
// cells — strips and grids of identical cells: logs, partitions, arrays, bit
// layouts, buckets, linked lists, queues.
//
// BBG.cells({
//   x, y,                                top-left of the first cell
//   cells: [10, 11, { t: '14', cls: 'c-yellow', ghost: true, w: 120 }] | count: 8, start: 0
//   w: 48, h: 48, gap: 0,                cell size; gap > 0 separates the cells
//   dir: 'h' | 'v', cols: 4,             strip direction, or wrap into a grid of N columns
//   on: [0, 1], hl: [3], ghost: [4, 5], fill: 'c-green'   indices to colour / dash
//   link: true,                          arrows between neighbours (linked list; needs gap ≥ 24)
//   top: ['1 bit', …], bottom: [...]     small labels above / below each cell
//   label: 'Topic-A', labelSide: 'left' | 'top'
//   frame: true, frameLabel: 'server 1'  rounded box around everything
//   spans: [{ from: 0, to: 9, label: 'segment-1', side: 'below', offset: 22 }]
//   pointers: [{ at: 13, side: 'below', label: 'committed offset = 13', len: 46, pos: 'center' | 'left' | 'right' }]
//   size: 16, mono: false, parent
// })
// Returns the <g>; g.width, g.height and g.at(i, side) give cell positions.
// ---------------------------------------------------------------------------
BBG.define('cells', spec => {
  const s = { x: 0, y: 0, w: 48, h: 48, gap: 0, dir: 'h', size: 16, start: 0, ...spec };
  const fs = s.size;
  let items = s.cells || Array.from({ length: s.count || 0 }, (_, i) => s.start + i);
  items = items.map(v => (v !== null && typeof v === 'object' ? { ...v, t: String(v.t ?? '') } : { t: v === undefined || v === null ? '' : String(v) }));
  const mark = (list, fn) => (list || []).forEach(i => items[i] && fn(items[i]));
  mark(s.on, it => { it.cls = it.cls || 'c-green'; });
  mark(s.hl, it => { it.cls = it.cls || 'c-yellow'; });
  mark(s.ghost, it => { it.ghost = true; });

  // Cell boxes, relative to the group.
  let cx = 0, cy = 0;
  const boxes = items.map((it, i) => {
    const w = it.w || s.w, h = it.h || s.h;
    let b;
    if (s.cols) {
      const r = Math.floor(i / s.cols), c = i % s.cols;
      b = { x: c * (s.w + s.gap), y: r * (s.h + s.gap), w, h };
    } else if (s.dir === 'v') {
      b = { x: 0, y: cy, w, h }; cy += h + s.gap;
    } else {
      b = { x: cx, y: 0, w, h }; cx += w + s.gap;
    }
    return b;
  });
  const bw = Math.max(...boxes.map(b => b.x + b.w)), bh = Math.max(...boxes.map(b => b.y + b.h));

  const g = BBG.group(s.parent || BBG.layer(), s.x, s.y, 'c-cells');
  if (s.frame) {
    const pad = 14, top = s.frameLabel ? fs * 1.8 : 0;
    BBG.el('rect', { x: -pad, y: -pad - top, width: bw + 2 * pad, height: bh + 2 * pad + top, rx: 14, class: 'c-box' }, g);
    if (s.frameLabel) BBG.text(g, bw / 2, -pad - top / 2 + 4, s.frameLabel, { size: fs, weight: 700 });
  }
  items.forEach((it, i) => {
    const b = boxes[i];
    const cls = ['c-cell', it.cls || s.fill || '', it.ghost ? 'c-dash' : ''].join(' ').replace(/\s+/g, ' ').trim();
    BBG.el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, class: cls }, g);
    if (it.t) BBG.text(g, b.x + b.w / 2, b.y + b.h / 2, it.t, { size: fs, weight: it.weight || 600, cls: [s.mono ? 'mono' : '', it.ghost ? 'c-muted' : ''].join(' ').trim() || null });
  });
  if (s.link && !s.cols) {
    boxes.slice(1).forEach((b, i) => {
      const a = boxes[i];
      const d = s.dir === 'v' ? `M${a.x + a.w / 2} ${a.y + a.h} V${b.y - 1}` : `M${a.x + a.w} ${a.y + a.h / 2} H${b.x - 1}`;
      BBG.el('path', { d, class: 'c-line', 'stroke-width': 2.5, 'marker-end': 'url(#m-tri-ink)' }, g);
    });
  }
  const small = Math.round(fs * 0.8);
  (s.top || []).forEach((t, i) => boxes[i] && t !== '' && BBG.text(g, boxes[i].x + boxes[i].w / 2, boxes[i].y - small, t, { size: small, weight: 600 }));
  (s.bottom || []).forEach((t, i) => boxes[i] && t !== '' && BBG.text(g, boxes[i].x + boxes[i].w / 2, boxes[i].y + boxes[i].h + small, t, { size: small, weight: 600 }));
  if (s.label) {
    if (s.labelSide === 'top') BBG.text(g, 0, -fs * 1.1, s.label, { size: fs * 1.05, weight: 700, anchor: 'start' });
    else BBG.text(g, -14, bh / 2, s.label, { size: fs * 1.05, weight: 700, anchor: 'end' });
  }

  (s.spans || []).forEach(sp => {
    const a = boxes[sp.from], b = boxes[sp.to];
    const below = sp.side !== 'above';
    const off = sp.offset || 22;
    const yy = below ? Math.max(a.y + a.h, b.y + b.h) + off : Math.min(a.y, b.y) - off;
    BBG.el('path', { d: `M${a.x} ${yy} H${b.x + b.w}`, class: 'c-thin', 'marker-start': 'url(#m-span)', 'marker-end': 'url(#m-span)' }, g);
    if (sp.label) BBG.label(g, (a.x + b.x + b.w) / 2, yy, sp.label, { size: small + 1 });
  });
  (s.pointers || []).forEach(p => {
    const b = boxes[p.at];
    const below = p.side !== 'above';
    const len = p.len || 46;
    const px = p.pos === 'left' ? b.x : p.pos === 'right' ? b.x + b.w : b.x + b.w / 2;
    const edge = below ? b.y + b.h : b.y;
    const end = below ? edge + 4 : edge - 4;
    const start = below ? edge + len : edge - len;
    BBG.el('path', { d: `M${px} ${start} V${end}`, class: 'c-line', 'stroke-width': 2.5, 'marker-end': 'url(#m-arrow)' }, g);
    if (p.label) BBG.text(g, px, below ? start + fs * 0.9 : start - fs * 0.9, p.label, { size: fs, weight: 600 });
  });

  // Animation: a pointer that steps through `cells` (indices), one per share of the
  // loop; fill: 'c-green' colours each cell once the pointer has reached it.
  g.step = ({ cells: path, side = 'below', label = '', len = 46, fill = null }) => {
    const below = side !== 'above', b0 = boxes[path[0]];
    if (fill) path.forEach((i, k) => {
      const b = boxes[i];
      const r = BBG.el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, class: `c-cell ${fill}` }, g);
      BBG.showDuring(r, k / path.length);
      if (items[i].t) BBG.text(g, b.x + b.w / 2, b.y + b.h / 2, items[i].t, { size: fs, weight: 600 });
    });
    const ptr = BBG.el('g', {}, g);
    const px = b0.x + b0.w / 2, edge = below ? b0.y + b0.h : b0.y;
    BBG.el('path', { d: `M${px} ${below ? edge + len : edge - len} V${below ? edge + 4 : edge - 4}`, class: 'c-line', 'stroke-width': 2.5, 'marker-end': 'url(#m-arrow)' }, ptr);
    if (label) BBG.text(ptr, px, below ? edge + len + fs * 0.9 : edge - len - fs * 0.9, label, { size: fs, weight: 600 });
    BBG.steps(ptr, path.map(i => [boxes[i].x - b0.x, boxes[i].y - b0.y]));
    return ptr;
  };

  g.width = bw; g.height = bh;
  g.at = (i, side = 'center') => {
    const b = boxes[i];
    const p = { center: [b.x + b.w / 2, b.y + b.h / 2], left: [b.x, b.y + b.h / 2], right: [b.x + b.w, b.y + b.h / 2],
                top: [b.x + b.w / 2, b.y], bottom: [b.x + b.w / 2, b.y + b.h] }[side];
    return [s.x + p[0], s.y + p[1]];
  };
  return g;
});

// ---------------------------------------------------------------------------
// sequence — messages between actors over time. Two layouts share one model:
// every point is (actor, t); dir 'down' puts actors across and time down (UML
// sequence diagram), dir 'right' puts actors on lanes and time to the right
// (two-phase commit / TCC lane diagrams).
//
// BBG.sequence({
//   x, y, dir: 'down' | 'right',
//   actors: [{ id: 'client', label: 'Client', sub: '(Wallet Service)', icon: 'phone' }, …],
//   gap: 260,                     distance between actors
//   step: 50, length: 10,         px per time unit; time runs from 0 to length
//   messages: [{ from: 'a', to: 'b', t: 1, t2: 1.5,          t2 (arrival) defaults to t
//                label: 'Try: A-$1', dash: true, color: 'red' | 'green' | 'blue',
//                mark: 'x' | 'check', step: '1', at: 0.5,   at = where the label sits
//                self: true, back: 0.6 }],                     self = loop back to the same actor
//   events:  [{ actor: 'a', t: 2, label: 'A=$1', kind: 'circle' | 'tick' }],
//   spans:   [{ actor: 'a', from: 2, to: 6, kind: 'bar' | 'lock', label }],
//   separators: [{ t: 3, label: 'connection closed' }],
//   phases:  [{ from: 0, to: 4, label: 'Prepare' }],
//   notes:   [{ actor: 'a', t: 2, text: '…', dx: 0, dy: -60, fill: 'c-yellow', arrow: true, mono: true }],
//   sides:   [{ actor: 'b', t: 2, text: 'Payment failed', side: 'right' }],  free text beside a lifeline
//   dots:    [7],                  vertical "⋮" at time 7
//   footer: true,                  repeat the actor boxes at the bottom (dir 'down')
//   size: 16, parent
// })
// Returns the <g>; g.at(actor, t) gives the page position of a point.
// ---------------------------------------------------------------------------
BBG.define('sequence', spec => {
  const s = { x: 0, y: 0, dir: 'down', gap: 260, step: 50, length: 10, size: 16, ...spec };
  const fs = s.size, down = s.dir === 'down';
  const idx = Object.fromEntries(s.actors.map((a, i) => [a.id, i]));
  const g = BBG.group(s.parent || BBG.layer(), s.x, s.y, 'c-sequence');

  // Head size: boxes on top (down) or labels on the left (right).
  const headW = down ? Math.max(120, ...s.actors.map(a => BBG.measure(a.label, { size: fs, weight: 700 }) + 36)) : 0;
  const nameLines = Math.max(...s.actors.map(a => String(a.label).split('\n').length));
  const headH = down ? Math.round(fs * (1.4 + 1.25 * nameLines + (s.actors.some(a => a.sub) ? 1 : 0))) + (s.actors.some(a => a.icon) ? 44 : 0) : 0;
  const labelW = down ? 0 : Math.max(...s.actors.map(a => BBG.measure(a.label, { size: fs * 1.15, weight: 700 }))) + 24;
  const t0 = down ? headH + 24 : labelW + 24;          // where time 0 sits, along the time axis
  const tEnd = t0 + s.length * s.step;
  const across = i => (down ? headW / 2 : 0) + i * s.gap;  // actor position across the time axis
  const P = (actor, t) => {
    const a = across(idx[actor]), b = t0 + t * s.step;
    return down ? [a, b] : [b, a];
  };
  const xy = (aPos, tPos) => (down ? [aPos, tPos] : [tPos, aPos]);
  const colorCls = c => (c ? ` c-${c}-line` : '');

  // Lifelines and heads.
  s.actors.forEach((a, i) => {
    const c = across(i);
    if (down) {
      BBG.el('path', { d: `M${c} ${headH} V${tEnd}`, class: 'c-thin c-dash' }, g);
      const head = (top) => {
        BBG.el('rect', { x: c - headW / 2, y: top, width: headW, height: headH, rx: 10, class: 'c-box' }, g);
        let ty = top + headH / 2;
        if (a.icon) { BBG.icon(g, a.icon, c, top + 26, 38, 38); ty = top + 44 + (headH - 44) / 2; }
        BBG.text(g, c, a.sub ? ty - fs * 0.5 : ty, a.label, { size: fs, weight: 700, lineHeight: 1.2 });
        if (a.sub) BBG.text(g, c, ty + fs * 0.75, a.sub, { size: fs * 0.8, weight: 500 });
      };
      head(0);
      if (s.footer) head(tEnd + 12);
    } else {
      BBG.el('path', { d: `M${t0 - 16} ${c} H${tEnd}`, class: 'c-line', 'stroke-width': 2.5, 'marker-end': 'url(#m-tri-ink)' }, g);
      BBG.text(g, labelW - 10, a.sub ? c - fs * 0.45 : c, a.label, { size: fs * 1.15, weight: 700, anchor: 'end' });
      if (a.sub) BBG.text(g, labelW - 10, c + fs * 0.75, a.sub, { size: fs * 0.8, weight: 500, anchor: 'end' });
    }
  });
  const first = across(0), last = across(s.actors.length - 1);

  // Phases and separators run across every actor.
  const acrossLine = (t, cls) => {
    const tp = t0 + t * s.step, pad = down ? headW / 2 + 10 : 34;
    const [x1, y1] = xy(first - pad, tp), [x2, y2] = xy(last + pad, tp);
    return BBG.el('path', { d: `M${x1} ${y1} L${x2} ${y2}`, class: cls }, g);
  };
  (s.phases || []).forEach(ph => {
    acrossLine(ph.from, 'c-thin c-dash'); acrossLine(ph.to, 'c-thin c-dash');
    const off = down ? first - headW / 2 - 26 : first - 52;
    const [x1, y1] = xy(off, t0 + ph.from * s.step), [x2, y2] = xy(off, t0 + ph.to * s.step);
    BBG.el('path', { d: `M${x1} ${y1} L${x2} ${y2}`, class: 'c-thin', 'marker-start': 'url(#m-span)', 'marker-end': 'url(#m-span)' }, g);
    if (ph.label) BBG.label(g, (x1 + x2) / 2, (y1 + y2) / 2, ph.label, { size: fs * 1.05, weight: 700 });
  });
  (s.separators || []).forEach(sp => {
    acrossLine(sp.t, 'c-thin c-dash');
    if (sp.label) {
      const [lx, ly] = xy((first + last) / 2, t0 + sp.t * s.step);
      BBG.label(g, lx, ly, sp.label, { size: fs * 0.85, weight: 500 });
    }
  });

  // Spans: activation bars (white strips on a lifeline) and locks (thick red on a lane).
  (s.spans || []).forEach(sp => {
    const [x1, y1] = P(sp.actor, sp.from), [x2, y2] = P(sp.actor, sp.to);
    if (sp.kind === 'lock') {
      BBG.el('path', { d: `M${x1} ${y1} L${x2} ${y2}`, class: 'c-lock' }, g);
    } else {
      const w = 14;
      BBG.el('rect', down ? { x: x1 - w / 2, y: y1, width: w, height: y2 - y1, class: 'c-cell' } : { x: x1, y: y1 - w / 2, width: x2 - x1, height: w, class: 'c-cell' }, g);
    }
    if (sp.label) BBG.label(g, (x1 + x2) / 2, (y1 + y2) / 2 - (down ? 0 : 24), sp.label, { size: fs * 0.85 });
  });

  // Events: circles or ticks on a lifeline, with a small label beside.
  const R = 9;
  const eventAt = new Set((s.events || []).filter(e => (e.kind || 'circle') === 'circle').map(e => `${e.actor}@${e.t}`));

  // Messages (their lines are kept in `tracks` for play()).
  const tracks = [];
  (s.messages || []).forEach(m => {
    const t2 = m.t2 ?? m.t;
    let [x1, y1] = P(m.from, m.t), [x2, y2] = P(m.to, t2);
    const cls = `c-line${m.dash ? ' c-dash' : ''}${colorCls(m.color)}`;
    const head = m.color ? `url(#m-arrow-${m.color})` : 'url(#m-arrow)';
    if (m.self) {
      const back = m.back ?? 0.6, out = 46;
      const [bx, by] = P(m.from, m.t + back);
      const d = down ? `M${x1} ${y1} H${x1 + out} V${by} H${bx + 8}` : `M${x1} ${y1} V${y1 - out} H${bx} V${by - 8}`;
      BBG.el('path', { d, class: cls, 'marker-end': head }, g);
      if (m.label) BBG.text(g, down ? x1 + out + 8 : (x1 + bx) / 2, down ? (y1 + by) / 2 : y1 - out - fs * 0.8, m.label, { size: fs * 0.9, anchor: down ? 'start' : 'middle' });
      return;
    }
    // Stop short of event circles and activation bars at either end.
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const onBar = (actor, t) => (s.spans || []).some(sp => sp.actor === actor && sp.kind !== 'lock' && t >= sp.from && t <= sp.to);
    const trimA = eventAt.has(`${m.from}@${m.t}`) ? R : onBar(m.from, m.t) ? 7 : 0;
    const trimB = (eventAt.has(`${m.to}@${t2}`) ? R : onBar(m.to, t2) ? 7 : 0) + 2;
    x1 += ux * trimA; y1 += uy * trimA; x2 -= ux * trimB; y2 -= uy * trimB;
    BBG.el('path', { d: `M${x1} ${y1} L${x2} ${y2}`, class: cls, 'marker-end': head }, g);
    tracks.push({ t: m.t, pts: [[x1, y1], [x2, y2]] });

    const at = m.at ?? 0.5;
    const lx = x1 + (x2 - x1) * at, ly = y1 + (y2 - y1) * at;
    const flat = Math.abs(y2 - y1) < 1;              // a horizontal message gets its label above the line
    let labelLeft = lx;
    if (m.label) {
      const lw = BBG.measure(m.label, { size: fs * 0.95, weight: 600 });
      if (flat) BBG.text(g, lx, ly - fs * 0.85 * m.label.split('\n').length, m.label, { size: fs * 0.95, weight: 600 });
      else BBG.label(g, lx, ly, m.label, { size: fs * 0.95 });
      labelLeft = lx - lw / 2;
    }
    if (m.step) {
      const sx = m.label ? labelLeft - 20 : lx, sy = flat && m.label ? ly - fs * 0.85 : ly;
      BBG.el('circle', { cx: sx, cy: sy, r: 12, class: 'c-step' }, g);
      BBG.text(g, sx, sy, m.step, { size: 13, weight: 700, cls: 'c-step-text' });
    }
    if (m.mark) {
      const mx = m.label && !flat ? labelLeft - 18 : lx, my = m.label && !flat ? ly : ly;
      BBG.icon(g, m.mark === 'x' ? 'x-mark' : 'check', mx, my, 22, 22);
    }
  });

  (s.events || []).forEach(e => {
    const [x, y] = P(e.actor, e.t);
    if ((e.kind || 'circle') === 'circle') BBG.el('circle', { cx: x, cy: y, r: R, class: 'c-event' }, g);
    else BBG.el('path', { d: down ? `M${x - 10} ${y} H${x + 10}` : `M${x} ${y - 12} V${y + 12}`, class: 'c-line', 'stroke-width': 2.5 }, g);
    if (e.label) {
      const [lx, ly] = down ? [x + 16, y] : [x, y + (e.above ? -24 : 24)];
      BBG.text(g, lx, ly, e.label, { size: fs * 0.8, weight: 600, anchor: down ? 'start' : 'middle' });
    }
  });

  (s.notes || []).forEach(n => {
    const [px, py] = P(n.actor, n.t);
    const nx = px + (n.dx || 0), ny = py + (n.dy ?? -60);
    const size = fs * 0.9, lines = String(n.text).split('\n').length;
    const w = BBG.measure(n.text, { size, weight: 500, mono: n.mono }) + 20, h = lines * size * 1.25 + 14;
    if (n.arrow !== false && (n.dx || n.dy !== 0)) {
      const ey = ny + (ny < py ? h / 2 : -h / 2);
      BBG.el('path', { d: `M${nx} ${ey} L${px} ${py + (ny < py ? -6 : 6)}`, class: 'c-thin', 'marker-end': 'url(#m-arrow)' }, g);
    }
    BBG.el('rect', { x: nx - w / 2, y: ny - h / 2, width: w, height: h, rx: 6, class: `c-note ${n.fill || 'c-yellow'}` }, g);
    BBG.text(g, nx, ny, n.text, { size, weight: 500, cls: n.mono ? 'mono' : null });
  });

  (s.sides || []).forEach(n => {
    const [px, py] = P(n.actor, n.t);
    const right = n.side !== 'left';
    BBG.text(g, px + (right ? 18 : -18), py, n.text, { size: fs * 0.95, weight: 600, anchor: right ? 'start' : 'end' });
  });

  (s.dots || []).forEach(t => {
    const [x, y] = xy((first + last) / 2, t0 + t * s.step);
    BBG.text(g, x, y, down ? '⋮' : '⋯', { size: fs * 1.6, weight: 700 });
  });

  g.at = (actor, t) => { const [x, y] = P(actor, t); return [s.x + x, s.y + y]; };
  // Animation: a token runs along each message in time order, one message per share of the loop.
  g.play = ({ r = 8 } = {}) => {
    const order = [...tracks].sort((a, b) => a.t - b.t), n = order.length;
    return order.map((m, k) => BBG.travel(g, m.pts, { from: k / n, to: (k + 1) / n, r }));
  };
  return g;
});

// ---------------------------------------------------------------------------
// timeline — a time axis with what happens along it: request counts per slot,
// windows (fixed, sliding, rolling), events on labelled rows, markers, measure
// spans, and simple line / candlestick charts.
//
// BBG.timeline({
//   x, y, width: 800,              left end of the axis; y = top of the plot area
//   from: 0, to: 5,                time range drawn across width
//   ticks: [0, 1, 2] | tickEvery: 1, tickLabel: t => `${t}`, unit: 'Minute',
//   axisLabel: 'Time', arrow: true, axis: 'bottom' | 'top' | 'none'   ('top' puts tick labels above the axis),
//   plotH: 200,                    height of the plot area above the axis (stacks, plot windows, charts)
//   yLabel: 'Number of requests',  draws a y axis on the left of the plot area
//   grid: true,                    dashed vertical lines at the ticks through the rows
//   stacks:  [{ t: 1, n: 3, extra: 2 }],       n plain squares, extra grey ("rate limited") on top
//   windows: [{ from, to, h: 180, label, cls: 'c-soft', line: 'ink' | 'blue' | 'green' | 'dash', row }],
//            no row → a box standing on the axis in the plot area; row → a box in that row
//   rows:    [{ label: 'Event Time' }], rowH: 44
//   events:  [{ row: 0, t: 30, label: '1', note: 'miss', noteColor: '#d33' }],  numbered circles on a row;
//            note = a word under the circle on a white backing (the grid never crosses it)
//   (row labels keep 10 px clear of the row's leftmost event or window)
//   markers: [{ t: 78, label: 'Current time' }],
//   spans:   [{ from, to, label, y }],          measure arrows; y in plot coordinates (0 = axis, up is +)
//   series:  [{ points: [[t, v], …], color }], yFrom, yTo     line chart in the plot area
//   candles: [{ t, open, close, high, low }]
//   size: 15, parent
// })
// Returns the <g>; g.tx(t) gives the page x of a time, g.py(v) the page y of a plot value.
// ---------------------------------------------------------------------------
BBG.define('timeline', spec => {
  const s = { x: 0, y: 0, width: 800, from: 0, to: 5, plotH: 0, rowH: 44, size: 15, axis: 'bottom', arrow: true, ...spec };
  const fs = s.size;
  const tx = t => ((t - s.from) / (s.to - s.from)) * s.width;
  const axisY = s.plotH;
  const g = BBG.group(s.parent || BBG.layer(), s.x, s.y, 'c-timeline');
  const ticks = s.ticks || (s.tickEvery ? Array.from({ length: Math.floor((s.to - s.from) / s.tickEvery) + 1 }, (_, i) => s.from + i * s.tickEvery) : []);
  const rows = s.rows || [];
  const rowTop = i => axisY + 24 + i * s.rowH;
  const rowsEnd = rowTop(rows.length);
  const yFrom = s.yFrom ?? 0, yTo = s.yTo ?? 1;
  const py = v => axisY - ((v - yFrom) / (yTo - yFrom)) * (s.plotH - 10);
  const lineCls = l => ({ ink: '', blue: ' c-blue-line', green: ' c-green-line', red: ' c-red-line', dash: ' c-dash' }[l || 'ink'] ?? '');

  // Grid first, so everything else sits on top.
  if (s.grid && rows.length) ticks.forEach(t => BBG.el('path', { d: `M${tx(t)} ${axisY} V${rowsEnd}`, class: 'c-thin c-dash c-grid' }, g));

  // Plot windows (behind the stacks), then stacks.
  (s.windows || []).filter(w => w.row === undefined).forEach(w => {
    const h = w.h || s.plotH * 0.6;
    BBG.el('rect', { x: tx(w.from), y: axisY - h, width: tx(w.to) - tx(w.from), height: h,
      class: `${w.cls ? w.cls : 'c-none'} c-window${lineCls(w.line)}` }, g);
    if (w.label) BBG.text(g, (tx(w.from) + tx(w.to)) / 2, axisY - h + fs * 1.3, w.label, { size: fs * 1.05, weight: 700 });
  });
  const sq = s.square || 30;
  (s.stacks || []).forEach(st => {
    const n = st.n || 0, extra = st.extra || 0;
    for (let k = 0; k < n + extra; k++) {
      BBG.el('rect', { x: tx(st.t) - sq / 2, y: axisY - (k + 1) * (sq + 6), width: sq, height: sq, rx: 3,
        class: `c-cell ${k >= n ? 'c-grey c-rejected' : st.cls || 'c-blue'}` }, g);
    }
  });

  // Charts.
  (s.series || []).forEach(se => {
    const d = se.points.map(([t, v], i) => `${i ? 'L' : 'M'}${tx(t)} ${py(v)}`).join(' ');
    BBG.el('path', { d, class: `c-line${lineCls(se.color || 'blue')}`, 'stroke-width': 2.5 }, g);
  });
  (s.candles || []).forEach(c => {
    const x = tx(c.t), w = s.candleW || 18, up = c.close >= c.open;
    BBG.el('path', { d: `M${x} ${py(c.high)} V${py(c.low)}`, class: 'c-line', 'stroke-width': 2.5 }, g);
    BBG.el('rect', { x: x - w / 2, y: py(Math.max(c.open, c.close)), width: w, height: Math.max(2, Math.abs(py(c.open) - py(c.close))),
      class: `c-cell ${up ? 'c-green' : 'c-pink'}` }, g);
  });
  if (s.yLabel) {
    BBG.el('path', { d: `M0 ${axisY} V${-14}`, class: 'c-line', 'stroke-width': 2.5, 'marker-end': 'url(#m-arrow)' }, g);
    const t = BBG.text(g, -24, axisY / 2, s.yLabel, { size: fs, weight: 600 });
    t.setAttribute('transform', `rotate(-90 ${-24} ${axisY / 2})`);
  }

  // Axis.
  if (s.axis !== 'none') {
    const ay = axisY;
    BBG.el('path', { d: `M0 ${ay} H${s.width + (s.arrow ? 24 : 0)}`, class: 'c-line', 'stroke-width': 2.5,
      'marker-end': s.arrow ? 'url(#m-arrow)' : null }, g);
    const lab = s.tickLabel || (t => t);
    ticks.forEach(t => {
      BBG.el('path', { d: `M${tx(t)} ${ay - 6} V${ay + 6}`, class: 'c-line', 'stroke-width': 2.5 }, g);
      const str = lab(t);
      if (str !== '' && str !== null) BBG.text(g, tx(t), s.axis === 'top' ? ay - fs * 1.1 : ay + fs * 1.2, str, { size: fs, weight: 600 });
    });
    if (s.unit) BBG.text(g, s.width + 34, s.axis === 'top' ? ay - fs * 1.1 : ay, s.unit, { size: fs, weight: 700, anchor: 'start' });
    if (s.axisLabel) BBG.text(g, 0, ay + fs * 2.6, s.axisLabel, { size: fs * 1.05, weight: 700, anchor: 'start' });
  }

  // Rows: label, row windows, events.
  // A row label keeps 10 px clear of the row's leftmost mark (an event circle or a window),
  // so an event at the start of the axis never touches it.
  const rowLeft = i => Math.min(0,
    ...(s.events || []).filter(e => e.row === i).map(e => tx(e.t) - 12),
    ...(s.windows || []).filter(w => w.row === i).map(w => tx(w.from)));
  rows.forEach((r, i) => {
    if (r.label) BBG.text(g, Math.min(-16, rowLeft(i) - 10), rowTop(i) + s.rowH / 2, r.label, { size: fs, weight: 700, anchor: 'end' });
    if (r.line) BBG.el('path', { d: `M0 ${rowTop(i) + s.rowH / 2} H${s.width}`, class: 'c-thin' }, g);
  });
  (s.windows || []).filter(w => w.row !== undefined).forEach(w => {
    const top = rowTop(w.row) + 6, h = s.rowH - 12;
    BBG.el('rect', { x: tx(w.from), y: top, width: tx(w.to) - tx(w.from), height: h, rx: 6,
      class: `c-window ${w.cls || 'c-white'}${lineCls(w.line)}` }, g);
    if (w.label) BBG.text(g, (tx(w.from) + tx(w.to)) / 2, top + h / 2, w.label, { size: fs * 0.9, weight: 600 });
  });
  (s.events || []).forEach(e => {
    const cx = tx(e.t), cy = rowTop(e.row) + s.rowH / 2;
    BBG.el('circle', { cx, cy, r: 12, class: `c-event ${e.cls || ''}`.trim() }, g);
    if (e.label !== undefined) BBG.text(g, cx, cy, e.label, { size: 13, weight: 700 });
    // note: a word under the circle (an outcome such as 'miss' / 'hit'), on a white backing
    // so the dashed grid never runs through it.
    if (e.note) {
      const n = BBG.label(g, cx, cy + 12 + fs * 0.85, e.note, { size: fs * 0.95, weight: 700, padX: 4, padY: 1 });
      if (e.noteColor) n.querySelector('text').style.fill = e.noteColor;
    }
  });

  // Markers and spans on top.
  (s.markers || []).forEach(m => {
    const top = -(m.lift ?? 30);
    BBG.el('path', { d: `M${tx(m.t)} ${top + fs * 0.8} V${axisY - (m.h ?? s.plotH) + 2}`, class: 'c-line', 'stroke-width': 2.5, 'marker-end': 'url(#m-arrow)' }, g);
    if (m.label) BBG.text(g, tx(m.t), top, m.label, { size: fs, weight: 700 });
  });
  (s.spans || []).forEach(sp => {
    const yy = axisY - (sp.y ?? 0);
    BBG.el('path', { d: `M${tx(sp.from)} ${yy} H${tx(sp.to)}`, class: 'c-thin', 'marker-start': 'url(#m-span)', 'marker-end': 'url(#m-span)' }, g);
    if (sp.label) BBG.label(g, (tx(sp.from) + tx(sp.to)) / 2, yy, sp.label, { size: fs, weight: 600 });
  });

  // Animation: a window that slides along the axis. `by` is how far it moves (in time
  // units) per step; `count` steps; steps: false glides smoothly instead.
  g.slide = ({ from, to, h, row, cls = 'c-soft', line = 'green', label, by = 1, count = 3, smooth = false }) => {
    const box = BBG.el('g', {}, g);
    const top = row === undefined ? axisY - (h || s.plotH * 0.6) : rowTop(row) + 6;
    const height = row === undefined ? (h || s.plotH * 0.6) : s.rowH - 12;
    BBG.el('rect', { x: tx(from), y: top, width: tx(to) - tx(from), height, rx: 6, class: `c-window ${cls}${lineCls(line)}`, opacity: 0.85 }, box);
    if (label) BBG.text(box, (tx(from) + tx(to)) / 2, top + height / 2, label, { size: fs * 0.9, weight: 700 });
    const dx = tx(from + by) - tx(from);
    if (smooth) BBG.animate(box, [{ transform: 'translate(0px, 0px)' }, { transform: `translate(${dx * count}px, 0px)` }]);
    else BBG.steps(box, Array.from({ length: count + 1 }, (_, i) => [dx * i, 0]));
    return box;
  };
  g.tx = t => s.x + tx(t);
  g.py = v => s.y + py(v);
  return g;
});

// ---------------------------------------------------------------------------
// ring — a hash ring: servers and keys placed by angle, hops from a key to the
// server that owns it, coloured ranges, chords (requests / ACKs), heartbeat mesh.
//
// BBG.ring({
//   cx, cy, r: 200,                         centre and radius
//   nodes: [{ id: 's0', at: 40, cls: 'c-purple' },       at = degrees clockwise from 12 o'clock
//           { id: 'k0', at: 350, kind: 'key' },           key: white with a thick outline
//           { id: 'v', at: 120, kind: 'empty' },          empty marker
//           { id: 'coord', at: 270, kind: 'box', label: 'coordinator' },
//           { id: 'x', at: 90, label: 's1_0', r: 20 }],   label defaults to id
//   hops:   [{ from: 'k0', to: 's0', dash: true, color: 'red', out: 34,      clockwise, outside the ring
//              end: 0 }],                end → turn this hop's arrowhead round the target by that many degrees
//   spread: 32,                             min degrees between arrowheads of hops that share a target
//                                           (widened to keep 22 px apart on small nodes; 0 = off)
//   arcs:   [{ from: 's2', to: 's1', cls: 'c-pink-arc', out: 0 | 22, arrow: true, label }],
//   links:  [{ from: 'coord', to: 's0', label: 'put(key1, val1)', back: 'ACK', backDash: true,
//              dash, color, pair: true }],  back → a second arrow returning; pair → both ways, unlabelled
//   ticks:  [{ at: 0, labels: ['xn', 'x0'] }],
//   size: 15, parent
// })
// Node fill: cls if given, else by server number in the id (s0 → purple, s1 → blue,
// s2 → pink, s3 → orange, s4 → green), else white. Returns the <g>; g.at(id)
// gives a node's page position, g.point(deg, radius) any point.
// ---------------------------------------------------------------------------
BBG.define('ring', spec => {
  const s = { cx: 0, cy: 0, r: 200, size: 15, ...spec };
  const fs = s.size;
  const PALETTE = ['c-purple', 'c-blue', 'c-pink', 'c-orange', 'c-green', 'c-yellow'];
  const pt = (deg, rad = s.r) => {
    const a = (deg - 90) * Math.PI / 180;
    return [s.cx + rad * Math.cos(a), s.cy + rad * Math.sin(a)];
  };
  const parent = s.parent || BBG.layer();
  const g = BBG.el('g', { class: 'c-ring' }, parent);
  const back = BBG.el('g', {}, g), mid = BBG.el('g', {}, g), front = BBG.el('g', {}, g);
  BBG.el('circle', { cx: s.cx, cy: s.cy, r: s.r, class: 'c-ring-line' }, back);

  const nodes = {};
  (s.nodes || []).forEach(n => {
    const kind = n.kind || 'server';
    const label = n.label ?? (kind === 'empty' ? '' : n.id);
    let size = n.r || (kind === 'key' ? 14 : 17);
    if (kind === 'server' || kind === 'key') size = Math.max(size, BBG.measure(label, { size: fs * 0.85, weight: 700 }) / 2 + 6);
    const [x, y] = pt(n.at);
    const node = { ...n, kind, label, x, y, rr: size };
    if (kind === 'box') {
      node.w = BBG.measure(label, { size: fs, weight: 700 }) + 24; node.h = fs * 2.2;
      BBG.el('rect', { x: x - node.w / 2, y: y - node.h / 2, width: node.w, height: node.h, rx: 8, class: `c-box ${n.cls || ''}`.trim() }, front);
      BBG.text(front, x, y, label, { size: fs, weight: 700 });
    } else {
      const num = /^s(\d+)/.exec(n.id || '');
      const fill = n.cls || (kind === 'server' && num ? PALETTE[+num[1] % PALETTE.length] : 'c-white');
      BBG.el('circle', { cx: x, cy: y, r: size, class: `c-node ${fill}${kind === 'key' ? ' c-key' : ''}` }, front);
      if (label) BBG.text(front, x, y, label, { size: fs * 0.85, weight: 700 });
    }
    nodes[n.id] = node;
  });

  // Distance from a node's centre to its edge, along direction (dx, dy).
  const edge = (n, dx, dy) => {
    if (n.kind !== 'box') return n.rr + 2;
    const len = Math.hypot(dx, dy) || 1;
    return Math.min(n.w / 2 / Math.abs(dx / len || 1e-9), n.h / 2 / Math.abs(dy / len || 1e-9)) + 2;
  };
  const colour = c => (c ? ` c-${c}-line` : '');
  const head = c => (c ? `url(#m-arrow-${c})` : 'url(#m-arrow)');
  const clockwise = (a, b) => ((b - a) % 360 + 360) % 360;

  // Hops: from a key, out of the ring, clockwise to the owner, back in. The last leg
  // lands on the owner's edge; hops that share an owner have their landing points
  // spread round it, or their arrowheads would pile up in one spot.
  const legAt = (n, deg) => [n.x + Math.cos(deg * Math.PI / 180) * (n.rr + 2), n.y + Math.sin(deg * Math.PI / 180) * (n.rr + 2)];
  const toward = (n, px, py) => Math.atan2(py - n.y, px - n.x) * 180 / Math.PI;
  const rel = (a, b) => ((a - b) % 360 + 540) % 360 - 180;   // a − b, in (−180, 180]
  const hops = (s.hops || []).map(h => {
    const A = nodes[h.from], B = nodes[h.to];
    const R = s.r + (h.out ?? 34);
    const sweep = clockwise(A.at, B.at);
    const pad = Math.min(10, sweep / 3);
    const [x2, y2] = pt(A.at + pad, R), [x3, y3] = pt(B.at - pad, R);
    return { h, A, B, R, sweep, pad, x2, y2, x3, y3, land: toward(B, x3, y3) };
  });
  const spread = s.spread ?? 32;
  const byTarget = {};
  hops.forEach(o => (byTarget[o.h.to] = byTarget[o.h.to] || []).push(o));
  Object.values(byTarget).forEach(group => {
    if (group.length < 2 || !spread) return;
    const base = group[0].land;
    // Nested hops: the innermost (smallest R) lands nearest the side it arrives from, the
    // outer ones further round towards the outside — clockwise on screen — so legs never cross.
    group.sort((a, b) => a.R - b.R || a.sweep - b.sweep);
    const centre = base + group.reduce((sum, o) => sum + rel(o.land, base), 0) / group.length;
    // At least 22 px of node edge between neighbouring heads, so small nodes spread wider.
    const step = Math.max(spread, 22 / (group[0].B.rr + 2) * 180 / Math.PI);
    group.forEach((o, i) => { o.land = centre + (i - (group.length - 1) / 2) * step; });
  });
  hops.forEach(({ h, A, R, sweep, pad, x2, y2, x3, y3, B, land }) => {
    const [x1, y1] = legAt(A, toward(A, x2, y2));
    const [x4, y4] = legAt(B, land + (h.end || 0));
    const large = sweep - 2 * pad > 180 ? 1 : 0;
    const d = `M${x1} ${y1} L${x2} ${y2} A${R} ${R} 0 ${large} 1 ${x3} ${y3} L${x4} ${y4}`;
    BBG.el('path', { d, class: `c-line${h.dash ? ' c-dash' : ''}${colour(h.color)}`, 'stroke-width': 2.5, 'marker-end': head(h.color) }, mid);
  });

  // Arcs along the ring (a server's range), optionally pushed outside.
  (s.arcs || []).forEach(a => {
    const from = typeof a.from === 'string' ? nodes[a.from].at : a.from;
    const to = typeof a.to === 'string' ? nodes[a.to].at : a.to;
    const R = s.r + (a.out || 0), sweep = clockwise(from, to);
    const [x1, y1] = pt(from, R), [x2, y2] = pt(to, R);
    BBG.el('path', { d: `M${x1} ${y1} A${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`, class: `c-arc ${a.cls || 'c-blue-arc'}`,
      'marker-end': a.arrow ? 'url(#m-arrow)' : null }, a.out ? mid : back);
    if (a.label) {
      const [lx, ly] = pt(from + sweep / 2, R + (a.out ? 18 : -22));
      BBG.text(mid, lx, ly, a.label, { size: fs * 0.85, weight: 700 });
    }
  });

  // Links: straight lines between nodes, with labels along them.
  const arrow = (A, B, off, opts) => {
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const nx = -uy * off, ny = ux * off;
    const a = edge(A, dx, dy), b = edge(B, dx, dy);
    const x1 = A.x + ux * a + nx, y1 = A.y + uy * a + ny, x2 = B.x - ux * b + nx, y2 = B.y - uy * b + ny;
    BBG.el('path', { d: `M${x1} ${y1} L${x2} ${y2}`, class: `c-line${opts.dash ? ' c-dash' : ''}${colour(opts.color)}`, 'stroke-width': 2.2, 'marker-end': head(opts.color) }, mid);
    if (opts.label) {
      let deg = Math.atan2(dy, dx) * 180 / Math.PI;
      if (deg > 90) deg -= 180; else if (deg < -90) deg += 180;
      const side = opts.side || 1;
      const lx = (x1 + x2) / 2 - uy * 13 * side, ly = (y1 + y2) / 2 + ux * 13 * side;
      const t = BBG.text(mid, lx, ly, opts.label, { size: fs * 0.85, weight: 600 });
      t.setAttribute('transform', `rotate(${deg} ${lx} ${ly})`);
    }
  };
  (s.links || []).forEach(l => {
    const A = nodes[l.from], B = nodes[l.to];
    if (l.pair) { arrow(A, B, 6, l); arrow(B, A, 6, { ...l, label: null }); return; }
    if (l.back) {
      arrow(A, B, 5, { label: l.label, dash: l.dash, color: l.color });
      arrow(B, A, 5, { label: l.back, dash: l.backDash, color: l.color });
    } else {
      arrow(A, B, 0, l);
    }
  });

  (s.ticks || []).forEach(t => {
    const [x1, y1] = pt(t.at, s.r - 18), [x2, y2] = pt(t.at, s.r + 18);
    BBG.el('path', { d: `M${x1} ${y1} L${x2} ${y2}`, class: 'c-line', 'stroke-width': 4 }, front);
    (t.labels || []).forEach((lab, i) => {
      const [lx, ly] = pt(t.at + (i ? 9 : -9), s.r + 46);
      BBG.text(front, lx, ly, lab, { size: fs * 1.2, weight: 700 });
    });
  });

  g.at = id => [nodes[id].x, nodes[id].y];
  g.point = (deg, rad) => pt(deg, rad);
  // Animation: a token walks clockwise along the ring from node `from` to node `to`
  // during the part [start, end] of the loop (several walks can share one loop).
  g.walk = ({ from, to, start = 0, end = 1, r = 9, hold = true }) => {
    const a = nodes[from].at, sweep = clockwise(a, nodes[to].at), n = Math.max(2, Math.ceil(sweep / 3));
    const pts = Array.from({ length: n + 1 }, (_, i) => pt(a + sweep * i / n));
    return BBG.travel(g, pts, { from: start, to: end, r, hold });
  };
  return g;
});

// ---------------------------------------------------------------------------
// tree — tries, quadtrees, folder trees and chapter mind maps.
//
// BBG.tree({
//   x, y,                       top-left of the drawing
//   mode: 'down' | 'mind' | 'right',
//        down  = top-down tree with straight edges (trie, quadtree)
//        mind  = left-to-right mind map with curved branches (chapter summaries)
//        right = left-to-right indented tree with elbow lines (folders)
//   root: { label: 'b', children: [ 'leaf', { label: 'be: 15', children: […] } ] },
//     node options: id, kind: 'box' | 'circle' | 'square' | 'text' | 'folder',
//                   cls (fill), leaf: true (green outline), hl: true (highlight),
//                   note: '[best: 35]' (cached text beside the node, in a dashed box — down mode),
//                   tag: 'root' (arrow pointing at the node from the right),
//                   edge: { label: 'nw', dash: true, color: 'blue', bold: true }  (edge from its parent)
//   arrows: true,               arrowheads on edges (down / right)
//   gap: 26, level: 90,         space between neighbours / between levels
//   kind: 'box',                default node kind (mind: root is a box, the rest text)
//   size: 15, parent
// })
// Layout: 'down' uses d3-hierarchy's tidy tree (load assets/d3-hierarchy.min.js first);
// 'mind' and 'right' give every leaf its own row and centre each parent on its children.
// Returns the <g>; g.at(id, side) gives a node's page position.
// ---------------------------------------------------------------------------
BBG.define('tree', spec => {
  const s = { x: 0, y: 0, mode: 'down', gap: 26, size: 15, arrows: false, ...spec };
  const fs = s.size, mode = s.mode, down = mode === 'down';
  const level = s.level ?? (down ? 90 : 60);
  const g = BBG.group(s.parent || BBG.layer(), s.x, s.y, 'c-tree');
  const edgesG = BBG.el('g', {}, g), notesG = BBG.el('g', {}, g), nodesG = BBG.el('g', {}, g);

  // Normalise the data and size every node.
  const all = [];
  const prep = (n, depth, parent) => {
    const node = typeof n === 'string' ? { label: n } : { ...n };
    node.depth = depth; node.parent = parent;
    node.kind = node.kind || (mode === 'mind' ? (depth === 0 ? 'box' : 'text') : (s.kind || 'box'));
    const label = String(node.label ?? '');
    const lw = BBG.measure(label, { size: fs, weight: node.kind === 'text' ? 500 : 600 });
    const lines = label.split('\n').length;
    if (node.kind === 'circle' || node.kind === 'square') { node.w = node.h = node.r ? node.r * 2 : 28; }
    else if (node.kind === 'text') { node.w = lw + 8; node.h = fs * 1.25 * lines + 8; }
    else if (node.kind === 'folder') { node.w = lw + 66; node.h = Math.max(40, fs * 1.25 * lines + 16); }
    else { node.w = Math.max(node.minW || 70, lw + 28); node.h = fs * 1.25 * lines + 22; }
    if (node.width) node.w = node.width;
    node.children = (node.children || []).map(c => prep(c, depth + 1, node));
    all.push(node);
    return node;
  };
  const root = prep(s.root, 0, null);

  // Breadth: leaves in order, parents centred. Depth: per level (down) or after the parent (mind / right).
  let cursor = 0;
  // Room a node needs on its left: its note, or the label beside a circle / square.
  const sideLabel = n => (n.kind === 'circle' || n.kind === 'square') && n.label !== undefined && n.label !== '';
  const noteW = n => {
    if (!down) return 0;
    if (n.note) return BBG.measure(n.note, { size: fs * 0.85, weight: 700 }) + 34;
    if (sideLabel(n)) return BBG.measure(String(n.label), { size: fs * 0.9, weight: 600 }) + 10;
    return 0;
  };
  // Notes sit left of their node. A subtree's notes are on different rows, so its first
  // leaf only needs room for the widest of them, not their sum.
  let pending = 0;
  const place = n => {
    if (down) {
      pending = Math.max(pending, noteW(n));
      if (!n.children.length) { cursor += pending; pending = 0; n.b = cursor + n.w / 2; cursor += n.w + s.gap; }
      else { n.children.forEach(place); n.b = (n.children[0].b + n.children[n.children.length - 1].b) / 2; }
    } else {
      const rowH = Math.max(n.h, fs * 1.6) + (s.gap * 0.5);
      if (mode === 'right') {
        // Indented: every node gets its own row, children below it.
        n.b = cursor + n.h / 2; cursor += rowH;
        n.children.forEach(place);
      } else if (!n.children.length) { n.b = cursor + n.h / 2; cursor += rowH; }
      else { n.children.forEach(place); n.b = (n.children[0].b + n.children[n.children.length - 1].b) / 2; }
    }
  };
  if (down && window.d3 && d3.tree) {
    // Tidy tree (d3-hierarchy): subtrees at different depths share horizontal space.
    // Neighbours are kept apart by their half widths, the gap and the right one's side room.
    const h = d3.hierarchy(root, n => n.children);
    d3.tree().nodeSize([1, level]).separation((a, b) => a.data.w / 2 + s.gap + noteW(b.data) + b.data.w / 2)(h);
    h.each(d => { d.data.b = d.x; });
  } else {
    if (down) console.warn('BBG.tree: d3-hierarchy not loaded; using the simpler leaf-order layout');
    place(root);
  }
  const depthPos = n => {
    if (down) return n.depth * level;
    if (!n.parent) return 0;
    return n.parent.d + (mode === 'right' ? 36 : n.parent.w + level);
  };
  // Pre-order so parents are placed before children.
  const order = [];
  const walk = n => { order.push(n); n.children.forEach(walk); };
  walk(root);
  order.forEach(n => { n.d = depthPos(n); });
  order.forEach(n => {
    if (down) { n.cx = n.b; n.cy = n.d + n.h / 2; }
    else { n.cx = n.d + n.w / 2; n.cy = n.b; }
    n.x0 = n.cx - n.w / 2; n.y0 = n.cy - n.h / 2;
  });
  // Start the drawing at x = 0, counting notes and parents wider than their children.
  const minX = Math.min(...order.map(n => n.x0 - noteW(n)));
  order.forEach(n => { n.cx -= minX; n.x0 -= minX; });

  // Edges.
  order.filter(n => n.parent).forEach(n => {
    const p = n.parent, e = n.edge || {};
    const cls = `c-line${e.dash ? ' c-dash' : ''}${e.color ? ` c-${e.color}-line` : ''}`;
    let d;
    if (down) d = `M${p.cx} ${p.y0 + p.h} L${n.cx} ${n.y0 - (s.arrows ? 3 : 0)}`;
    else if (mode === 'mind') {
      const x1 = p.x0 + p.w, x2 = n.x0, mx = (x1 + x2) / 2;
      d = `M${x1} ${p.cy} C${mx} ${p.cy} ${mx} ${n.cy} ${x2} ${n.cy}`;
    } else {
      const px = p.x0 + 18;
      d = `M${px} ${p.y0 + p.h} V${n.cy} H${n.x0 - (s.arrows ? 3 : 0)}`;
    }
    BBG.el('path', { d, class: cls, 'stroke-width': e.bold ? 4 : 2.2,
      'marker-end': s.arrows ? (e.color ? `url(#m-arrow-${e.color})` : 'url(#m-arrow)') : null }, edgesG);
    if (e.label && down) {
      // 60% of the way down the edge, so labels of edges fanning out of one parent stay apart.
      const lx = p.cx + (n.cx - p.cx) * 0.6, ly = p.y0 + p.h + (n.y0 - p.y0 - p.h) * 0.6;
      BBG.label(edgesG, lx, ly, e.label, { size: fs * 0.75, padX: 3, padY: 1 });
    }
  });

  // Nodes.
  order.forEach(n => {
    const fill = n.hl ? 'c-yellow' : (n.cls || 'c-white');
    const stroke = n.leaf ? ' c-leaf' : '';
    if (n.kind === 'circle') BBG.el('circle', { cx: n.cx, cy: n.cy, r: n.w / 2, class: `c-node ${fill}${stroke}` }, nodesG);
    else if (n.kind === 'square') BBG.el('rect', { x: n.x0, y: n.y0, width: n.w, height: n.h, class: `c-node ${fill}${stroke}` }, nodesG);
    else if (n.kind === 'box') BBG.el('rect', { x: n.x0, y: n.y0, width: n.w, height: n.h, rx: 9, class: `c-box ${fill}${stroke}` }, nodesG);
    else if (n.kind === 'folder') BBG.icon(nodesG, 'folder', n.x0 + 20, n.cy, 40, 40, n.cls ? { style: `--icon-fill: var(--${n.cls.replace('c-', '')})` } : {});
    const label = String(n.label ?? '');
    if (!label) return;
    if (n.kind === 'circle' || n.kind === 'square') {
      // Small shapes keep their label beside them (quadtree counts).
      BBG.text(nodesG, n.x0 - 6, n.cy, label, { size: fs * 0.9, weight: 600, anchor: 'end' });
    } else if (n.kind === 'folder') {
      BBG.text(nodesG, n.x0 + 48, n.cy, label, { size: fs, weight: 700, anchor: 'start' });
    } else {
      BBG.text(nodesG, n.cx, n.cy, label, { size: fs, weight: n.kind === 'text' ? 500 : 600 });
    }
  });

  // Notes (cached results beside a trie node) and tags (a pointer such as "root").
  order.filter(n => n.note && down).forEach(n => {
    const size = fs * 0.85, nw = BBG.measure(n.note, { size, weight: 700 });
    const lines = n.note.split('\n').length;
    const tx = n.x0 - 12 - nw / 2;
    BBG.text(notesG, tx, n.cy, n.note, { size, weight: 700 });
    const top = Math.min(n.y0, n.cy - lines * size * 0.65) - 8, bottom = Math.max(n.y0 + n.h, n.cy + lines * size * 0.65) + 8;
    BBG.el('rect', { x: tx - nw / 2 - 10, y: top, width: n.x0 + n.w + 10 - (tx - nw / 2 - 10), height: bottom - top, rx: 10, class: 'c-note-group' }, notesG);
  });
  order.filter(n => n.tag).forEach(n => {
    const x = n.x0 + n.w + 6;
    BBG.el('path', { d: `M${x + 60} ${n.cy} H${x}`, class: 'c-line', 'stroke-width': 2.2, 'marker-end': 'url(#m-arrow)' }, nodesG);
    BBG.text(nodesG, x + 68, n.cy, n.tag, { size: fs, weight: 600, anchor: 'start' });
  });

  const byId = Object.fromEntries(order.filter(n => n.id).map(n => [n.id, n]));
  g.width = Math.max(...order.map(n => n.x0 + n.w)); g.height = Math.max(...order.map(n => n.y0 + n.h));
  g.at = (id, side = 'center') => {
    const n = byId[id];
    const p = { center: [n.cx, n.cy], left: [n.x0, n.cy], right: [n.x0 + n.w, n.cy], top: [n.cx, n.y0], bottom: [n.cx, n.y0 + n.h] }[side];
    return [s.x + p[0], s.y + p[1]];
  };
  return g;
});

// ---------------------------------------------------------------------------
// spatial — maps and spatial grids: a base (plain square, world outline or a
// schematic street grid) with grids, subdivided cells, points, search circles,
// polygons, routes, callouts and a Hilbert curve on top.
//
// BBG.spatial({
//   x, y, width: 600, height: 300,             the frame (top-left and size)
//   base: 'plain' | 'world' | 'streets',
//   world:   { projection: 'equirect' | 'mercator', crop: [lonMin, latMin, lonMax, latMax],
//              countries: { USA: 'c-purple', CHN: 'c-pink' }, graticule: 30, axes: true }
//              (needs assets/world-110m.js loaded first)
//   streets: { angle: -28, spacing: 70, major: 3 },
//   grid:    { cols: 2, rows: 2, labels: [['01', '11'], ['00', '10']], size: 40, hl: [[0, 0, 'c-green']], bold: [[0, 0]] },
//   splits:  [{ rect: [0, 0, 0.5, 0.5], cols: 2, rows: 2, labels: [['01 01', '01 11'], …], bold: true }],
//   points:  [{ at: [fx, fy] | ll: [lon, lat], label, cls: 'c-green', r: 9, icon: 'user', size: 32 }],
//            (a point outside the frame — at < 0 or > 1 — is drawn unclipped beside it; clip: false forces that)
//   circles: [{ at, r: 110, label, dash: true }],
//   polygons:[{ points: [[fx, fy], …], cls: 'c-blue', label }],
//   paths:   [{ points: [[fx, fy], …], color: 'red', arrow: true, width: 5 }],
//   callouts:[{ at | ll, dx: 0, dy: -80, label }],      a thin line to a label outside the point
//   hilbert: { order: 3 },
//   size: 15, frame: true, parent
// })
// Positions: at = fractions of the frame (0..1, from the top-left); ll = longitude,
// latitude on a world base. Returns the <g>; g.xy([fx, fy]) and g.ll([lon, lat]) give
// page positions.
// ---------------------------------------------------------------------------
BBG.define('spatial', spec => {
  const s = { x: 0, y: 0, width: 600, height: 300, base: 'plain', size: 15, frame: true, ...spec };
  const W = s.width, H = s.height, fs = s.size;
  const g = BBG.group(s.parent || BBG.layer(), s.x, s.y, 'c-spatial');
  const clipId = `c-map-${Math.random().toString(36).slice(2, 9)}`;
  BBG.el('rect', { width: W, height: H }, BBG.el('clipPath', { id: clipId }, BBG.el('defs', {}, g)));
  const inner = BBG.el('g', { 'clip-path': `url(#${clipId})` }, g);

  // Projection for the world base: lon/lat → frame px.
  const wo = s.world || {};
  const crop = wo.crop || [-180, -60, 180, 85];
  const merc = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360));
  const py = wo.projection === 'mercator' ? merc : lat => lat;
  const ll = ([lon, lat]) => [(lon - crop[0]) / (crop[2] - crop[0]) * W, (py(crop[3]) - py(lat)) / (py(crop[3]) - py(crop[1])) * H];
  const fxy = p => (p.ll ? ll(p.ll) : [p.at[0] * W, p.at[1] * H]);
  const toXY = pt => (Array.isArray(pt) ? [pt[0] * W, pt[1] * H] : fxy(pt));

  // Base.
  if (s.base === 'world') {
    BBG.el('rect', { width: W, height: H, class: 'c-sea' }, inner);
    if (wo.graticule) {
      for (let lon = -180; lon <= 180; lon += wo.graticule) { const [x] = ll([lon, 0]); BBG.el('path', { d: `M${x} 0 V${H}`, class: 'c-graticule' }, inner); }
      for (let lat = -90; lat <= 90; lat += wo.graticule) { const [, y] = ll([0, lat]); BBG.el('path', { d: `M0 ${y} H${W}`, class: 'c-graticule' }, inner); }
    }
    if (!window.BBG_WORLD) console.warn('BBG.spatial: world-110m.js not loaded; the world base is empty');
    const fills = wo.countries || {};
    Object.entries(window.BBG_WORLD || {}).forEach(([code, c]) => {
      const d = c.rings.map(r => {
        let out = '';
        for (let i = 0; i < r.length; i += 2) { const [px, pyy] = ll([r[i], r[i + 1]]); out += `${i ? 'L' : 'M'}${px.toFixed(1)} ${pyy.toFixed(1)}`; }
        return out + 'Z';
      }).join('');
      BBG.el('path', { d, class: `c-land ${fills[code] || ''}`.trim() }, inner);
    });
  } else if (s.base === 'streets') {
    const st = { angle: -28, spacing: 70, major: 3, ...(s.streets || {}) };
    BBG.el('rect', { width: W, height: H, class: 'c-blocks' }, inner);
    const roads = BBG.el('g', { transform: `rotate(${st.angle} ${W / 2} ${H / 2})` }, inner);
    const span = Math.hypot(W, H);
    for (let i = -Math.ceil(span / st.spacing); i <= Math.ceil(span / st.spacing); i++) {
      const o = i * st.spacing, major = i % st.major === 0;
      const cls = major ? 'c-road c-road-major' : 'c-road';
      BBG.el('path', { d: `M${W / 2 + o} ${H / 2 - span} V${H / 2 + span}`, class: cls }, roads);
      BBG.el('path', { d: `M${W / 2 - span} ${H / 2 + o * 1.3} H${W / 2 + span}`, class: cls }, roads);
    }
  } else {
    BBG.el('rect', { width: W, height: H, class: 'c-white' }, inner);
  }

  // Grids and subdivisions.
  const cellGrid = (x0, y0, w, h, cols, rows, opts = {}) => {
    const cw = w / cols, ch = h / rows;
    (opts.hl || []).forEach(([c, r, cls]) => BBG.el('rect', { x: x0 + c * cw, y: y0 + r * ch, width: cw, height: ch, class: `c-cell-fill ${cls || 'c-green'}` }, inner));
    for (let c = 1; c < cols; c++) BBG.el('path', { d: `M${x0 + c * cw} ${y0} V${y0 + h}`, class: 'c-grid-line' }, inner);
    for (let r = 1; r < rows; r++) BBG.el('path', { d: `M${x0} ${y0 + r * ch} H${x0 + w}`, class: 'c-grid-line' }, inner);
    const lab = opts.labels;
    if (lab) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const t = typeof lab === 'function' ? lab(c, r) : (lab[r] || [])[c];
      if (t !== undefined && t !== '') BBG.text(inner, x0 + (c + 0.5) * cw, y0 + (r + 0.5) * ch, t, { size: opts.size || fs * 1.4, weight: 700, cls: 'c-map-label' });
    }
    (opts.bold || []).forEach(([c, r]) => BBG.el('rect', { x: x0 + c * cw, y: y0 + r * ch, width: cw, height: ch, class: 'c-grid-bold' }, inner));
  };
  if (s.grid) cellGrid(0, 0, W, H, s.grid.cols, s.grid.rows, s.grid);
  (s.splits || []).forEach(sp => {
    const [a, b, c, d] = sp.rect;
    cellGrid(a * W, b * H, (c - a) * W, (d - b) * H, sp.cols || 2, sp.rows || 2, { ...sp, bold: null });
    if (sp.bold) BBG.el('rect', { x: a * W, y: b * H, width: (c - a) * W, height: (d - b) * H, class: 'c-grid-bold' }, inner);
  });

  // Hilbert curve over the whole frame.
  if (s.hilbert) {
    const n = 2 ** s.hilbert.order, pts = [];
    for (let i = 0; i < n * n; i++) {
      let t = i, x = 0, y = 0;
      for (let k = 1; k < n; k *= 2) {
        const rx = 1 & (t / 2), ry = 1 & (t ^ rx);
        if (ry === 0) { if (rx === 1) { x = k - 1 - x; y = k - 1 - y; } [x, y] = [y, x]; }
        x += k * rx; y += k * ry; t = Math.floor(t / 4);
      }
      pts.push([(x + 0.5) / n * W, (1 - (y + 0.5) / n) * H]);
    }
    BBG.el('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(''), class: 'c-line c-hilbert' }, inner);
  }

  // Shapes on top.
  (s.polygons || []).forEach(p => {
    const pts = p.points.map(toXY);
    BBG.el('path', { d: pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join('') + 'Z', class: `c-area ${p.cls || 'c-blue'}` }, inner);
    if (p.label) {
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      BBG.text(inner, cx, cy, p.label, { size: fs * 1.15, weight: 800 });
    }
  });
  (s.paths || []).forEach(p => {
    const pts = p.points.map(toXY);
    BBG.el('path', { d: pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join(''), class: `c-line${p.color ? ` c-${p.color}-line` : ''}`,
      'stroke-width': p.width || 4, 'marker-end': p.arrow ? (p.color ? `url(#m-arrow-${p.color})` : 'url(#m-arrow)') : null }, inner);
  });
  (s.circles || []).forEach(c => {
    const [x, y] = fxy(c);
    BBG.el('circle', { cx: x, cy: y, r: c.r, class: `c-radius${c.dash === false ? '' : ' c-dash'}` }, inner);
    if (c.label) BBG.label(inner, x, y - c.r, c.label, { size: fs });
  });
  // A point placed outside the frame (at < 0 or > 1, or ll beyond the crop) is drawn
  // unclipped, beside the map — e.g. the nearest thing a search does not read.
  (s.points || []).forEach(p => {
    const [x, y] = fxy(p);
    const out = p.clip === false || x < 0 || x > W || y < 0 || y > H;
    const layer = out ? g : inner;
    if (p.icon) BBG.icon(layer, p.icon, x, y, p.size || 32, p.size || 32);
    else BBG.el('circle', { cx: x, cy: y, r: p.r || 9, class: `c-node ${p.cls || 'c-green'}` }, layer);
    if (p.label) BBG.label(layer, x + (p.r || (p.icon ? (p.size || 32) / 2 : 9)) + 6, y, p.label, { size: fs, anchor: 'start' });
  });
  // Callouts may leave the frame, so they are drawn outside the clip.
  (s.callouts || []).forEach(c => {
    const [x, y] = fxy(c), tx = x + (c.dx || 0), ty = y + (c.dy ?? -80);
    BBG.el('path', { d: `M${x} ${y} L${tx} ${ty}`, class: 'c-thin c-callout' }, g);
    BBG.el('circle', { cx: x, cy: y, r: 4, fill: '#111' }, g);
    const right = (c.dx || 0) >= 0;
    BBG.el('circle', { cx: tx, cy: ty, r: 5, class: 'c-callout-dot' }, g);
    BBG.text(g, tx + (right ? 12 : -12), ty, c.label, { size: fs, weight: 700, anchor: right ? 'start' : 'end' });
  });
  if (s.frame) BBG.el('rect', { width: W, height: H, class: 'c-outline' }, g);
  if (s.base === 'world' && wo.axes) {
    for (let lon = -150; lon <= 150; lon += 50) { const [x] = ll([lon, 0]); BBG.text(g, x, H + fs * 1.1, lon, { size: fs * 0.85, weight: 500 }); }
    for (let lat = -75; lat <= 75; lat += 25) { const [, yy] = ll([0, lat]); if (yy > 4 && yy < H - 4) BBG.text(g, -8, yy, lat, { size: fs * 0.85, weight: 500, anchor: 'end' }); }
  }

  g.xy = f => [s.x + f[0] * W, s.y + f[1] * H];
  g.ll = p => { const [a, b] = ll(p); return [s.x + a, s.y + b]; };
  return g;
});

// ---------------------------------------------------------------------------
// code — a block of code with light syntax colouring.
//
// BBG.code({ x, y, text: 'SELECT * FROM t', lang: 'sql' | 'html' | 'js' | 'shell' | 'plain',
//            theme: 'light' | 'dark' | 'terminal', size: 15, width, title: 'task.groovy',
//            frame: true, parent })
// dark adds an editor window bar; terminal is green on black. Leading spaces are kept.
// Returns the <g> with width and height.
// ---------------------------------------------------------------------------
BBG.define('code', spec => {
  const s = { x: 0, y: 0, lang: 'plain', theme: 'light', size: 15, frame: true, ...spec };
  const fs = s.size, lh = fs * 1.5, pad = 16;
  const RULES = {
    sql: [[/--.*$/g, 'k-com'], [/'[^']*'|`[^`]*`/g, 'k-str'],
          [/\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|ORDER|GROUP|BY|LIMIT|DESC|ASC|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|ON|AS|CREATE|TABLE|PRIMARY|KEY|UNIQUE|BEGIN|COMMIT|NULL)\b/gi, 'k-kw'],
          [/\b\d+(\.\d+)?\b/g, 'k-num']],
    html: [[/<!--[\s\S]*?-->/g, 'k-com'], [/"[^"]*"/g, 'k-str'], [/<\/?[a-zA-Z][\w-]*|\/?>/g, 'k-kw'], [/\b[\w-]+(?==)/g, 'k-attr']],
    js: [[/\/\/.*$/g, 'k-com'], [/'[^']*'|"[^"]*"/g, 'k-str'],
         [/\b(const|let|var|function|return|if|else|for|while|new|class|import|from|export|await|async|true|false|null|task|input|output|next)\b/g, 'k-kw'],
         [/\b\d+(\.\d+)?\b/g, 'k-num']],
    shell: [[/^[^$>\n]*[$>]\s?/g, 'k-prompt'], [/(^|\s)#.*$/g, 'k-com']],
    plain: [],
  };
  const rules = RULES[s.lang] || [];
  // Split one line into [text, class] pieces; earlier rules win where matches overlap.
  const tokens = line => {
    const marks = new Array(line.length).fill(null);
    rules.forEach(([re, cls]) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        if (!m[0].length) { re.lastIndex++; continue; }
        let free = true;
        for (let i = m.index; i < m.index + m[0].length; i++) if (marks[i]) { free = false; break; }
        if (free) for (let i = m.index; i < m.index + m[0].length; i++) marks[i] = cls;
      }
    });
    const out = [];
    for (let i = 0; i < line.length; i++) {
      if (out.length && out[out.length - 1][1] === marks[i]) out[out.length - 1][0] += line[i];
      else out.push([line[i], marks[i]]);
    }
    return out;
  };
  const lines = String(s.text).replace(/^\n+|\s+$/g, '').split('\n');
  const tw = Math.max(...lines.map(l => BBG.measure(l, { size: fs, weight: 500, mono: true })));
  const bar = s.theme === 'dark' || s.title ? 30 : 0;
  const w = s.width || Math.ceil(tw + 2 * pad), h = Math.ceil(lines.length * lh + 2 * pad - (lh - fs) + bar);
  const g = BBG.group(s.parent || BBG.layer(), s.x, s.y, `c-code c-code-${s.theme}`);
  if (s.frame) BBG.el('rect', { width: w, height: h, rx: 10, class: 'c-code-bg' }, g);
  if (bar) {
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => BBG.el('circle', { cx: 18 + i * 18, cy: 16, r: 6, fill: c }, g));
    if (s.title) BBG.text(g, w / 2, 16, s.title, { size: fs * 0.8, weight: 600, cls: 'c-code-title' });
  }
  lines.forEach((line, i) => {
    const t = BBG.el('text', { x: pad, y: bar + pad + i * lh + fs / 2, 'dominant-baseline': 'central', 'font-size': fs, class: 'mono c-code-text', style: 'white-space: pre' }, g);
    tokens(line).forEach(([str, cls]) => { BBG.el('tspan', { class: cls }, t).textContent = str; });
  });
  g.width = w; g.height = h;
  return g;
});

// ---------------------------------------------------------------------------
// venn — two or three overlapping sets (CAP theorem).
//
// BBG.venn({ cx, cy, r: 150, spread: 0.62,
//            sets: [{ label: 'Consistency', cls: 'c-blue' }, …],         2 or 3 sets
//            overlaps: { '01': 'CA', '12': 'CP', '02': 'AP', '012': '' }, parent })
// Three sets sit top, bottom-left, bottom-right. Returns the <g>.
// ---------------------------------------------------------------------------
BBG.define('venn', spec => {
  const s = { cx: 0, cy: 0, r: 150, spread: 0.62, size: 22, ...spec };
  const n = s.sets.length, d = s.r * s.spread;
  const angles = n === 3 ? [-90, 150, 30] : [180, 0];
  const centres = angles.map(a => [s.cx + d * Math.cos(a * Math.PI / 180), s.cy + d * Math.sin(a * Math.PI / 180)]);
  const g = BBG.el('g', { class: 'c-venn' }, s.parent || BBG.layer());
  s.sets.forEach((set, i) => BBG.el('circle', { cx: centres[i][0], cy: centres[i][1], r: s.r, class: `c-set ${set.cls || 'c-green'}` }, g));
  s.sets.forEach((set, i) => BBG.el('circle', { cx: centres[i][0], cy: centres[i][1], r: s.r, class: 'c-outline' }, g));
  // Set labels sit in the part of each circle away from the others.
  s.sets.forEach((set, i) => {
    const [x, y] = centres[i], k = 0.55 * s.r / d;
    BBG.text(g, s.cx + (x - s.cx) * (1 + k), s.cy + (y - s.cy) * (1 + k), set.label, { size: s.size, weight: 700 });
  });
  Object.entries(s.overlaps || {}).forEach(([key, label]) => {
    if (!label) return;
    const idx = key.split('').map(Number);
    let x = idx.reduce((a, i) => a + centres[i][0], 0) / idx.length, y = idx.reduce((a, i) => a + centres[i][1], 0) / idx.length;
    if (idx.length === 2 && n === 3) {
      // Push a pairwise overlap away from the third circle, so it does not sit in the triple area.
      const other = [0, 1, 2].find(i => !idx.includes(i));
      x += (x - centres[other][0]) * 0.32; y += (y - centres[other][1]) * 0.32;
    }
    BBG.text(g, x, y, label, { size: s.size * 0.9, weight: 800 });
  });
  return g;
});

// ---------------------------------------------------------------------------
// funnel — stacked levels that narrow (QPS per step, conversion funnels).
//
// BBG.funnel({ x, y, width: 600, height: 300, levels: [{ label: 'View hotel\n(QPS=300)', cls: 'c-soft' }, …],
//              tip: 0.15, upright: false, size: 18, parent })
// The first level is the widest; upright: true turns it into a pyramid (widest at the bottom).
// Returns the <g>.
// ---------------------------------------------------------------------------
BBG.define('funnel', spec => {
  const s = { x: 0, y: 0, width: 600, height: 300, tip: 0.15, upright: false, size: 18, ...spec };
  const n = s.levels.length, lh = s.height / n, W = s.width;
  const g = BBG.group(s.parent || BBG.layer(), s.x, s.y, 'c-funnel');
  const half = f => (W / 2) * (1 - (1 - s.tip) * f);          // half width at fraction f of the height
  s.levels.forEach((lv, i) => {
    const f0 = i / n, f1 = (i + 1) / n;
    let top = i * lh, bot = (i + 1) * lh, wTop = half(f0), wBot = half(f1);
    if (s.upright) { top = s.height - (i + 1) * lh; bot = s.height - i * lh; [wTop, wBot] = [wBot, wTop]; }
    BBG.el('path', { d: `M${W / 2 - wTop} ${top} H${W / 2 + wTop} L${W / 2 + wBot} ${bot} H${W / 2 - wBot} Z`,
      class: `c-box ${lv.cls || 'c-white'}` }, g);
    BBG.text(g, W / 2, (top + bot) / 2, lv.label, { size: s.size, weight: 600 });
  });
  return g;
});
