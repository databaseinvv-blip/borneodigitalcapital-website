"""Lift the shared CSS out of the four static pages into linked stylesheets.

The @font-face block and the mobile layer are byte-identical on every page, so
they become css/fonts.css and css/mobile.css (downloaded once, then cached).
What stays inline is only the small per-page remainder: the base element styles,
the keyframes, and that page's generated .scpN:hover rules.

Idempotent - re-running on already-split pages is a no-op.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGES = ["index.html", "thesis.html", "market-view.html", "press-release.html"]

STYLE_RE = re.compile(r"<style>\n(.*?)\n</style>", re.S)
FONTS_RE = re.compile(r"^/\* cyrillic-ext \*/.*?(?=\n\*\{box-sizing)", re.S | re.M)
MOBILE_RE = re.compile(r"/\*BDC-MOBILE-START\*/.*?/\*BDC-MOBILE-END\*/", re.S)

LINKS = '<link rel="stylesheet" href="css/fonts.css">\n<link rel="stylesheet" href="css/mobile.css">\n<style>\n'


def main():
    os.makedirs(os.path.join(ROOT, "css"), exist_ok=True)
    fonts = mobile = None

    for page in PAGES:
        path = os.path.join(ROOT, page)
        src = open(path, encoding="utf-8").read()
        if 'href="css/fonts.css"' in src:
            print("%-20s already split" % page)
            continue

        m = STYLE_RE.search(src)
        if not m:
            raise SystemExit("no <style> block in " + page)
        css = m.group(1)

        fm = FONTS_RE.search(css)
        mm = MOBILE_RE.search(css)
        if not fm or not mm:
            raise SystemExit("could not locate shared blocks in " + page)

        if fonts is None:
            fonts, mobile = fm.group(0), mm.group(0)
        elif fonts != fm.group(0) or mobile != mm.group(0):
            raise SystemExit("shared CSS differs in " + page)

        rest = css.replace(fm.group(0), "").replace(mm.group(0), "")
        rest = re.sub(r"\n{3,}", "\n\n", rest).strip()

        out = src[: m.start()] + LINKS + rest + "\n</style>" + src[m.end():]
        open(path, "w", encoding="utf-8", newline="\n").write(out)
        print("%-20s inline CSS %d -> %d bytes" % (page, len(css), len(rest)))

    if fonts:
        open(os.path.join(ROOT, "css", "fonts.css"), "w",
             encoding="utf-8", newline="\n").write(fonts.strip() + "\n")
        open(os.path.join(ROOT, "css", "mobile.css"), "w",
             encoding="utf-8", newline="\n").write(mobile.strip() + "\n")
        print("\nwrote css/fonts.css (%d) and css/mobile.css (%d)" % (len(fonts), len(mobile)))


if __name__ == "__main__":
    main()
