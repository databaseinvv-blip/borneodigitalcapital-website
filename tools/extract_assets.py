"""Decode the bundled __bundler/manifest of each page into real files on disk.

Every page carries its own base64 copy of the same fonts under different UUIDs,
so fonts are deduped by content hash into a single shared fonts/ folder. Writes
tools/asset_map.json: {page: {uuid: relative_path}} for the HTML rewrite step.
"""
import base64
import hashlib
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGES = ["index.html", "thesis.html", "market-view.html", "press-release.html"]

MANIFEST_RE = re.compile(
    r'<script type="__bundler/manifest">\n?(.*?)\n?  </script>', re.S
)

# Font files are identified by hash; these names come from the @font-face
# blocks so the generated CSS stays readable.
EXT = {"font/woff2": ".woff2", "image/png": ".png", "image/jpeg": ".jpg"}


def main():
    fonts_dir = os.path.join(ROOT, "fonts")
    os.makedirs(fonts_dir, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "images"), exist_ok=True)

    by_hash = {}          # content hash -> fonts/<name>.woff2
    asset_map = {}        # page -> {uuid: path}
    written = 0

    for page in PAGES:
        src = open(os.path.join(ROOT, page), encoding="utf-8").read()
        manifest = json.loads(MANIFEST_RE.search(src).group(1).strip())
        page_map = {}

        for key, entry in manifest.items():
            raw = base64.b64decode(entry["data"])
            mime = entry.get("mime", "")

            if key.startswith("images/"):
                # real path already (images/BDC-logo.png) - write it once
                out = os.path.join(ROOT, key)
                if not os.path.exists(out):
                    open(out, "wb").write(raw)
                    written += 1
                page_map[key] = key
                continue

            if mime == "font/woff2":
                digest = hashlib.sha1(raw).hexdigest()[:10]
                rel = by_hash.get(digest)
                if rel is None:
                    rel = "fonts/f-%s.woff2" % digest
                    open(os.path.join(ROOT, rel), "wb").write(raw)
                    by_hash[digest] = rel
                    written += 1
                page_map[key] = rel
                continue

            # text/javascript entries are React + the framework runtime; the
            # static build drops them entirely, so they are deliberately
            # not written to disk.

        asset_map[page] = page_map
        print("%-20s %2d fonts mapped" % (page, sum(1 for v in page_map.values()
                                                    if v.startswith("fonts/"))))

    json.dump(asset_map, open(os.path.join(HERE, "asset_map.json"), "w"), indent=1)
    print("\nwrote %d new files; %d unique fonts" % (written, len(by_hash)))


if __name__ == "__main__":
    main()
