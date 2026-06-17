import json
import mimetypes
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8080"))
STATE_FILE = ROOT / "artemis_state.json"
STATE_LOCK = threading.Lock()


def default_state():
    return {
        "radar": {"lostReports": [], "foundReports": [], "notifications": []},
        "market": {"marketItems": [], "pendingItems": []},
    }


def read_state():
    with STATE_LOCK:
        if not STATE_FILE.exists():
            return default_state()
        try:
            data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return default_state()

        state = default_state()
        radar = data.get("radar", {})
        market = data.get("market", {})
        state["radar"]["lostReports"] = radar.get("lostReports") if isinstance(radar.get("lostReports"), list) else []
        state["radar"]["foundReports"] = radar.get("foundReports") if isinstance(radar.get("foundReports"), list) else []
        state["radar"]["notifications"] = radar.get("notifications") if isinstance(radar.get("notifications"), list) else []
        state["market"]["marketItems"] = market.get("marketItems") if isinstance(market.get("marketItems"), list) else []
        state["market"]["pendingItems"] = market.get("pendingItems") if isinstance(market.get("pendingItems"), list) else []
        return state


def write_state(payload):
    state = default_state()
    radar = payload.get("radar", {}) if isinstance(payload.get("radar"), dict) else {}
    market = payload.get("market", {}) if isinstance(payload.get("market"), dict) else {}
    state["radar"]["lostReports"] = radar.get("lostReports") if isinstance(radar.get("lostReports"), list) else []
    state["radar"]["foundReports"] = radar.get("foundReports") if isinstance(radar.get("foundReports"), list) else []
    state["radar"]["notifications"] = radar.get("notifications") if isinstance(radar.get("notifications"), list) else []
    state["market"]["marketItems"] = market.get("marketItems") if isinstance(market.get("marketItems"), list) else []
    state["market"]["pendingItems"] = market.get("pendingItems") if isinstance(market.get("pendingItems"), list) else []

    with STATE_LOCK:
        STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    return state


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
        route = self.path.split("?", 1)[0]
        if route == "/health":
            self._send_json({"status": "ok", "service": "artemis-starter-galaxy"})
            return
        if route == "/api/state":
            self._send_json(read_state())
            return

        target = Path(self.translate_path(self.path))
        if not target.exists() or target.is_dir():
            self.path = "/index.html"

        return super().do_GET()

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        route = self.path.split("?", 1)[0]
        if route == "/api/state":
            payload = self._read_json_body()
            if payload is None:
                self._send_json({"status": "error", "error": "Invalid JSON"}, status=400)
                return
            self._send_json(write_state(payload))
            return

        if route != "/invocations":
            self.send_error(404, "Not found")
            return

        payload = self._read_json_body()
        if payload is None:
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
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-GreenNode-AgentBase-User-Id")

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            return json.loads(raw_body)
        except json.JSONDecodeError:
            return None


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ArtemisHandler)
    print(f"Artemis Starter Galaxy is listening on 0.0.0.0:{PORT}")
    server.serve_forever()
