# tools/

One-time migration scripts that converted this site from self-unpacking
bundles into plain static HTML, plus one image utility you may want again.

## Background

`index.html`, `thesis.html`, `market-view.html` and `press-release.html` used
to be single-file bundles: the real markup lived JSON-encoded inside a
`<script type="__bundler/template">` block, every asset was base64 in a
`__bundler/manifest` block, and a loader script base64-decoded everything and
called `document.documentElement.replaceWith(...)` on load. That swap was the
visible "big logo flash" on every page view. The pages also rendered through a
small React-based framework (`x-dc` / `DCLogic`) using `{{ }}` bindings,
`sc-for` / `sc-if` loops and `<image-slot>` elements.

Those pages are now ordinary static HTML. There is no bundler, no React and no
framework left — just markup, `css/`, `js/` and real asset files.

**You do not need to run any of this again** unless you re-export the pages
from the original builder in that bundled format.

## The migration pipeline (in order)

| Script | What it did |
| --- | --- |
| `extract_assets.py` | Decoded each manifest to disk: `images/BDC-logo.png` and 19 deduped woff2 files into `fonts/`. Wrote `asset_map.json`. |
| `make_capture.py` | Wrote throwaway `_capture_*.html` copies with `componentDidMount` short-circuited, so the framework would render the template without animations mutating inline styles. |
| `capture_server.py` | Static server that also accepts `POST /save?name=…`, so the browser could write snapshots straight to `snapshots/`. |
| `grab.js` | Ran in each capture page: replaced `<image-slot>` with plain `<img>`, repointed `blob:` URLs at real files, stripped framework attributes, collected the generated `.scpN:hover` rules, and POSTed the result. |
| `build_static.py` | Assembled final pages: real `<title>`/meta/OG tags, CSS with font URLs repointed at `fonts/`, snapshot markup, one vanilla script. |
| `split_css.py` | Lifted the byte-identical font and mobile CSS out of all four pages into `css/fonts.css` and `css/mobile.css`. |

Intermediates (`snapshots/`, `_capture_*.html`) are gitignored.

### Why snapshot in a browser rather than re-implement the template language?

The framework compiled each `style-hover="…"` attribute into a generated
`.scpN:hover` CSS rule injected via CSSOM — invisible in the page source. A
hand-written renderer would have silently dropped every card hover effect.
Letting the real framework render once and capturing the result kept those.

## Still useful

`compress_images.ps1` — recompresses `images/sector-*.jpg` to 1600px wide,
quality 82, moving originals to `images/originals/` (gitignored). Re-run it if
you replace any sector photo with a full-resolution file:

```powershell
powershell -ExecutionPolicy Bypass -File tools/compress_images.ps1
```

## Editing the site now

- Page content — edit the HTML directly.
- Fonts — `css/fonts.css`, files in `fonts/`.
- Phone/tablet layout — `css/mobile.css` (applies under 900px).
- Animations — `js/index.js` (homepage), `js/article.js` (the three article pages).
