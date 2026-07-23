"""Static file server that also accepts POSTs, used only during the un-bundle.

Serving the project and receiving the snapshot on the same origin keeps the
browser's fetch() same-origin (no CORS dance) and lets the captured HTML go
straight to disk instead of being funnelled through the console.

  POST /save?name=<page>  ->  tools/snapshots/<page>.html
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "snapshots")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/save":
            self.send_error(404)
            return
        name = parse_qs(parsed.query).get("name", [None])[0]
        # never let a crafted name escape the snapshots directory
        if not name or not name.replace("-", "").replace("_", "").isalnum():
            self.send_error(400, "bad name")
            return
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, name + ".html"), "wb") as fh:
            fh.write(body)
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"ok %d" % len(body))

    def log_message(self, fmt, *args):
        pass  # keep the background task output quiet


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8788
    print("serving %s on %d" % (ROOT, port))
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
