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

  const BBG = {
    NS, MONO, el, group, text, icon, layer, measure, label,
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

  // Messages.
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
//   events:  [{ row: 0, t: 30, label: '1' }],  numbered circles on a row
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
  rows.forEach((r, i) => {
    if (r.label) BBG.text(g, -16, rowTop(i) + s.rowH / 2, r.label, { size: fs, weight: 700, anchor: 'end' });
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
//   hops:   [{ from: 'k0', to: 's0', dash: true, color: 'red', out: 34 }],   clockwise, outside the ring
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

  // Hops: from a key, out of the ring, clockwise to the owner, back in.
  (s.hops || []).forEach(h => {
    const A = nodes[h.from], B = nodes[h.to];
    const out = h.out ?? 34, R = s.r + out;
    const sweep = clockwise(A.at, B.at);
    const pad = Math.min(10, sweep / 3);
    const [x2, y2] = pt(A.at + pad, R), [x3, y3] = pt(B.at - pad, R);
    // Straight legs from each node's edge to the outer arc, pointing at the node's centre.
    const leg = (n, px, py) => { const dx = px - n.x, dy = py - n.y, l = Math.hypot(dx, dy); return [n.x + dx / l * (n.rr + 2), n.y + dy / l * (n.rr + 2)]; };
    const [x1, y1] = leg(A, x2, y2), [x4, y4] = leg(B, x3, y3);
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
  return g;
});
