#!/usr/bin/env python3
"""Compile self-contained OneShop demo from the shared application CSS files.
Run: python scripts/build-prototype.py
Edit styles/tokens.css, styles/oneshop.css or the prototype source, never the compiled HTML.
"""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "prototypes/service-writer-intake.source.html"
source = path.read_text()
styles = '<link rel="stylesheet" href="../styles/tokens.css"><link rel="stylesheet" href="../styles/oneshop.css">'
assert source.count(styles) == 1, "Missing shared CSS links"
css = (ROOT/"styles/tokens.css").read_text() + "\n" + (ROOT/"styles/oneshop.css").read_text()
target = ROOT/"prototypes/service-writer-intake.html"
target.write_text(source.replace(styles, "<style>\n" + css + "\n</style>"))
print(f"Built {target}")
