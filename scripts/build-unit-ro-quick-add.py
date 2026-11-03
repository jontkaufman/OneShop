#!/usr/bin/env python3
"""Build reviewable offline Quick Add / Create RO prototype with shared styles."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
source = (root/"prototypes/unit-ro-quick-add.source.html").read_text()
styles = '<link rel="stylesheet" href="../styles/tokens.css"><link rel="stylesheet" href="../styles/oneshop.css"><link rel="stylesheet" href="../styles/unit-ro-quick-add.css">'
script = '<script src="./unit-ro-quick-add.js"></script>'
assert source.count(styles) == 1, "Shared stylesheet links missing"
assert source.count(script) == 1, "Prototype script source missing"
css = "\n".join((root/path).read_text() for path in (
    "styles/tokens.css","styles/oneshop.css","styles/unit-ro-quick-add.css","styles/universal-search.css"
))
js = (root/"prototypes/unit-ro-quick-add.js").read_text()
domain = (root/"src/domain/universal-search.mjs").read_text().replace("export const ", "const ").replace("export function ", "function ")
controller = (root/"prototypes/universal-search-controller.js").read_text()
assert js.count("/*__ONE_SEARCH_DOMAIN__*/") == 1
assert js.count("/*__ONE_SEARCH_CONTROLLER__*/") == 1
js = js.replace("/*__ONE_SEARCH_DOMAIN__*/", domain).replace("/*__ONE_SEARCH_CONTROLLER__*/", controller)
built = source.replace(styles,"<style>" + css + "</style>")
built = built.replace(script,"<script>\n" + js + "</script>")
out = root/"prototypes/unit-ro-quick-add.html"
out.write_text(built)
print("Built",out,"("+str(len(built))+" characters)")
