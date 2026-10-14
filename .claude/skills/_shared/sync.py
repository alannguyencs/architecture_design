#!/usr/bin/env python3
"""Copy the shared ByteByteGo kit into every skill that uses it.

The files in .claude/skills/_shared/ are the one master copy. Each skill keeps its
own copy so it still works when copied on its own.

    python3 .claude/skills/_shared/sync.py          # write the copies
    python3 .claude/skills/_shared/sync.py --check  # exit 1 if any copy is out of date

What it writes into each skill:
    assets/bbg-icons.js   built from bbg-icons.svg (inserts the sprite where the <script> tag sits)
    assets/bbg-parts.css  copy
    assets/bbg-parts.js   copy
    scripts/render.py     copy
and, into some skills only:
    assets/bbg-flow.css   copy (flow, concept, mockup: the flow look's tokens and building blocks)
    scripts/render_gif.py copy (animated, concept, mockup: HTML → looping GIF)
and from one skill to another (the master stays in the first skill):
    concept assets/bbg-concept.js and .css → mockup assets/ (dashboards and map panels)
"""

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILLS = ["diagram-bytebytego-flow", "diagram-bytebytego-animated", "diagram-bytebytego-concept",
          "diagram-bytebytego-mockup"]
# Files only some skills get: {path inside the skill: [skill, ...]}
ONLY = {"assets/bbg-flow.css": ["diagram-bytebytego-flow", "diagram-bytebytego-concept", "diagram-bytebytego-mockup"],
        "scripts/render_gif.py": ["diagram-bytebytego-animated", "diagram-bytebytego-concept", "diagram-bytebytego-mockup"]}
# Copies from one skill to another: {(target skill, path): (source skill, path)}
CROSS = {("diagram-bytebytego-mockup", "assets/bbg-concept.js"): ("diagram-bytebytego-concept", "assets/bbg-concept.js"),
         ("diagram-bytebytego-mockup", "assets/bbg-concept.css"): ("diagram-bytebytego-concept", "assets/bbg-concept.css")}
NOTE = "Generated from .claude/skills/_shared/{src} by _shared/sync.py. Edit the master copy, not this file."


def build() -> dict:
    """Return {path inside a skill: file content}."""
    sprite = (HERE / "bbg-icons.svg").read_text()
    sprite = sprite[sprite.index("<svg xmlns"):]  # drop the leading comment
    icons_js = (
        f"// {NOTE.format(src='bbg-icons.svg')}\n"
        "// Inserts the shared icon sprite and edge markers just before this <script> tag.\n"
        f"document.currentScript.insertAdjacentHTML('beforebegin', {json.dumps(sprite)});\n"
    )
    css = f"/* {NOTE.format(src='bbg-parts.css')} */\n" + (HERE / "bbg-parts.css").read_text()
    js = f"// {NOTE.format(src='bbg-parts.js')}\n" + (HERE / "bbg-parts.js").read_text()
    flow_css = f"/* {NOTE.format(src='bbg-flow.css')} */\n" + (HERE / "bbg-flow.css").read_text()
    def script(name: str) -> str:
        shebang, rest = (HERE / name).read_text().split("\n", 1)
        return f"{shebang}\n# {NOTE.format(src=name)}\n{rest}"
    return {
        "assets/bbg-icons.js": icons_js,
        "assets/bbg-parts.css": css,
        "assets/bbg-parts.js": js,
        "scripts/render.py": script("render.py"),
        "scripts/render_gif.py": script("render_gif.py"),
        "assets/bbg-flow.css": flow_css,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="only report copies that are out of date")
    args = ap.parse_args()

    files = build()
    stale = []
    for skill in SKILLS:
        for rel, content in files.items():
            if rel in ONLY and skill not in ONLY[rel]:
                continue
            dest = HERE.parent / skill / rel
            if dest.exists() and dest.read_text() == content:
                continue
            stale.append(dest)
            if not args.check:
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(content)

    for (skill, rel), (src_skill, src_rel) in CROSS.items():
        src = HERE.parent / src_skill / src_rel
        note = f"Copied from .claude/skills/{src_skill}/{src_rel} by _shared/sync.py. Edit the master copy, not this file."
        content = (f"/* {note} */\n" if rel.endswith(".css") else f"// {note}\n") + src.read_text()
        dest = HERE.parent / skill / rel
        if dest.exists() and dest.read_text() == content:
            continue
        stale.append(dest)
        if not args.check:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content)

    verb = "out of date" if args.check else "updated"
    for p in stale:
        print(f"{verb}  {p.relative_to(HERE.parent)}")
    if not stale:
        print("all copies up to date")
    sys.exit(1 if args.check and stale else 0)


if __name__ == "__main__":
    main()
