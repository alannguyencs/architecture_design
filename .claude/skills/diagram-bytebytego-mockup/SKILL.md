---
name: diagram-bytebytego-mockup
description: Draw a product screen as a ByteByteGo-style wireframe — phone, browser or desktop-app frames holding search boxes with suggestions, file and contact lists, forms, feed cards, notification banners, key/value panels (request headers, mail headers), file trees, and dashboards or map panels — as an HTML page rendered to PNG (or a looping GIF) with Playwright. Use when the user asks for a UI mockup, an app screen, a "what the user sees" figure, or to redraw a System Design Interview screenshot figure (news feed, autocomplete, Google Drive, notifications, YouTube home, nearby friends, checkout, dashboard) in the ByteByteGo look.
---

# ByteByteGo mockup

Some figures show a product's screen instead of its architecture. This skill
redraws them as **wireframes**: the same layout, but text becomes short neutral
words or grey bars, images become pastel blocks, and there are no real brand
marks. It shares the flow look (tokens, icons, pills) with the other ByteByteGo
skills.

Related skills: `diagram-bytebytego-flow` (architecture boxes and arrows),
`diagram-bytebytego-concept` (tables, sequences, rings, maps …),
`diagram-bytebytego-animated` (looping architecture GIFs).

## Rules

- **Wireframe, not screenshot.** Keep the layout and the idea; replace detail
  with bars and blocks. Copy at most a few words that carry the point (a typed
  prefix, a status code).
- **No real brand marks or product names.** Use generic names ("Drive",
  "Pay", "Video", "Booking") and the shared look-alike icons.
- **Never draw a working-looking login or payment page.** Form fields stay empty
  wireframe boxes (a grey bar at most); card, password and account fields carry
  no real-looking values; a page with such fields gets `badge: 'Mockup'`.
  `BBM.form` only draws `div`s, never real `<input>` elements.
- The header is the title only — no accent bar, no logo.
- Book figures are copyrighted: rebuilt figures stay internal, and output goes to
  `data/generated/`.

## Files

| Path (relative to this skill) | What it is |
|---|---|
| `assets/bbg-mockup.js` | `window.BBM`: `frame`, `search`, `list`, `form`, `card`, `kvpanel`, `filetree`, `sidebar`, `panel`, placeholders (`bar`, `bars`, `img`, `avatar`, `chip`), UI line icons (`ui`), shared icons (`icon`), `place`, and animation helpers (`states`, `slideIn`, `scroll`) |
| `assets/bbg-mockup.css` | Styles for every part (`.m-*`) |
| `assets/bbg-concept.js` | Copy of the concept skill's helpers, for `BBG.timeline` / `BBG.spatial` inside dashboards and map panels |
| `assets/bbg-flow.css`, `bbg-icons.js`, `bbg-parts.css`, `bbg-parts.js` | Shared kit (generated copies) |
| `scripts/render.py`, `scripts/render_gif.py` | HTML → PNG / looping GIF (generated copies) |
| `templates/*.html` | Book-figure rebuilds and galleries — see the list below |

Needs Python `playwright` (Chromium), Pillow, and `ffmpeg` for GIFs.

## Make a mockup

1. Copy a template; set the `.canvas` size. Load order: `bbg-flow.css`,
   `bbg-parts.css`, `bbg-mockup.css`; `bbg-icons.js` as the first child of
   `.canvas`; after `.canvas`: (`bbg-concept.js` if you need a chart or a map),
   `bbg-mockup.js`, the page's own `<script>`, `bbg-parts.js` last.
2. Build in the page script:

   ```js
   const phone = BBM.frame({ kind: 'phone', x: 60, y: 120, w: 360, h: 720, title: 'Nearby Friends',
                             left: 'back', right: 'gear', tabs: [{ icon: 'home', label: 'Feed', on: true }, …] });
   phone.body.append(BBM.list({ rows: [{ avatar: { fill: 'var(--purple)', icon: 'users' }, title: 'Mallow', sub: '0.5 mi' }] }));
   BBM.place(BBM.search({ value: 'din', caret: true, suggestions: ['dinner', 'dinner ideas'] }), 700, 160, 460);
   ```

   - `frame({ kind: 'phone' | 'browser' | 'window', x, y, w, h, title, left, right, tabs, url, app, theme: 'dark', caption, badge, flush })` → `{ el, body }`
   - `search({ value, caret, suggestions, big, square, mic, avatar, buttons, size })` — the part of each suggestion after `value` is bold
   - `list({ head, rows: [{ icon | avatar | img, title, sub, meta, more, hl, cells }], size })`
   - `form({ steps, current, heading, lines, total, fields: [{ label, kind: 'box' | 'card' | 'select' | 'check' | 'radio', bar }], note, buttons, divider, size })`
   - `card({ kind: 'post' | 'banner' | 'bubble' | 'thumb' | 'email', … })`
   - `kvpanel({ rows: [[key, value, { mark, color, chip }] | { group }], size, mono })`
   - `filetree({ items: [{ name, depth, open, file }], size })`
   - `sidebar(items, { w, top })` for app windows; `panel({ x, y, w, h, title })` → `{ inner }`, a dark dashboard box whose inner rect hosts `BBG.timeline` / `BBG.spatial`
   - Placeholders: `bar(w, 'dark' | 'thin')`, `bars([…])`, `img({ h, fill, play, label })`, `avatar({ size, fill, icon })`, `chip(text, fill)`; icons: `ui('search')` (line icons), `icon('folder')` (shared sprite)
3. Render: `python3 .claude/skills/diagram-bytebytego-mockup/scripts/render.py <page> data/generated/<name>.png --scale 1`, look at the PNG, adjust.

## Animate

`BBM.states([el1, el2, …])` shows each element during its own share of the loop
(typing into a search box, a folder opening); `BBM.slideIn(el, { from, at })`
slides a banner in; `BBM.scroll(el, { dy, at })` scrolls a feed. They use Web
Animations, which `render_gif.py` seeks frame by frame. One loop is `BBM.LOOP`
ms (3000); pass the same value as `--loop-ms`.

## Shared kit

`bbg-flow.css`, `bbg-icons.js`, `bbg-parts.css`, `bbg-parts.js`, `render.py`,
`render_gif.py` (from `.claude/skills/_shared/`) and `bbg-concept.js` (from the
concept skill) are copies written by `python3 .claude/skills/_shared/sync.py`.
Never edit them here.
