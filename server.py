import json
import hashlib
import mimetypes
import os
import secrets
import sqlite3
import threading
import unicodedata
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8080"))
DB_PATH = Path(os.environ.get("ARTEMIS_DB", ROOT / ".artemis-data" / "artemis.db"))
DB_LOCK = threading.Lock()


class ClosingConnection(sqlite3.Connection):
    def __exit__(self, exc_type, exc_value, traceback):
        result = super().__exit__(exc_type, exc_value, traceback)
        self.close()
        return result


def default_state():
    return {
        "radar": {"lostReports": [], "foundReports": [], "notifications": []},
        "market": {"marketItems": [], "pendingItems": []},
    }


def get_connection():
    connection = sqlite3.connect(DB_PATH, factory=ClosingConnection)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DB_LOCK, get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS lost_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT,
                description TEXT,
                category TEXT,
                date TEXT,
                location TEXT,
                image TEXT,
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS found_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact TEXT,
                description TEXT,
                category TEXT,
                date TEXT,
                location TEXT,
                image TEXT,
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS marketplace_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                description TEXT,
                category TEXT,
                price TEXT,
                contact TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS match_suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT,
                item_type TEXT,
                matched_item_id TEXT,
                matched_item_type TEXT,
                score REAL,
                level TEXT,
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS admin_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER,
                action TEXT NOT NULL,
                actor TEXT,
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipient_domain TEXT,
                type TEXT,
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )


def json_dumps(payload):
    return json.dumps(payload, ensure_ascii=False)


def json_loads(value, fallback=None):
    try:
        return json.loads(value) if value else fallback
    except json.JSONDecodeError:
        return fallback


def with_id(row):
    payload = json_loads(row["payload"], {}) or {}
    payload["id"] = payload.get("id") or str(row["id"])
    return payload


def hash_password(password, salt):
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def login_user(domain, password):
    domain = normalize(domain).strip()
    password = str(password or "")
    if not domain or not password:
        return {"ok": False, "error": "Bạn nhập domain và mật khẩu giúp mình nhé."}

    with DB_LOCK, get_connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE domain = ?", (domain,)).fetchone()
        if row:
            if hash_password(password, row["salt"]) != row["password_hash"]:
                return {"ok": False, "error": "Mật khẩu chưa đúng với domain này."}
            return {"ok": True, "domain": domain}

        salt = secrets.token_hex(16)
        connection.execute(
            "INSERT INTO users (domain, password_hash, salt) VALUES (?, ?, ?)",
            (domain, hash_password(password, salt), salt),
        )
    return {"ok": True, "domain": domain, "created": True}


def list_lost_items():
    with DB_LOCK, get_connection() as connection:
        rows = connection.execute("SELECT * FROM lost_items ORDER BY id DESC").fetchall()
    return [with_id(row) for row in rows]


def list_found_items():
    with DB_LOCK, get_connection() as connection:
        rows = connection.execute("SELECT * FROM found_items ORDER BY id DESC").fetchall()
    return [with_id(row) for row in rows]


def list_marketplace_items(status=None):
    status = status or "approved"
    with DB_LOCK, get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM marketplace_items WHERE status = ? ORDER BY id DESC",
            (status,),
        ).fetchall()
    return [with_id(row) for row in rows]


def list_notifications():
    with DB_LOCK, get_connection() as connection:
        rows = connection.execute("SELECT * FROM notifications ORDER BY id DESC").fetchall()
    return [with_id(row) for row in rows]


def insert_lost_item(item):
    payload = dict(item)
    with DB_LOCK, get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO lost_items (domain, description, category, date, location, image, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
            """,
            (
                payload.get("domain", ""),
                payload.get("description", ""),
                payload.get("category", ""),
                payload.get("date", ""),
                payload.get("location", ""),
                payload.get("image", ""),
                json_dumps(payload),
                payload.get("createdAt"),
            ),
        )
        item_id = cursor.lastrowid
        payload["id"] = str(item_id)
        connection.execute("UPDATE lost_items SET payload = ? WHERE id = ?", (json_dumps(payload), item_id))
    create_match_suggestions(str(item_id), "lost")
    return payload


def insert_found_item(item):
    payload = dict(item)
    with DB_LOCK, get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO found_items (contact, description, category, date, location, image, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
            """,
            (
                payload.get("contact", ""),
                payload.get("description", ""),
                payload.get("category", ""),
                payload.get("date", ""),
                payload.get("location", ""),
                payload.get("image", ""),
                json_dumps(payload),
                payload.get("createdAt"),
            ),
        )
        item_id = cursor.lastrowid
        payload["id"] = str(item_id)
        connection.execute("UPDATE found_items SET payload = ? WHERE id = ?", (json_dumps(payload), item_id))
    create_match_suggestions(str(item_id), "found")
    return payload


def insert_marketplace_item(item, status="pending"):
    payload = dict(item)
    status_text = normalize(payload.get("status", ""))
    owner_domain = normalize(payload.get("ownerDomain", "") or payload.get("contact", ""))
    if payload.get("_autoApproved") or status_text in {"da duyet", "approved"} or owner_domain == "artemis_8920":
        status = "approved"
        payload["status"] = "Đã duyệt"
        payload["hidden"] = False
    payload["status"] = payload.get("status") or ("Chờ Artemis duyệt" if status == "pending" else "Đã duyệt")
    with DB_LOCK, get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO marketplace_items (name, description, category, price, contact, status, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
            """,
            (
                payload.get("name", ""),
                payload.get("description", ""),
                payload.get("category", ""),
                payload.get("price", ""),
                payload.get("contact", ""),
                status,
                json_dumps(payload),
                payload.get("createdAt"),
            ),
        )
        item_id = cursor.lastrowid
        payload["id"] = str(item_id)
        connection.execute("UPDATE marketplace_items SET payload = ? WHERE id = ?", (json_dumps(payload), item_id))
    return payload


def update_marketplace_item(item_id, updates):
    with DB_LOCK, get_connection() as connection:
        row = connection.execute("SELECT * FROM marketplace_items WHERE id = ?", (item_id,)).fetchone()
        if not row:
            return None
        payload = with_id(row)
        payload.update(updates)
        status = row["status"]
        status_text = normalize(payload.get("status", ""))
        if status_text in {"da duyet", "approved"}:
            status = "approved"
        elif status_text in {"cho artemis duyet", "pending"}:
            status = "pending"
        connection.execute(
            """
            UPDATE marketplace_items
               SET name = ?, description = ?, category = ?, price = ?, contact = ?,
                   status = ?, payload = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
            """,
            (
                payload.get("name", ""),
                payload.get("description", ""),
                payload.get("category", ""),
                payload.get("price", ""),
                payload.get("contact", ""),
                status,
                json_dumps(payload),
                item_id,
            ),
        )
    return payload


def admin_marketplace_action(item_id, action, actor="", updates=None):
    updates = updates or {}
    with DB_LOCK, get_connection() as connection:
        row = connection.execute("SELECT * FROM marketplace_items WHERE id = ?", (item_id,)).fetchone()
        if not row:
            return None
        payload = with_id(row)
        status = row["status"]
        if action == "approve":
            status = "approved"
            payload["status"] = "Đã duyệt"
            payload["hidden"] = False
        elif action == "reject":
            status = "rejected"
            payload["status"] = "Từ chối"
        payload.update(updates)
        connection.execute(
            """
            UPDATE marketplace_items
               SET status = ?, payload = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
            """,
            (status, json_dumps(payload), item_id),
        )
        connection.execute(
            "INSERT INTO admin_actions (item_id, action, actor, payload) VALUES (?, ?, ?, ?)",
            (item_id, action, actor, json_dumps({"item": payload, "updates": updates})),
        )
    return payload


def upsert_notification(note):
    payload = dict(note)
    with DB_LOCK, get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO notifications (recipient_domain, type, payload, created_at, updated_at)
            VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
            """,
            (
                payload.get("recipientDomain", ""),
                payload.get("type", "radar"),
                json_dumps(payload),
                payload.get("createdAt"),
            ),
        )
        note_id = cursor.lastrowid
        payload["id"] = payload.get("id") or f"note-{note_id}"
        connection.execute("UPDATE notifications SET payload = ? WHERE id = ?", (json_dumps(payload), note_id))
    return payload


def replace_notifications(notifications):
    with DB_LOCK, get_connection() as connection:
        connection.execute("DELETE FROM notifications")
    for note in notifications:
        upsert_notification(note)


def tokenize(value):
    stopwords = {
        "minh",
        "mình",
        "bi",
        "bị",
        "mat",
        "mất",
        "nhat",
        "nhặt",
        "duoc",
        "được",
        "do",
        "đồ",
        "mon",
        "món",
        "cai",
        "cái",
        "co",
        "có",
        "o",
        "ở",
        "tai",
        "tại",
        "vao",
        "vào",
        "ngay",
        "ngày",
    }
    normalized = normalize(value)
    return [token for token in normalized.replace("_", " ").split() if len(token) > 1 and token not in stopwords]


def normalize(value):
    source = str(value or "").lower().replace("đ", "d")
    normalized = unicodedata.normalize("NFD", source)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def score_text(source, target):
    source_tokens = set(tokenize(source))
    target_tokens = set(tokenize(target))
    return len(source_tokens & target_tokens)


def date_digits(value):
    return "".join(char for char in str(value or "") if char.isdigit())


def score_match(source, candidate):
    score = score_text(source.get("description", ""), candidate.get("description", ""))
    haystack = normalize(f"{source.get('description', '')} {source.get('location', '')} {source.get('category', '')}")
    candidate_haystack = normalize(
        f"{candidate.get('description', '')} {candidate.get('location', '')} {candidate.get('category', '')}"
    )
    if source.get("category") and source.get("category") == candidate.get("category"):
        score += 1
    if source.get("location") and source.get("location") in candidate_haystack:
        score += 1
    if candidate.get("location") and candidate.get("location") in haystack:
        score += 1
    same_date = bool(source.get("date") and candidate.get("date") and date_digits(source.get("date")) == date_digits(candidate.get("date")))
    if same_date:
        score += 1
    level = "strong" if score >= 3 and same_date else "near" if score >= 2 else "none"
    return score, level


def create_match_suggestions(item_id, item_type):
    state = read_state()
    source_list = state["radar"]["lostReports"] if item_type == "lost" else state["radar"]["foundReports"]
    candidate_list = state["radar"]["foundReports"] if item_type == "lost" else state["radar"]["lostReports"]
    source = next((item for item in source_list if str(item.get("id")) == str(item_id)), None)
    if not source:
        return []

    suggestions = []
    for candidate in candidate_list:
        if source.get("domain") and source.get("domain") == candidate.get("contact"):
            continue
        score, level = score_match(source, candidate)
        if level == "none":
            continue
        suggestion = {
            "itemId": str(item_id),
            "itemType": item_type,
            "matchedItemId": str(candidate.get("id", "")),
            "matchedItemType": "found" if item_type == "lost" else "lost",
            "score": score,
            "level": level,
            "item": source,
            "match": candidate,
        }
        suggestions.append(suggestion)

    with DB_LOCK, get_connection() as connection:
        connection.execute("DELETE FROM match_suggestions WHERE item_id = ? AND item_type = ?", (str(item_id), item_type))
        for suggestion in suggestions:
            connection.execute(
                """
                INSERT INTO match_suggestions
                    (item_id, item_type, matched_item_id, matched_item_type, score, level, payload)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    suggestion["itemId"],
                    suggestion["itemType"],
                    suggestion["matchedItemId"],
                    suggestion["matchedItemType"],
                    suggestion["score"],
                    suggestion["level"],
                    json_dumps(suggestion),
                ),
            )
    return suggestions


def list_match_suggestions(item_id):
    with DB_LOCK, get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM match_suggestions WHERE item_id = ? ORDER BY score DESC, id DESC",
            (str(item_id),),
        ).fetchall()
    return [json_loads(row["payload"], {}) for row in rows]


def read_state():
    state = default_state()
    state["radar"]["lostReports"] = list_lost_items()
    state["radar"]["foundReports"] = list_found_items()
    state["radar"]["notifications"] = list_notifications()
    state["market"]["marketItems"] = list_marketplace_items("approved")
    state["market"]["pendingItems"] = list_marketplace_items("pending")
    return state


def import_state(payload):
    radar = payload.get("radar", {}) if isinstance(payload.get("radar"), dict) else {}
    market = payload.get("market", {}) if isinstance(payload.get("market"), dict) else {}

    with DB_LOCK, get_connection() as connection:
        connection.execute("DELETE FROM lost_items")
        connection.execute("DELETE FROM found_items")
        connection.execute("DELETE FROM marketplace_items")
        connection.execute("DELETE FROM match_suggestions")
        connection.execute("DELETE FROM admin_actions")
        connection.execute("DELETE FROM notifications")

    for item in radar.get("lostReports", []) if isinstance(radar.get("lostReports"), list) else []:
        insert_lost_item(item)
    for item in radar.get("foundReports", []) if isinstance(radar.get("foundReports"), list) else []:
        insert_found_item(item)
    for note in radar.get("notifications", []) if isinstance(radar.get("notifications"), list) else []:
        upsert_notification(note)
    for item in market.get("marketItems", []) if isinstance(market.get("marketItems"), list) else []:
        insert_marketplace_item(item, "approved")
    for item in market.get("pendingItems", []) if isinstance(market.get("pendingItems"), list) else []:
        insert_marketplace_item(item, "pending")
    return read_state()


class ArtemisHandler(SimpleHTTPRequestHandler):
    server_version = "ArtemisStarterGalaxy/2.0"

    def translate_path(self, path):
        clean_path = unquote(path.split("?", 1)[0].split("#", 1)[0])
        if clean_path in ("", "/"):
            clean_path = "/index.html"

        requested = (ROOT / clean_path.lstrip("/")).resolve()
        if ROOT not in requested.parents and requested != ROOT:
            return str(ROOT / "index.html")
        return str(requested)

    def do_GET(self):
        parsed = urlparse(self.path)
        route = parsed.path
        query = parse_qs(parsed.query)

        if route == "/health":
            self._send_json({"status": "ok", "service": "artemis-starter-galaxy"})
            return
        if route == "/api/state":
            self._send_json(read_state())
            return
        if route == "/api/lost-items":
            self._send_json({"items": list_lost_items()})
            return
        if route == "/api/found-items":
            self._send_json({"items": list_found_items()})
            return
        if route == "/api/marketplace-items":
            self._send_json({"items": list_marketplace_items(query.get("status", ["approved"])[0])})
            return
        if route == "/api/admin/marketplace-items":
            self._send_json({"items": list_marketplace_items(query.get("status", ["pending"])[0])})
            return
        if route.startswith("/api/matches/"):
            self._send_json({"items": list_match_suggestions(route.rsplit("/", 1)[-1])})
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
        route = urlparse(self.path).path
        if route == "/api/state":
            self._send_json({"status": "error", "error": "State import is disabled"}, status=405)
            return

        payload = self._read_json_body()
        if payload is None:
            self._send_json({"status": "error", "error": "Invalid JSON"}, status=400)
            return
        if route == "/api/auth/login":
            result = login_user(payload.get("domain", ""), payload.get("password", ""))
            self._send_json(result, status=200 if result.get("ok") else 401)
            return
        if route == "/api/lost-items":
            self._send_json(insert_lost_item(payload), status=201)
            return
        if route == "/api/found-items":
            self._send_json(insert_found_item(payload), status=201)
            return
        if route == "/api/marketplace-items":
            self._send_json(insert_marketplace_item(payload, "pending"), status=201)
            return
        if route == "/api/notifications":
            self._send_json(upsert_notification(payload), status=201)
            return

        if route != "/invocations":
            self.send_error(404, "Not found")
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

    def do_PATCH(self):
        route = urlparse(self.path).path
        payload = self._read_json_body()
        if payload is None:
            self._send_json({"status": "error", "error": "Invalid JSON"}, status=400)
            return

        if route.startswith("/api/marketplace-items/"):
            item_id = route.rsplit("/", 1)[-1]
            item = update_marketplace_item(item_id, payload)
            if not item:
                self._send_json({"status": "error", "error": "Not found"}, status=404)
                return
            self._send_json(item)
            return

        if route.startswith("/api/admin/marketplace-items/"):
            parts = route.strip("/").split("/")
            if len(parts) == 5 and parts[-1] in {"approve", "reject"}:
                item = admin_marketplace_action(parts[-2], parts[-1], payload.get("actor", ""), payload.get("updates", {}))
                if not item:
                    self._send_json({"status": "error", "error": "Not found"}, status=404)
                    return
                self._send_json(item)
                return

        self.send_error(404, "Not found")

    def guess_type(self, path):
        if path.endswith(".ttf"):
            return "font/ttf"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"

    def _send_json(self, payload, status=200):
        body = json_dumps(payload).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-GreenNode-AgentBase-User-Id")

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            return json.loads(raw_body)
        except json.JSONDecodeError:
            return None


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ArtemisHandler)
    print(f"Artemis Starter Galaxy is listening on 0.0.0.0:{PORT}")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()
