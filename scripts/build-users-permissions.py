#!/usr/bin/env python3
"""Assemble the standalone OneShop Users & Permissions review from shared styling."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/"prototypes/users-permissions.source.html").read_text()
styles='<link rel="stylesheet" href="../styles/tokens.css"><link rel="stylesheet" href="../styles/oneshop.css"><link rel="stylesheet" href="../styles/users-permissions.css">'
script='<script src="./users-permissions.js"></script>'
assert source.count(styles)==1 and source.count(script)==1
css="\n".join((ROOT/p).read_text() for p in ("styles/tokens.css","styles/oneshop.css","styles/users-permissions.css"))
js=(ROOT/"prototypes/users-permissions.js").read_text()
domain=(ROOT/"src/domain/permissions.mjs").read_text().replace("export const ","const ").replace("export function ","function ")
assert js.count("/*__PERMISSIONS_DOMAIN__*/")==1
js=js.replace("/*__PERMISSIONS_DOMAIN__*/",domain)
result=source.replace(styles,"<style>\n"+css+"\n</style>").replace(script,"<script>\n"+js+"\n</script>")
out=ROOT/"prototypes/users-permissions.html"
out.write_text(result)
print("Built",out,"("+str(len(result))+" bytes)")
