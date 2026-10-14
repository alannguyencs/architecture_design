// Generated from .claude/skills/_shared/bbg-parts.js by _shared/sync.py. Edit the master copy, not this file.
// ByteByteGo shared parts: draws .shp outlines and applies the page variant.
// Load it as the last script in <body>: <script src="../assets/bbg-parts.js"></script>
//
// Shapes:   <div class="shp diamond" style="left:…; top:…; width:…; height:…">Text</div>
//           kinds: diamond, hexagon, ellipse, cylinder, parallelogram, brace, bracket
//           (brace / bracket take data-dir="down|up|left|right"; down = tip at the bottom).
// Variants: one page, several pictures. The variant comes from the URL hash (#v=name),
//           else from <html data-variant="name">. Then:
//             data-hl="a b"   → the element gets class "hl" in variants a and b
//             data-only="a b" → the element is shown only in variants a and b
//             data-not="a b"  → the element is hidden in variants a and b
//           render.py --variant name renders one picture per variant.
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function brace(w, h, s) {
    // Horizontal brace, tip at the bottom middle.
    const m = h / 2, q = Math.min(h / 2, w / 4);
    return `<path d="M${s} ${s} Q${s} ${m} ${q} ${m} L${w / 2 - q} ${m} Q${w / 2} ${m} ${w / 2} ${h - s}` +
           ` Q${w / 2} ${m} ${w / 2 + q} ${m} L${w - q} ${m} Q${w - s} ${m} ${w - s} ${s}"/>`;
  }
  function bracket(w, h, s) {
    return `<path d="M${s} ${s} V${h - s} H${w - s} V${s}"/>`;
  }

  const SHAPES = {
    diamond: (w, h, s) => `<polygon points="${w / 2},${s} ${w - s},${h / 2} ${w / 2},${h - s} ${s},${h / 2}"/>`,
    hexagon: (w, h, s) => {
      const k = Math.min(h / 2, w / 4);
      return `<polygon points="${k},${s} ${w - k},${s} ${w - s},${h / 2} ${w - k},${h - s} ${k},${h - s} ${s},${h / 2}"/>`;
    },
    ellipse: (w, h, s) => `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - s}" ry="${h / 2 - s}"/>`,
    parallelogram: (w, h, s) => {
      const k = Math.min(h / 2, w / 5);
      return `<polygon points="${k + s},${s} ${w - s},${s} ${w - k - s},${h - s} ${s},${h - s}"/>`;
    },
    cylinder: (w, h, s) => {
      const ry = Math.min(h * 0.12, 16), rx = w / 2 - s;
      return `<path d="M${s} ${ry + s} V${h - ry - s} A${rx} ${ry} 0 0 0 ${w - s} ${h - ry - s} V${ry + s}"/>` +
             `<ellipse cx="${w / 2}" cy="${ry + s}" rx="${rx}" ry="${ry}"/>`;
    },
  };
  // Brace and bracket are drawn pointing down, then turned to data-dir.
  const TURNED = { brace, bracket };
  const TURN = {
    down: () => '',
    up: (w, h) => `translate(0 ${h}) scale(1 -1)`,
    right: () => 'matrix(0 1 1 0 0 0)',
    left: (w) => `matrix(0 1 -1 0 ${w} 0)`,
  };

  function drawShapes() {
    document.querySelectorAll('.shp').forEach(el => {
      if (el.querySelector(':scope > svg.shp-bg')) return;
      const kind = Object.keys(SHAPES).concat(Object.keys(TURNED)).find(k => el.classList.contains(k));
      if (!kind) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      const s = (parseFloat(getComputedStyle(el).getPropertyValue('--shape-sw')) || 3) / 2;
      let body;
      if (SHAPES[kind]) {
        body = SHAPES[kind](w, h, s);
      } else {
        const dir = el.dataset.dir || 'down';
        const side = dir === 'left' || dir === 'right';
        const inner = TURNED[kind](side ? h : w, side ? w : h, s);
        body = `<g transform="${TURN[dir](w, h)}">${inner}</g>`;
      }
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'shp-bg');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.innerHTML = body;
      el.prepend(svg);
    });
  }

  function applyVariant() {
    const fromHash = new URLSearchParams(location.hash.slice(1)).get('v');
    const v = fromHash || document.documentElement.dataset.variant;
    if (!v) return;
    document.documentElement.dataset.variant = v;
    const has = (el, attr) => (el.getAttribute(attr) || '').split(/\s+/).includes(v);
    document.querySelectorAll('[data-hl]').forEach(el => { if (has(el, 'data-hl')) el.classList.add('hl'); });
    document.querySelectorAll('[data-only]').forEach(el => { if (!has(el, 'data-only')) el.style.display = 'none'; });
    document.querySelectorAll('[data-not]').forEach(el => { if (has(el, 'data-not')) el.style.display = 'none'; });
  }

  applyVariant();
  drawShapes();
})();
