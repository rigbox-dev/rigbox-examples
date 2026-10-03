"""A local HTTP demo with explicit routes and no directory/file serving."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIC = {
    "/": ("text/html; charset=utf-8", (ROOT / "index.html").read_bytes()),
    "/tokens.css": ("text/css; charset=utf-8", (ROOT / "tokens.css").read_bytes()),
    "/healthz": ("application/json", b'{"status":"ok","service":"local-tunnel"}'),
}
MAX_BODY = 4096


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        route = self.path.split("?", 1)[0]
        if route not in STATIC:
            self.reply(404, "application/json", b'{"error":"not_found"}')
            return
        content_type, body = STATIC[route]
        self.reply(200, content_type, body)

    def do_POST(self):
        if self.path != "/echo":
            self.reply(404, "application/json", b'{"error":"not_found"}')
            return
        lengths = self.headers.get_all("Content-Length", [])
        if len(lengths) != 1 or self.headers.get("Transfer-Encoding"):
            self.reply(400, "application/json", b'{"error":"invalid_length"}')
            return
        try:
            length = int(lengths[0])
        except ValueError:
            self.reply(400, "application/json", b'{"error":"invalid_length"}')
            return
        if length < 0 or length > MAX_BODY:
            self.reply(413, "application/json", b'{"error":"body_too_large"}')
            return
        self.connection.settimeout(3)
        try:
            body = self.rfile.read(length)
        except TimeoutError:
            self.reply(408, "application/json", b'{"error":"request_timeout"}')
            return
        if len(body) != length:
            self.reply(400, "application/json", b'{"error":"incomplete_body"}')
            return
        payload = json.dumps({"received": body.decode("utf-8", errors="replace")}).encode()
        self.reply(200, "application/json", payload)

    def reply(self, status, content_type, body):
        self.send_response_only(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=3000)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Local demo: http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
