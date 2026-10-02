# How to make ByteByteGo-style architecture images and GIFs

- Task: [AD-1 Collect architecture design templates](https://jarvis.huuthanhnguyen.work/tasks/AD-1)
- Date: 2026-10-02
- Input: the 9 files in `data/examples/`

## 1. What is in `data/examples/`

| File | Size (px) | Topic | Source style |
|---|---|---|---|
| `0_CqXxd5b308ZJ2DSJ.gif` | 1329 × 1536, 75 frames | How to design a system like YouTube | ByteByteGo, animated |
| `0103-how-do-search-engines-work.png` | 2560 × 3300 | How search engines work | ByteByteGo, older "bold icon" style |
| `1761598234311.jpeg` | 1280 × 1628 | What is the Model Context Protocol? | ByteByteGo |
| `1762220065561.jpeg` | 1280 × 1628 | What is an AI agent? | ByteByteGo |
| `1763532310396.jpeg` | 1317 × 1536 | How Uber's conversational AI agent works | ByteByteGo |
| `1780498486178.jpeg` | 1280 × 1654 | How OpenAI built its data agent | ByteByteGo |
| `…b31ydwucircerujkyrnj.webp` | 800 × 850 | Microservice architecture | ByteByteGo, older green-card style |
| `380e98e8-…_1600x929.png` | 1600 × 929 | Client-server architecture | Not ByteByteGo — a draw.io diagram with Azure-style icons |
| `figure-1-6-L2YNDDKF.png` | 1725 × 1827 | Web tier + data tier with DNS | *System Design Interview* book figure — draw.io style |

Seven of the nine are ByteByteGo posts. The last two are plain draw.io diagrams, useful as a contrast: same content, much less visual appeal.

## 2. The ByteByteGo visual grammar

All ByteByteGo images follow the same recipe. If we copy these rules, our images will look like theirs.

### 2.1 Canvas

- **Portrait**, about **1280 × 1600** (ratio ~4:5) — the LinkedIn / Instagram feed size. The search-engine image is the same layout at 2×.
- White background, no outer border.
- Lots of white space; about 8–15 nodes per image, never more.

### 2.2 Header (the same on every post)

- A thick **vertical accent bar** (green/teal) on the far left.
- Title as a question: *"How to Design a …?"*, *"What is …?"*, *"How … Works?"*.
- The key words sit in a **highlight pill** — a rounded rectangle in a strong colour (magenta `#FF66FF`-ish, teal, or green) behind black or white bold text.
- The **ByteByteGo logo** top-right.
- A thin grey rule under the header on some posts.

### 2.3 Nodes

- **Icon + label below** is the main node type. Icons are the "lineal colour" style: thick black outline, flat pastel fill, small highlight (the style sold on Flaticon / Freepik). Brand logos (Redis, Postgres, Slack, GitHub, Google Drive, OpenAI) appear as real logos.
- **Boxes**: rounded rectangles, 2–3 px coloured border, pastel fill of the same hue (purple `#C9B3FF` / border `#6A3FD0`, cyan `#B8F2F7`, green `#7EEBB0`, pink `#F9B8D0`, orange `#FFC966`).
- **Cylinders** for databases, **cloud shapes** for external providers, **document shapes** for files/sheets.
- **Black pill labels** (black fill, white bold text) for section names: "Tools", "Runtime Workflow", "MCP Host".

### 2.4 Groups

- Dashed rounded rectangles with a very light tint (light yellow, light green, light orange) group related parts: "Finch Service", "Data Sources", "Context assembly".
- The group name is either small text in the top-left corner or a black pill sitting on the border.

### 2.5 Edges

- Thin black or dark-grey lines (≈2 px), open "V" arrow-heads.
- Smooth curves (Bézier) are common — the YouTube GIF draws the whole flow as a big circle.
- Dashed lines for async or optional flows; double-headed arrows for two-way traffic.
- Short edge labels ("SQL", "JSON", "MDX", "Query").

### 2.6 Step numbers

- Numbered circles (①…⑨) next to edges tell the reading order. Black-filled circles with white numbers in newer posts, outlined circles in the YouTube GIF.

### 2.7 Type

- A clean geometric sans-serif (Inter / SF Pro–like) for labels, bold for titles. The older search-engine post uses a heavy condensed display font in the title.

## 3. How the GIF works

Measured with Pillow on `0_CqXxd5b308ZJ2DSJ.gif`:

| Property | Value |
|---|---|
| Frames | 75 |
| Frame time | 30 ms each (≈33 fps) |
| Loop length | 2.25 s, loops forever (`loop=0`) |
| Colours | 233 (a single 256-colour palette) |
| File size | 1.1 MB |

A frame-by-frame difference shows that **only about 4,800 pixels change between frames** (≈0.2 % of the image). The arrows, boxes and text never move. What moves are the **icons themselves**:

- the upload icon bounces,
- the load-balancer dots pulse,
- the video-file icons wiggle,
- the "transcoding" spinner circles rotate,
- the CDN corner dots blink.

So the GIF is **a static diagram with animated icons** (Lottie-style micro-animations, like Lordicon / LottieFiles icons), not an animated data flow. This is cheap to make: one layout plus a short loop of each icon.

## 4. How to generate this kind of image

Three routes, from most control to least effort.

### 4.1 Route A — HTML/SVG + headless browser (recommended)

Write each diagram as one HTML page with inline SVG (or absolutely positioned `<div>`s), styled by a shared CSS file that holds the grammar from section 2 (colours, pill, accent bar, box styles, arrow markers). Render it with Playwright:

```bash
npx playwright screenshot --viewport-size=1280,1600 --device-scale-factor=2 \
  diagram.html out.png
```

Why this route:

- Full control of every visual rule — it is the only route that can match the ByteByteGo look closely.
- Text-based, so an LLM (Claude) can write a new diagram from a short description, and we can keep the files in git.
- The same page drives the GIF (route in section 5).

Icons: use an SVG icon set in the lineal-colour style (Flaticon / Freepik licence needed), or free sets such as Iconify (`fluent-emoji-flat`, `flat-color-icons`, `streamline-color`) and brand logos from Simple Icons.

### 4.2 Route B — diagram-as-code tools

| Tool | Fit for this style | Note |
|---|---|---|
| **draw.io** (+ `drawio` CLI export) | Good | What the two non-ByteByteGo examples use. Custom styles and icon libraries; XML can be generated. |
| **Excalidraw** | Medium | Hand-drawn look, not ByteByteGo's clean look. |
| **D2** (`d2 --layout elk`) | Medium | Auto layout, custom icons and themes; less control over exact positions. |
| **Python `diagrams`** (mingrammer) | Low | Cloud-provider icons only, Graphviz layout. |
| **Mermaid** | Low | Fast, but the look is hard to change. |

Good for fast drafts and internal docs; not for posts that need to look polished.

### 4.3 Route C — manual design tool

ByteByteGo's own images look hand-placed in a vector editor (Figma or similar) with a reusable component library. Doing the same in Figma — a frame of 1280 × 1600, components for the header, boxes, pills, step circles — gives the best result but is slow and not scriptable.

## 5. How to generate the GIF

Two kinds of animation are worth making:

1. **Animated icons** (what the example does) — swap static icons for Lottie animations.
2. **Flow animation** (more useful for teaching) — dots travel along the edges, or the steps light up one by one (① → ②…).

Both work on top of the Route A HTML page:

1. **Animate in the page.**
   - Icons: `<lottie-player>` / `lottie-web` with Lordicon or LottieFiles JSON.
   - Edges: CSS `stroke-dasharray` + animated `stroke-dashoffset`, or an SVG `<animateMotion>` dot along each path.
   - Steps: a CSS class that turns each step on in turn.
   - Make the loop a fixed length (e.g. 2–4 s) so the first and last frame match.
2. **Capture frames.** Playwright opens the page, pauses the animations, and steps the time by a fixed amount (e.g. 40 ms) taking a screenshot each time. Stepping time (instead of a real-time screen recording) gives smooth, repeatable frames.
3. **Build the GIF with ffmpeg** (already installed at `/opt/homebrew/bin/ffmpeg`), using a shared palette so colours stay clean:

   ```bash
   ffmpeg -framerate 25 -i frames/%04d.png \
     -vf "palettegen=max_colors=256:stats_mode=diff" -y palette.png
   ffmpeg -framerate 25 -i frames/%04d.png -i palette.png \
     -lavfi "paletteuse=dither=none:diff_mode=rectangle" -loop 0 -y out.gif
   ```

   `stats_mode=diff` and `diff_mode=rectangle` only re-encode the changed area of each frame — this is what keeps the example at 1.1 MB, since 99 % of each frame stays the same. `gifsicle -O3` can shrink the result further.

Other options: export a GIF straight from After Effects + Lottie, or from browser tools such as Jitter or LottieFiles. They are faster for a single post but not scriptable.

## 6. Recommendation and next steps

Go with **Route A (HTML/SVG + Playwright + ffmpeg)**. It is the only route that is scriptable, matches the ByteByteGo look, and produces both PNG and GIF from the same source.

Next steps:

1. Write one shared `style.css` with the tokens from section 2 (colours, pill, accent bar, box, group, arrow, step circle).
2. Rebuild one example (e.g. *What is an AI agent?*) as an HTML page and compare it side by side with the original.
3. Add a `render.py` (Playwright) that outputs a PNG, and an optional GIF mode that steps through the animation and calls ffmpeg.
4. Choose an icon source and check its licence before publishing anything.
5. Save each finished diagram as a template in this repo — that is the "collection of architecture design templates" AD-1 asks for.
