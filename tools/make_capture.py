"""Build throwaway _capture_*.html copies used to snapshot the rendered DOM.

The framework resolves the template DSL (sc-for / sc-if / {{ }} / image-slot)
far more reliably than re-implementing it would, so we let it render once. The
only change is an early return in componentDidMount, which stops the scroll and
cursor animations from mutating inline styles before we capture. These files
live in the project root (so relative image paths resolve) and are deleted by
tools/unbundle.py once the snapshots are taken.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGES = ["index.html", "thesis.html", "market-view.html", "press-release.html"]

TPL_RE = re.compile(r'(<script type="__bundler/template">\n)(.*?)(\n  </script>)', re.S)
HOOK = "  componentDidMount() {\n"


def main():
    for page in PAGES:
        src = open(os.path.join(ROOT, page), encoding="utf-8").read()
        m = TPL_RE.search(src)
        tpl = json.loads(m.group(2))
        if HOOK not in tpl:
            raise SystemExit("no componentDidMount in " + page)
        # mark the snapshot so a stray capture file can never be mistaken for
        # the real page, and freeze the animations
        tpl = tpl.replace(HOOK, HOOK + '    window.__CAPTURE__ = true; return;\n', 1)
        enc = json.dumps(tpl).replace("</script", "<" + chr(92) + "u002Fscript")
        out = src[: m.start(2)] + enc + src[m.end(2):]
        dest = os.path.join(ROOT, "_capture_" + page)
        open(dest, "w", encoding="utf-8", newline="").write(out)
        print("wrote _capture_" + page)


if __name__ == "__main__":
    main()
