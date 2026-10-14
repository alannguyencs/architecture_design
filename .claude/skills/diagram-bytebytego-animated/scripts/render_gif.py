#!/usr/bin/env python3
# Generated from .claude/skills/_shared/render_gif.py by _shared/sync.py. Edit the master copy, not this file.
"""Render an animated HTML diagram to a looping GIF.

Every CSS/Web animation on the page is paused, then moved to time t with
`animation.currentTime = t` for each frame, so frames are exact and repeatable
(no screen recording). Frames are joined by ffmpeg with one shared palette;
only the changed rectangle of each frame is re-encoded, which keeps the file small.

Usage:
    python3 render_gif.py diagram.html out.gif [--loop-ms 2250] [--frame-ms 30] [--scale 1]
                          [--compare reference.gif] [--keep-frames] [--variant NAME]
"""

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

SEEK_JS = """t => {
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
}"""


def capture(html: Path, frames_dir: Path, loop_ms: int, frame_ms: int, scale: float, variant: str = "") -> int:
    n = round(loop_ms / frame_ms)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1600, "height": 1600}, device_scale_factor=scale)
        page.goto(html.resolve().as_uri() + (f"#v={variant}" if variant else ""))
        page.wait_for_load_state("networkidle")
        page.evaluate("document.fonts.ready")
        canvas = page.locator(".canvas")
        for i in range(n):
            page.evaluate(SEEK_JS, i * frame_ms)
            canvas.screenshot(path=str(frames_dir / f"{i:04d}.png"), animations="allow")
        browser.close()
    return n


def encode(frames_dir: Path, out: Path, frame_ms: int) -> None:
    fps = f"1000/{frame_ms}"
    palette = frames_dir / "palette.png"
    common = ["ffmpeg", "-v", "error", "-y", "-framerate", fps, "-i", str(frames_dir / "%04d.png")]
    subprocess.run(common + ["-vf", "palettegen=max_colors=256:stats_mode=diff", str(palette)], check=True)
    subprocess.run(common + ["-i", str(palette), "-lavfi",
                             "paletteuse=dither=none:diff_mode=rectangle", "-loop", "0", str(out)], check=True)


def compare_sheet(reference: Path, frames_dir: Path, n: int, out: Path) -> None:
    """Rows: reference vs render at 0, 1/4, 1/2, 3/4 of the loop (half size)."""
    ref = Image.open(reference)
    picks = [0, n // 4, n // 2, 3 * n // 4]
    cells = []
    for k in picks:
        ref.seek(min(round(k * ref.n_frames / n), ref.n_frames - 1))
        a = ref.convert("RGB")
        b = Image.open(frames_dir / f"{k:04d}.png").convert("RGB").resize(a.size)
        cells.append((a, b))
    w, h = cells[0][0].width // 2, cells[0][0].height // 2
    sheet = Image.new("RGB", (w * 2 + 10, (h + 10) * len(cells)), "white")
    for r, (a, b) in enumerate(cells):
        sheet.paste(a.resize((w, h)), (0, r * (h + 10)))
        sheet.paste(b.resize((w, h)), (w + 10, r * (h + 10)))
    sheet.save(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("html", type=Path)
    ap.add_argument("out", type=Path, help="output .gif")
    ap.add_argument("--loop-ms", type=int, default=2250, help="length of one loop; must match --loop in the CSS")
    ap.add_argument("--frame-ms", type=int, default=30, help="time per frame (30 ms ≈ 33 fps)")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--compare", type=Path, help="reference GIF for a 4-moment side-by-side sheet")
    ap.add_argument("--keep-frames", action="store_true", help="keep PNG frames next to the GIF")
    ap.add_argument("--variant", default="", help="open the page at #v=NAME (see bbg-parts.js)")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg not found (brew install ffmpeg)")
    args.out.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        frames = Path(tmp)
        n = capture(args.html, frames, args.loop_ms, args.frame_ms, args.scale, args.variant)
        encode(frames, args.out, args.frame_ms)
        size_kb = args.out.stat().st_size / 1024
        print(f"gif     {args.out}  {Image.open(args.out).size}  {n} frames × {args.frame_ms} ms  {size_kb:.0f} KB")
        shutil.copy(frames / "0000.png", args.out.with_name(args.out.stem + "_frame0.png"))
        if args.compare:
            sheet = args.out.with_name(args.out.stem + "_compare.png")
            compare_sheet(args.compare, frames, n, sheet)
            print(f"compare {sheet}")
        if args.keep_frames:
            dest = args.out.with_name(args.out.stem + "_frames")
            shutil.copytree(frames, dest, dirs_exist_ok=True)
            print(f"frames  {dest}")


if __name__ == "__main__":
    main()
