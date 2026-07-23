"""Assemble the final static pages from the snapshots + extracted assets.

Reads:
  tools/snapshots/<page>.html   rendered markup captured via tools/grab.js
  tools/asset_map.json          uuid -> real asset path (tools/extract_assets.py)
  <page>.html                   the bundle, only for its <style> blocks

Writes plain <page>.html with no bundler, no React and no framework: the CSS
inlined in <head>, fonts pointed at fonts/, and one vanilla script per page.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SNAP = os.path.join(HERE, "snapshots")

TPL_RE = re.compile(r'<script type="__bundler/template">\n?(.*?)\n?  </script>', re.S)
STYLE_RE = re.compile(r"<style>(.*?)</style>", re.S)

SITE = "https://borneodigitalcapital.com"

# title, meta description, and which vanilla script the page needs
PAGES = {
    "index.html": (
        "Borneo Digital Capital — Sarawak Digital Infrastructure Fund",
        "A RM100 million Sarawak-focused digital-infrastructure fund targeting "
        "capital appreciation and steady income across data centres, connectivity "
        "and the future economy of Borneo.",
        "js/index.js",
    ),
    "thesis.html": (
        "From Watt to Byte — Borneo Digital Capital",
        "Why Sarawak's hydropower and stable governance position the state for the "
        "next generation of green data centres.",
        "js/article.js",
    ),
    "market-view.html": (
        "Reading SDS 2030 — Borneo Digital Capital",
        "Translating the Sarawak Development Strategy 2030 targets into investable "
        "themes for digital infrastructure investors.",
        "js/article.js",
    ),
    "press-release.html": (
        "BDC launches RM100M Sarawak digital-infrastructure fund — Borneo Digital Capital",
        "Borneo Digital Capital is incorporated to deploy capital into Sarawak's "
        "data-centre, connectivity and future-economy sectors.",
        "js/article.js",
    ),
}

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="author" content="Borneo Digital Capital">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{site}/{page}">
<link rel="icon" type="image/png" href="images/BDC-logo.png">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{site}/{page}">
<meta property="og:image" content="{site}/images/BDC-logo.png">
<meta name="twitter:card" content="summary_large_image">
<style>
{css}
</style>
</head>
<body>
"""

FOOT = """
<script src="{script}" defer></script>
</body>
</html>
"""


def page_css(page, asset_map):
    """Pull the <style> blocks out of the bundle and repoint font URLs."""
    src = open(os.path.join(ROOT, page), encoding="utf-8").read()
    tpl = json.loads(TPL_RE.search(src).group(1))
    blocks = STYLE_RE.findall(tpl)
    if not blocks:
        raise SystemExit("no <style> found in " + page)

    css = "\n".join(b.strip() for b in blocks)
    mapping = asset_map[page]

    def sub(m):
        uuid = m.group(1)
        path = mapping.get(uuid)
        if path is None:
            raise SystemExit("unmapped asset %s in %s" % (uuid, page))
        return 'url("%s")' % path

    css, n = re.subn(r'url\("([0-9a-f-]{36})"\)', sub, css)
    if n == 0:
        raise SystemExit("no font urls rewritten in " + page)
    # the framework hid its own template element; that element no longer exists
    css = css.replace("x-dc{display:none!important}", "")
    return css, n


def main():
    asset_map = json.load(open(os.path.join(HERE, "asset_map.json")))
    for page, (title, desc, script) in PAGES.items():
        snap = json.load(open(os.path.join(SNAP, page), encoding="utf-8"))
        css, nfonts = page_css(page, asset_map)

        if snap["hover"]:
            css += "\n/* hover states (were compiled from style-hover) */\n" + snap["hover"]

        html = (
            HEAD.format(title=title, desc=desc, css=css, site=SITE, page=page)
            + snap["html"]
            + FOOT.format(script=script)
        )

        out = os.path.join(ROOT, page)
        open(out, "w", encoding="utf-8", newline="\n").write(html)
        print("%-20s %6.1f KB  (%d font urls, %d hover rules)"
              % (page, len(html.encode()) / 1024, nfonts, len(snap["hover"].splitlines())))


if __name__ == "__main__":
    main()
