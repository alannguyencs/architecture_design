#!/usr/bin/env python3
"""Render a ByteByteGo-style HTML diagram to PNG/WebP, optionally next to a reference image.

Usage:
    python3 render.py diagram.html out.png [--scale 2] [--webp] [--compare original.webp]
                      [--variant NAME ...]

The page must contain one `.canvas` element; its size sets the output size
(width x scale, height x scale).

--variant renders one picture per name, as out-NAME.png, by opening the page
at #v=NAME (see bbg-parts.js: data-hl / data-only / data-not).
"""

import argparse
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright


def render(html: Path, outs: dict, scale: float) -> None:
    """outs maps a variant name ("" = none) to an output path."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1600, "height": 1600}, device_scale_factor=scale)
        for variant, out in outs.items():
            url = html.resolve().as_uri() + (f"#v={variant}" if variant else "")
            page.goto("about:blank")
            page.goto(url)
            page.wait_for_load_state("networkidle")
            page.evaluate("document.fonts.ready")
            page.locator(".canvas").screenshot(path=str(out))
        browser.close()


def side_by_side(original: Path, rendered: Path, out: Path) -> Path:
    a = Image.open(original).convert("RGB")
    b = Image.open(rendered).convert("RGB").resize(a.size, Image.LANCZOS)
    gap = 20
    sheet = Image.new("RGB", (a.width * 2 + gap, a.height), "white")
    sheet.paste(a, (0, 0))
    sheet.paste(b, (a.width + gap, 0))
    sheet.save(out)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("html", type=Path)
    ap.add_argument("out", type=Path, help="output .png")
    ap.add_argument("--scale", type=float, default=2.0, help="device scale factor (default 2)")
    ap.add_argument("--webp", action="store_true", help="also write a .webp next to the PNG")
    ap.add_argument("--compare", type=Path, help="reference image for a side-by-side sheet")
    ap.add_argument("--variant", action="append", default=[], help="render this variant (repeatable)")
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.variant:
        outs = {v: args.out.with_name(f"{args.out.stem}-{v}{args.out.suffix}") for v in args.variant}
    else:
        outs = {"": args.out}
    render(args.html, outs, args.scale)

    for png in outs.values():
        print(f"png     {png}  {Image.open(png).size}")
        if args.webp:
            webp = png.with_suffix(".webp")
            Image.open(png).save(webp, "WEBP", quality=90)
            print(f"webp    {webp}")
        if args.compare:
            sheet = side_by_side(args.compare, png, png.with_name(png.stem + "_compare.png"))
            print(f"compare {sheet}")


if __name__ == "__main__":
    main()
