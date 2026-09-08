"""Local server for browser play. Sets COOP/COEP so EmulatorJS WASM threads work."""
import functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
class H(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".nds": "application/octet-stream",
        ".wasm": "application/wasm",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".7z": "application/x-7z-compressed",
        ".zip": "application/zip",
    }
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, *a):
        pass

if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(H, directory="."))
    print(f"Serving on http://localhost:{PORT}/  (Ctrl+C to stop)")
    print("Open http://localhost:8000/ in Chrome/Edge and press Start.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
