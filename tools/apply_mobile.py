"""Inject a phone/tablet layer into the bundled BDC pages.

Each page ships as a single-file bundle whose real markup lives in a JSON string
inside <script type="__bundler/template">. We decode it, splice in a mobile
stylesheet (+ hamburger nav on index), and re-encode. Idempotent: re-running
replaces the previously injected block.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGES = ["index.html", "thesis.html", "market-view.html", "press-release.html"]

TPL_RE = re.compile(r'(<script type="__bundler/template">\n)(.*?)(\n  </script>)', re.S)
BLOCK_RE = re.compile(r"<style>/\*BDC-MOBILE-START\*/.*?/\*BDC-MOBILE-END\*/\n?</style>\n?", re.S)
NAVBTN_RE = re.compile(r'\n?  <button id="bdgNavBtn".*?</button>', re.S)
NAVJS_RE = re.compile(r"\n?    /\*BDC-MOBILE-NAV\*/.*?/\*BDC-MOBILE-NAV-END\*/\n", re.S)

NAV_BUTTON = (
    '\n  <button id="bdgNavBtn" type="button" aria-label="Menu" aria-expanded="false" '
    'aria-controls="bdgNav"><span></span><span></span><span></span></button>'
)

NAV_JS = """
    /*BDC-MOBILE-NAV*/
    (function(){
      var btn = document.getElementById("bdgNavBtn");
      var header = btn && btn.closest("header");
      var nav = header && header.querySelector("nav");
      if (!btn || !nav) return;
      nav.id = nav.id || "bdgNav";
      btn.setAttribute("aria-controls", nav.id);
      var close = function(){ nav.classList.remove("bdg-open"); btn.setAttribute("aria-expanded","false"); };
      btn.addEventListener("click", function(e){
        e.preventDefault();
        var open = nav.classList.toggle("bdg-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      nav.addEventListener("click", function(e){ if (e.target.closest("a")) close(); });
      document.addEventListener("keydown", function(e){ if (e.key === "Escape") close(); });
      window.addEventListener("resize", function(){ if (window.innerWidth > 900) close(); });
    })();
    /*BDC-MOBILE-NAV-END*/
"""


def patch_template(tpl, css, is_index):
    # drop any previous injection so this stays idempotent
    tpl = BLOCK_RE.sub("", tpl)
    tpl = NAVBTN_RE.sub("", tpl)
    tpl = NAVJS_RE.sub("", tpl)

    style_block = "<style>" + css.strip() + "\n</style>\n"
    if "</helmet>" not in tpl:
        raise SystemExit("no </helmet> anchor")
    tpl = tpl.replace("</helmet>", style_block + "</helmet>", 1)

    if is_index:
        # hamburger button, just before the desktop <nav>
        marker = '\n  <nav style="display:flex;align-items:center;gap:26px;">'
        if marker not in tpl:
            raise SystemExit("nav anchor not found")
        tpl = tpl.replace(marker, NAV_BUTTON + marker, 1)

        # phones take the same flattened path as prefers-reduced-motion:
        # no pinned scroll-scrub, nothing left hidden at opacity 0
        patched = "    if (reduce || window.innerWidth <= 900) {"
        tpl = tpl.replace(patched, "    if (reduce) {", 1)  # undo a prior run
        if "    if (reduce) {" not in tpl:
            raise SystemExit("reduce branch not found")
        tpl = tpl.replace("    if (reduce) {", patched, 1)

        # a <script> spliced in via the bundler's innerHTML swap never executes,
        # so the nav toggle has to ride along inside componentDidMount
        hook = "  componentDidMount() {\n"
        if hook not in tpl:
            raise SystemExit("componentDidMount anchor not found")
        tpl = tpl.replace(hook, hook + NAV_JS, 1)
    return tpl


def main():
    css = open(os.path.join(HERE, "mobile.css"), encoding="utf-8").read()
    for name in PAGES:
        path = os.path.join(ROOT, name)
        src = open(path, encoding="utf-8").read()
        m = TPL_RE.search(src)
        if not m:
            raise SystemExit("no template block in " + name)
        tpl = json.loads(m.group(2))
        new_tpl = patch_template(tpl, css, name == "index.html")
        # the bundler escapes the slash so the JSON payload can't close its own
        # <script> tag; chr(92) keeps that backslash literal, not a unicode escape
        encoded = json.dumps(new_tpl).replace("</script", "<" + chr(92) + "u002Fscript")
        assert "</script" not in encoded
        assert json.loads(encoded) == new_tpl
        out = src[: m.start(2)] + encoded + src[m.end(2):]
        open(path, "w", encoding="utf-8", newline="").write(out)
        print("patched", name, len(tpl), "->", len(new_tpl))


if __name__ == "__main__":
    main()
