#!/usr/bin/env python3
"""Recount which System Design Interview figures the diagram skills can draw now.

Reads 261014_bytebytego_figures.csv, the components the concept skill defines (every
BBG.define('name', …) in its bbg-concept.js) and the ones the mockup skill defines (the
functions exported on BBM in its bbg-mockup.js), then:
  - writes a `drawable_now` column:
        flow            drawable with the flow / animated kit as it is
        flow + gap      drawable with the flow kit, but needs something listed in not_in_kit
        flow + logo     drawable with the flow kit; brand logos become look-alikes or labelled boxes
        concept: <name> drawable with that concept component
        mockup: <name>  drawable with that mockup component (product-screen wireframes)
        no              not drawable (out of scope, or its component does not exist yet)
  - prints the totals, by group and by chapter.

Re-run it after any skill update (from the repo root):
    python3 docs/reports/261014_coverage.py          # print only
    python3 docs/reports/261014_coverage.py --write  # also update the CSV column
"""

import collections
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSV = Path(__file__).with_name("261014_bytebytego_figures.csv")
CONCEPT_JS = ROOT / ".claude/skills/diagram-bytebytego-concept/assets/bbg-concept.js"
MOCKUP_JS = ROOT / ".claude/skills/diagram-bytebytego-mockup/assets/bbg-mockup.js"

# The building block named in the CSV → the concept component that draws it.
BLOCK_TO_COMPONENT = {
    "table": "table", "cells": "cells", "sequence": "sequence", "timeline": "timeline",
    "ring": "ring", "tree": "tree", "mind map": "tree", "spatial": "spatial", "code": "code",
    "venn/funnel": "venn",
}


def main() -> None:
    components = set(re.findall(r"BBG\.define\('([a-z]+)'", CONCEPT_JS.read_text()))
    # Only the parts that draw a screen element count as mockup components (not helpers like h / css).
    MOCKUP_PARTS = {"frame", "search", "list", "form", "card", "kvpanel", "filetree", "panel", "sidebar", "tabs"}
    mockups = (set(re.findall(r"^  function ([a-z]+)\(", MOCKUP_JS.read_text(), re.M)) & MOCKUP_PARTS) if MOCKUP_JS.exists() else set()
    rows = list(csv.DictReader(CSV.open()))
    fields = list(rows[0].keys())
    if "drawable_now" not in fields:
        fields.append("drawable_now")

    for r in rows:
        if r["status"] == "drawable":
            r["drawable_now"] = "flow + gap" if r.get("not_in_kit") else "flow + logo" if r.get("brand_logos") else "flow"
        elif r["status"] == "cannot draw":
            comp = BLOCK_TO_COMPONENT.get(r["missing_block"])
            r["drawable_now"] = f"concept: {comp}" if comp in components else "no"
        elif r["status"] == "mockup":
            r["drawable_now"] = f"mockup: {r['missing_block']}" if r["missing_block"] in mockups else "no"
        else:
            r["drawable_now"] = "no"

    now = collections.Counter(r["drawable_now"] for r in rows)
    drawable = sum(v for k, v in now.items() if k != "no")
    print(f"concept components defined: {', '.join(sorted(components))}")
    print(f"mockup components defined: {', '.join(sorted(mockups))}")
    print(f"drawable now: {drawable} of {len(rows)} ({100 * drawable / len(rows):.0f} %)")
    for k, v in sorted(now.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"  {v:4}  {k}")
    print("by chapter (drawable now / total):")
    by = collections.defaultdict(lambda: [0, 0])
    for r in rows:
        by[r["chapter"]][1] += 1
        by[r["chapter"]][0] += r["drawable_now"] != "no"
    for ch, (d, n) in sorted(by.items()):
        print(f"  {d:3} / {n:3}  {ch}")

    if "--write" in sys.argv:
        with CSV.open("w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=fields)
            w.writeheader()
            w.writerows(rows)
        print("wrote", CSV)


if __name__ == "__main__":
    main()
