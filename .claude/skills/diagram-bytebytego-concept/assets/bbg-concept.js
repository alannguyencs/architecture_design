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

  const BBG = {
    NS, el, group, text, icon, layer,
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
