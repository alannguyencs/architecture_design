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
