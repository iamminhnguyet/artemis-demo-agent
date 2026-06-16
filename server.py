import json
import mimetypes
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8080"))


class ArtemisHandler(SimpleHTTPRequestHandler):
    server_version = "ArtemisStarterGalaxy/1.0"

    def translate_path(self, path):
        clean_path = unquote(path.split("?", 1)[0].split("#", 1)[0])
        if clean_path in ("", "/"):
            clean_path = "/index.html"

        requested = (ROOT / clean_path.lstrip("/")).resolve()
        if ROOT not in requested.parents and requested != ROOT:
            return str(ROOT / "index.html")
        return str(requested)

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/health":
            self._send_json({"status": "ok", "service": "artemis-starter-galaxy"})
            return

        target = Path(self.translate_path(self.path))
        if not target.exists() or target.is_dir():
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        route = self.path.split("?", 1)[0]
        if route != "/invocations":
            self.send_error(404, "Not found")
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json({"status": "error", "error": "Invalid JSON"}, status=400)
            return

        user_id = self.headers.get("X-GreenNode-AgentBase-User-Id", "starter")
        message = str(payload.get("message", "")).strip()
        response = (
            f"Hey {user_id}, minh la Artemis - radar cua vu tru do dac. "
            "Ban muon tim do that lac hay tra lai do bi mat?"
        )
        if message:
            response = (
                "Minh da ghi nhan tin hieu cua ban. "
                "Radar se tiep tuc doi song va thong bao khi co ket qua phu hop."
            )

        self._send_json({"status": "success", "response": response})

    def guess_type(self, path):
        if path.endswith(".ttf"):
            return "font/ttf"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"

    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ArtemisHandler)
    print(f"Artemis Starter Galaxy is listening on 0.0.0.0:{PORT}")
    server.serve_forever()
