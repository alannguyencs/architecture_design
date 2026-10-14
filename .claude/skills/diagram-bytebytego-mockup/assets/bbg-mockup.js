// ByteByteGo mockup helpers: wireframes of product screens, built from data as HTML.
// Every component takes one plain object and returns an element (frames return
// { el, body }); place parts inside a frame's body, or straight on the canvas with
// BBM.place(el, x, y, w, h). Wireframe, not screenshot: text is short or a grey bar,
// images are pastel blocks, and there are no real brand marks.
//
// Load order in a page:
//   <script src="../assets/bbg-icons.js"></script>    first child of .canvas
//   <script src="../assets/bbg-mockup.js"></script>   after .canvas (plus bbg-concept.js for dashboards / maps)
//   <script src="../assets/bbg-parts.js"></script>    last
(function () {
  // ---- DOM helpers ----
  function h(tag, cls, ...kids) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    kids.flat().forEach(k => { if (k !== null && k !== undefined && k !== false) node.append(k instanceof Node ? k : document.createTextNode(String(k))); });
    return node;
  }
  function css(node, styles) { Object.assign(node.style, styles); return node; }
  const canvas = () => document.querySelector('.canvas');
  function place(node, x, y, w, hgt) {
    css(node, { position: 'absolute', left: `${x}px`, top: `${y}px` });
    if (w) node.style.width = `${w}px`;
    if (hgt) node.style.height = `${hgt}px`;
    canvas().append(node);
    return node;
  }

  // ---- Small line icons for UI chrome (24 × 24, stroke currentColor) ----
  const UI = {
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.8-4.8',
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21',
    menu: 'M4 7h16M4 12h16M4 17h16',
    back: 'M15 5l-7 7 7 7',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
    home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z',
    users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-4 3.2-6 6.5-6s6 2 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14c2 .8 3 2.8 3.2 6',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0',
    chat: 'M4 5h16v11H9l-5 4z',
    more: 'M6 12h.01M12 12h.01M18 12h.01',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    plus: 'M12 5v14M5 12h14',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
    filter: 'M4 5h16l-6 8v6l-4 2v-8z',
    pin: 'M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    card: 'M3 6h18v12H3zM3 10h18',
    play: 'M8 5l11 7-11 7z',
    chevron: 'M9 5l7 7-7 7',
    down: 'M6 9l6 6 6-6',
    up: 'M6 15l6-6 6 6',
    lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
    camera: 'M4 7h4l2-3h4l2 3h4v12H4zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  };
  function ui(name, size = 20, color = null) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('class', 'm-ui');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', UI[name] || UI.more);
    p.setAttribute('fill', name === 'play' ? 'currentColor' : 'none');
    p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', name === 'more' ? 3.5 : 2);
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    svg.append(p);
    if (color) svg.style.color = color;
    return svg;
  }
  // A shared sprite icon (bbg-icons.js), e.g. icon('folder', 28).
  function icon(id, size = 28, fill = null) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('class', 'm-ui');
    if (fill) svg.style.setProperty('--icon-fill', fill);
    const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', `#${id}`); svg.append(u);
    return svg;
  }

  // ---- Placeholders ----
  const bar = (w = '80%', cls = '') => css(h('div', `m-bar ${cls}`.trim()), { width: typeof w === 'number' ? `${w}px` : w });
  const bars = (widths, cls = '') => h('div', 'm-col', widths.map(w => bar(w, cls)));
  function img({ w = '100%', h: hh = 120, fill = null, play = false, label = null } = {}) {
    const node = css(h('div', 'm-img'), { width: typeof w === 'number' ? `${w}px` : w, height: `${hh}px` });
    if (fill) node.style.setProperty('--m-img', fill);
    if (play) node.append(css(ui('play', Math.min(56, hh * 0.45)), { color: '#fff' }));
    if (label) node.append(css(h('span', null, label), { fontWeight: 800, fontSize: '14px' }));
    return node;
  }
  function avatar({ size = 40, fill = null, icon: id = null } = {}) {
    const node = css(h('div', 'm-avatar'), { width: `${size}px`, height: `${size}px` });
    if (fill) node.style.setProperty('--m-av', fill);
    if (id) node.append(ui(id, size * 0.6));
    return node;
  }
  const chip = (text, fill = null) => { const c = h('span', 'm-chip', text); if (fill) c.style.setProperty('--m-chip', fill); return c; };

  // ---- frame ----
  // BBM.frame({ kind: 'phone' | 'browser' | 'window', x, y, w, h, theme: 'light' | 'dark',
  //             time: '10:52', url: 'drive.example/my-drive', title: 'Nearby Friends', titleFill: 'var(--blue)',
  //             left: 'back' | 'menu', right: 'gear', tabs: [{ icon: 'home', label: 'Feed', on: true }, …],
  //             caption: 'Push notification', badge: 'Mockup', flush: false })
  // Returns { el, body }: append parts to body.
  function frame(s) {
    const el = h('div', `m-frame ${s.kind || 'phone'}${s.theme === 'dark' ? ' dark' : ''}`);
    if (s.kind === 'phone' || !s.kind) {
      el.append(h('div', 'm-status', h('span', null, s.time || '9:41'),
        h('span', 'm-sig', [6, 9, 12, 15].map(x => css(h('i'), { height: `${x}px` })))));
    }
    if (s.kind === 'browser') el.append(h('div', 'm-chrome', h('span', 'm-dots', h('i'), h('i'), h('i')), h('span', 'm-url', s.url || '')));
    if (s.kind === 'window') el.append(h('div', 'm-chrome', h('span', 'm-dots', h('i'), h('i'), h('i')), css(h('b', null, s.app || ''), { fontSize: '14px' })));
    if (s.title !== undefined) {
      const tb = h('div', 'm-titlebar', s.left ? ui(s.left, 24) : null, h('span', 'm-grow', s.title), s.right ? ui(s.right, 24) : null);
      if (s.titleFill) tb.style.setProperty('--m-title-bg', s.titleFill);
      el.append(tb);
    }
    const body = h('div', `m-body${s.flush ? ' flush' : ''}`);
    el.append(body);
    if (s.tabs) el.append(h('div', 'm-tabbar', s.tabs.map(t => h('div', `m-tab${t.on ? ' on' : ''}`, ui(t.icon, 24), t.label))));
    if (s.kind === 'phone' || !s.kind) el.append(h('div', 'm-home'));
    if (s.badge) el.append(h('div', 'm-badge', s.badge));
    place(el, s.x, s.y, s.w, s.h);
    if (s.caption) place(h('div', 'm-caption', s.caption), s.x + s.w / 2, s.y + s.h + 10);
    return { el, body };
  }

  // ---- search ----
  // BBM.search({ value: 'dinner', caret: true, placeholder: 'Search', suggestions: ['dinner ideas', …],
  //              big: false, square: false, mic: true, buttons: ['Search', 'Lucky'], size: 18 })
  // The part of each suggestion after `value` is bold, as in autocomplete.
  function search(s) {
    const node = h('div', `m-search${s.square ? ' square' : ''}`);
    if (s.size) node.style.setProperty('--m-fs', `${s.size}px`);
    const input = h('div', 'm-input', s.big ? null : css(ui('search', 20), { color: '#777' }),
      s.value ? h('span', 'm-typed', s.value) : h('span', 'm-ph', s.placeholder || 'Search'),
      s.caret ? h('span', 'm-caret') : null);
    if (s.mic) input.append(css(ui('mic', 22, 'var(--m-accent)'), { marginLeft: 'auto' }));
    if (s.avatar) input.append(css(avatar({ size: 30, fill: s.avatar }), { marginLeft: 'auto' }));
    node.append(input);
    if (s.suggestions && s.suggestions.length) {
      const list = h('div', `m-sugg${s.big ? ' big' : ''}`);
      s.suggestions.forEach(t => {
        const typed = s.value && t.startsWith(s.value) ? s.value : '';
        list.append(h('div', null, s.big ? null : css(ui('search', 16), { color: '#999' }), h('span', null, typed, h('b', null, t.slice(typed.length)))));
      });
      node.append(list);
    }
    if (s.buttons) node.append(h('div', 'm-search-btns', s.buttons.map(b => css(h('div', 'm-btn secondary', b), { height: '34px', padding: '0 14px', fontSize: '14px', fontWeight: 600 }))));
    return node;
  }

  // ---- list ----
  // BBM.list({ head: ['Name', 'Owner', 'Last modified'],          table-like rows with cells
  //            rows: [{ icon: 'folder', fill, avatar: { fill, icon }, title, sub, meta, more: true, hl: true, cells: […] }],
  //            size: 16 })
  function list(s) {
    const node = h('div', 'm-list');
    if (s.size) node.style.setProperty('--m-fs', `${s.size}px`);
    if (s.head) node.append(h('div', 'm-head', s.icons === false ? null : css(h('span'), { width: '28px', flex: 'none' }),
      s.head.map((c, i) => h('span', `m-cell${i === 0 ? ' w2' : ''}`, c))));
    s.rows.forEach(r => {
      const lead = r.icon ? icon(r.icon, r.iconSize || 28, r.fill) : r.avatar ? avatar(r.avatar) : r.img ? img(r.img) : null;
      const row = h('div', `m-li${r.hl ? ' hl' : ''}`, lead);
      if (r.cells) row.append(r.cells.map((c, i) => h('span', `m-cell${i === 0 ? ' w2 m-title' : ''}`, c)));
      else {
        row.append(h('div', 'm-col', h('span', 'm-title', r.title ?? ''), r.sub ? h('span', 'm-sub', r.sub) : null, r.subBar ? bar(r.subBar, 'thin') : null));
        if (r.meta) row.append(h('span', 'm-meta', r.meta));
        if (r.more) row.append(css(ui('more', 22), { marginLeft: r.meta ? '8px' : 'auto', color: '#777' }));
      }
      node.append(row);
    });
    return node;
  }

  // ---- form ----
  // BBM.form({ steps: ['Selection', 'Details', 'Final step'], current: 2,
  //            heading: 'Almost done', lines: [['Room', '$508'], …], total: ['Total', '$592'],
  //            fields: [{ label: 'Card', kind: 'box' | 'card' | 'select' | 'check' | 'radio', bar: '40%', on: true }],
  //            note: 'No charge now', buttons: [{ label: 'Complete booking' }, { label: 'Pay by card', kind: 'secondary' }],
  //            divider: 'or', size: 15 })
  // Fields are empty wireframe boxes (a grey bar at most), never real inputs.
  function form(s) {
    const node = h('div', 'm-form');
    if (s.size) node.style.setProperty('--m-fs', `${s.size}px`);
    if (s.steps) {
      const st = h('div', 'm-stepper');
      s.steps.forEach((name, i) => {
        if (i) st.append(h('div', 'm-link'));
        st.append(h('div', `m-step${i < s.current ? ' done' : i === s.current ? ' on' : ''}`, h('i', null, i < s.current ? '✓' : ''), name));
      });
      node.append(st);
    }
    if (s.heading) node.append(css(h('div', null, s.heading), { fontSize: '1.3em', fontWeight: 800, textAlign: 'center' }));
    if (s.lines) node.append(h('div', 'm-price', s.lines.map(([a, b]) => h('div', null, h('span', null, a), h('span', null, b))),
      s.total ? h('div', 'total', h('span', null, s.total[0]), h('span', null, s.total[1])) : null));
    (s.fields || []).forEach(f => {
      if (f.kind === 'check' || f.kind === 'radio') {
        node.append(h('div', 'm-check', h('i', `${f.kind === 'radio' ? 'round' : ''}${f.on ? ' on' : ''}`.trim()), f.label));
        return;
      }
      const box = h('div', 'm-box', f.kind === 'card' ? ui('card', 22) : null, f.bar ? bar(f.bar) : null,
        f.kind === 'select' ? css(ui('down', 18), { marginLeft: 'auto' }) : null);
      if (f.w) box.style.width = f.w;
      node.append(h('div', 'm-field', f.label ? h('label', null, f.label) : null, box));
    });
    if (s.note) node.append(h('div', 'm-note', ui('check', 18, '#1f7a45'), s.note));
    (s.buttons || []).forEach((b, i) => {
      if (i && s.divider) node.append(h('div', 'm-divider', s.divider));
      node.append(h('div', `m-btn${b.kind === 'secondary' ? ' secondary' : ''}`, b.label));
    });
    return node;
  }

  // ---- card ----
  // BBM.card({ kind: 'post', avatar: 'var(--blue)', lines: ['70%', '45%'], body: ['90%', '80%'], img: { h: 160, play: true } })
  // BBM.card({ kind: 'banner', icon: 'bell', title: 'Stock alert', text: ['90%', '60%'], meta: 'now' })
  // BBM.card({ kind: 'bubble', me: false, text: ['80%', '60%'] })
  // BBM.card({ kind: 'thumb', img: { h: 90, fill }, title: '70%', sub: '50%' })
  // BBM.card({ kind: 'email', from: 'Sender', subject: '70%', img: { h: 140 } })
  function card(s) {
    if (s.kind === 'banner') {
      return h('div', 'm-banner', avatar({ size: 34, fill: s.fill || 'var(--green)', icon: s.icon || 'bell' }),
        h('div', 'm-col', css(h('div', 'm-row-flex', h('b', null, s.title || ''), s.meta ? css(h('span', null, s.meta), { marginLeft: 'auto', fontSize: '12px', color: '#666' }) : null), { width: '100%' }),
          (s.text || ['90%', '60%']).map(w => bar(w, 'thin'))));
    }
    if (s.kind === 'bubble') return h('div', `m-bubble${s.me ? ' me' : ''}`, (s.text || ['90%', '60%']).map(w => css(bar(w, 'thin'), { minWidth: '40px' })));
    if (s.kind === 'thumb') return h('div', 'm-col', img(s.img || { h: 90 }), bar(s.title || '80%', 'dark'), bar(s.sub || '50%', 'thin'));
    if (s.kind === 'email') {
      return h('div', 'm-card solid', h('div', 'm-row-flex', avatar({ size: 28, fill: s.fill || 'var(--purple)' }), h('b', null, s.from || ''), css(ui('star', 18), { marginLeft: 'auto' })),
        bar(s.subject || '70%', 'dark'), s.img ? img(s.img) : null, bars(s.text || ['90%', '75%']));
    }
    // post
    return h('div', `m-card${s.solid ? ' solid' : ''}`,
      h('div', 'm-row-flex', s.avatar === false ? null : avatar({ size: 40, fill: s.avatar || 'var(--blue)' }), bars(s.lines || ['60%', '35%'])),
      s.body ? bars(s.body, 'dark') : null,
      s.img ? img(s.img) : null);
  }

  // ---- kvpanel ----
  // BBM.kvpanel({ rows: [['Request URL', 'https://…'], { group: 'Response headers' }, ['status', '301', { mark: true, color: 'green' }]],
  //               size: 14, mono: true })
  // mark: true draws a red box round the row (mark: 'black' for black).
  function kvpanel(s) {
    const node = h('div', 'm-kv');
    if (s.size) node.style.setProperty('--m-fs', `${s.size}px`);
    s.rows.forEach(r => {
      if (!Array.isArray(r)) { node.append(h('div', 'group', r.group)); return; }
      const [k, v, o = {}] = r;
      const kk = h('span', 'k', k), vv = h('span', `v${o.color ? ` ${o.color}` : ''}`, v);
      if (o.chip) vv.prepend(chip(o.chip, 'var(--green)'), ' ');
      if (o.mark) { const m = o.mark === 'black' ? 'mark black' : 'mark'; kk.className += ` ${m}`; vv.className += ` ${m}`; }
      if (s.mono === false) vv.style.fontFamily = 'inherit';
      node.append(kk, vv);
    });
    return node;
  }

  // ---- filetree ----
  // BBM.filetree({ items: [{ name: 'drive', depth: 0, open: true }, { name: 'notes.txt', depth: 1, file: true }], size: 17 })
  function filetree(s) {
    const node = h('div', 'm-tree');
    if (s.size) node.style.setProperty('--m-fs', `${s.size}px`);
    s.items.forEach(it => {
      const n = h('div', 'm-node', h('span', 'm-tri', it.file ? '' : it.open ? '▾' : '▸'), icon(it.file ? 'doc' : 'folder', 24), it.name);
      n.style.setProperty('--d', it.depth || 0);
      node.append(n);
    });
    return node;
  }

  // ---- side navigation (app windows) ----
  // BBM.sidebar([{ icon: 'home', label: 'My files', on: true }, …], { w: 170, top: element })
  function sidebar(items, { w = 170, top = null } = {}) {
    const side = h('div', 'm-side', top, items.map(i => h('div', `m-nav${i.on ? ' on' : ''}`, ui(i.icon, 18), i.label)));
    side.style.setProperty('--m-side', `${w}px`);
    return side;
  }

  // ---- dashboard panel: a dark box whose inner rect hosts BBG.timeline / BBG.spatial ----
  // const p = BBM.panel({ x, y, w, h, title }); p.inner → { x, y, w, h } in canvas px.
  function panel(s) {
    const el = place(h('div', 'm-panel', s.title ? h('div', 'm-ptitle', s.title) : null), s.x, s.y, s.w, s.h);
    const pad = s.pad ?? 16, top = s.title ? 30 : pad;
    return { el, inner: { x: s.x + pad, y: s.y + top, w: s.w - 2 * pad, h: s.h - top - pad } };
  }

  // ---- Animation (Web Animations, seekable by scripts/render_gif.py) ----
  // One loop is BBM.LOOP ms; pass the same value to render_gif.py --loop-ms.
  const anim = (node, keyframes) => node.animate(keyframes, { duration: BBM.LOOP, iterations: Infinity, easing: 'linear' });
  // Show each element during its own equal share of the loop (typing states, folder states).
  function states(nodes) {
    const n = nodes.length;
    nodes.forEach((node, i) => {
      const a = i / n, b = (i + 1) / n, kf = [];
      kf.push({ offset: 0, opacity: i === 0 ? 1 : 0 });
      if (i > 0) kf.push({ offset: a - 1e-4, opacity: 0 }, { offset: a, opacity: 1 });
      if (i < n - 1) kf.push({ offset: b - 1e-4, opacity: 1 }, { offset: b, opacity: 0 });
      kf.push({ offset: 1, opacity: i === n - 1 ? 1 : 0 });
      anim(node, kf);
    });
  }
  // Slide an element in from an offset during [at[0], at[1]] and hold it until the loop ends.
  function slideIn(node, { from = [0, -80], at = [0.1, 0.3] } = {}) {
    const t = ([x, y]) => `translate(${x}px, ${y}px)`;
    anim(node, [{ offset: 0, transform: t(from), opacity: 0 }, { offset: at[0], transform: t(from), opacity: 0 },
                { offset: at[1], transform: t([0, 0]), opacity: 1 }, { offset: 1, transform: t([0, 0]), opacity: 1 }]);
  }
  // Scroll an element up by dy during [at[0], at[1]] (the frame body clips it).
  function scroll(node, { dy = 300, at = [0.15, 0.85] } = {}) {
    anim(node, [{ offset: 0, transform: 'translateY(0px)' }, { offset: at[0], transform: 'translateY(0px)' },
                { offset: at[1], transform: `translateY(${-dy}px)` }, { offset: 1, transform: `translateY(${-dy}px)` }]);
  }

  const BBM = {
    h, css, place, ui, icon, bar, bars, img, avatar, chip,
    frame, search, list, form, card, kvpanel, filetree, sidebar, panel,
    LOOP: 3000, states, slideIn, scroll, animate: anim,
  };
  window.BBM = BBM;
})();
