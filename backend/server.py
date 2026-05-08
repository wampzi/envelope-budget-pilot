from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import sqlite3
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT_DIR = Path(__file__).resolve().parents[1]
DB_PATH = ROOT_DIR / "backend" / "budget_app.sqlite3"
PBKDF2_ITERATIONS = 210_000
SESSION_BYTES = 32

DEFAULT_PREFERENCES = {
    "theme": "light",
    "currency": "AED",
    "customCurrencies": [],
    "profile": {
        "name": "Guest budget",
        "email": "",
        "household": "Personal workspace",
    },
}

DEFAULT_ENVELOPES = [
    {"name": "Grocery", "group": "Regular", "planned": 1200, "keywords": ["grocery", "supermarket", "market", "carrefour", "lulu", "spinneys", "aldi"]},
    {"name": "Fuel", "group": "Regular", "planned": 550, "keywords": ["fuel", "petrol", "gas station", "adnoc", "enoc", "shell", "bp"]},
    {"name": "Rent", "group": "Regular", "planned": 4200, "keywords": ["rent", "landlord", "property", "apartment", "lease"]},
    {"name": "Education", "group": "Regular", "planned": 700, "keywords": ["school", "university", "tuition", "course", "books", "education"]},
    {"name": "Entertainment", "group": "Regular", "planned": 450, "keywords": ["cinema", "movie", "netflix", "spotify", "game", "restaurant", "cafe"]},
    {"name": "Utilities", "group": "Regular", "planned": 850, "keywords": ["electric", "water", "internet", "du", "etisalat", "utility", "phone"]},
    {"name": "Healthcare", "group": "Regular", "planned": 350, "keywords": ["clinic", "hospital", "pharmacy", "doctor", "medical"]},
    {"name": "Emergency Fund", "group": "More", "planned": 500, "target": 12000, "keywords": ["savings", "emergency", "transfer to savings"]},
    {"name": "Vacation", "group": "More", "planned": 300, "target": 6000, "keywords": ["hotel", "flight", "airline", "travel", "booking"]},
    {"name": "Debt Payoff", "group": "Debt", "planned": 900, "target": 18000, "keywords": ["loan", "credit card", "debt", "repayment", "finance"]},
    {"name": "Other", "group": "Regular", "planned": 250, "keywords": []},
]


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as connection:
        connection.executescript(
            """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                name TEXT NOT NULL,
                household TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_data (
                user_id INTEGER PRIMARY KEY,
                preferences_json TEXT NOT NULL,
                envelopes_json TEXT NOT NULL,
                transactions_json TEXT NOT NULL,
                monthly_income REAL NOT NULL DEFAULT 0,
                filled_amount REAL NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )


def hash_password(password: str, salt: bytes | None = None) -> tuple[str, str]:
    password_salt = salt or os.urandom(16)
    password_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), password_salt, PBKDF2_ITERATIONS)
    return base64.b64encode(password_salt).decode("ascii"), base64.b64encode(password_hash).decode("ascii")


def verify_password(password: str, salt_text: str, expected_hash: str) -> bool:
    salt = base64.b64decode(salt_text.encode("ascii"))
    _, password_hash = hash_password(password, salt)
    return hmac.compare_digest(password_hash, expected_hash)


def make_token() -> str:
    return secrets.token_urlsafe(SESSION_BYTES)


def json_dumps(value: object) -> str:
    return json.dumps(value, separators=(",", ":"))


def user_public(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "household": row["household"],
    }


def merge_profile(preferences: dict[str, object], user: sqlite3.Row) -> dict[str, object]:
    merged = {**DEFAULT_PREFERENCES, **preferences}
    profile = {**DEFAULT_PREFERENCES["profile"], **dict(merged.get("profile") or {})}
    profile["name"] = user["name"]
    profile["email"] = user["email"]
    profile["household"] = user["household"]
    merged["profile"] = profile
    return merged


def default_user_data(user: sqlite3.Row) -> dict[str, object]:
    return {
        "preferences": merge_profile(DEFAULT_PREFERENCES, user),
        "envelopes": DEFAULT_ENVELOPES,
        "transactions": [],
        "monthlyIncome": 0,
        "filledAmount": 0,
    }


def read_user_data(connection: sqlite3.Connection, user: sqlite3.Row) -> dict[str, object]:
    row = connection.execute("SELECT * FROM user_data WHERE user_id = ?", (user["id"],)).fetchone()
    if row is None:
        data = default_user_data(user)
        connection.execute(
            """
            INSERT INTO user_data (user_id, preferences_json, envelopes_json, transactions_json, monthly_income, filled_amount)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                json_dumps(data["preferences"]),
                json_dumps(data["envelopes"]),
                json_dumps(data["transactions"]),
                data["monthlyIncome"],
                data["filledAmount"],
            ),
        )
        return data

    preferences = json.loads(row["preferences_json"])
    return {
        "preferences": merge_profile(preferences, user),
        "envelopes": json.loads(row["envelopes_json"]),
        "transactions": json.loads(row["transactions_json"]),
        "monthlyIncome": row["monthly_income"],
        "filledAmount": row["filled_amount"],
    }


def clamp_text(value: object, fallback: str, max_length: int = 160) -> str:
    text = str(value or "").strip()
    return (text or fallback)[:max_length]


def normalize_data(payload: dict[str, object], user: sqlite3.Row) -> dict[str, object]:
    preferences = payload.get("preferences") if isinstance(payload.get("preferences"), dict) else DEFAULT_PREFERENCES
    preferences = merge_profile(preferences, user)
    envelopes = payload.get("envelopes") if isinstance(payload.get("envelopes"), list) else DEFAULT_ENVELOPES
    transactions = payload.get("transactions") if isinstance(payload.get("transactions"), list) else []
    return {
        "preferences": preferences,
        "envelopes": envelopes,
        "transactions": transactions,
        "monthlyIncome": float(payload.get("monthlyIncome") or 0),
        "filledAmount": float(payload.get("filledAmount") or 0),
    }


def auth_user(headers) -> sqlite3.Row | None:
    auth_header = headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.removeprefix("Bearer ").strip()
    with connect() as connection:
        return connection.execute(
            """
            SELECT users.* FROM users
            JOIN sessions ON sessions.user_id = users.id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()


class BudgetHandler(BaseHTTPRequestHandler):
    server_version = "EnvelopeBudgetBackend/1.0"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json({"ok": True})
            return
        if path == "/api/me":
            self.handle_me()
            return
        self.serve_static(path)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/register":
            self.handle_register()
            return
        if path == "/api/login":
            self.handle_login()
            return
        if path == "/api/logout":
            self.handle_logout()
            return
        self.send_error_json(HTTPStatus.NOT_FOUND, "Endpoint not found")

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/data":
            self.handle_save_data()
            return
        self.send_error_json(HTTPStatus.NOT_FOUND, "Endpoint not found")

    def read_json(self) -> dict[str, object]:
        content_length = int(self.headers.get("Content-Length", "0") or 0)
        if not content_length:
            return {}
        raw_body = self.rfile.read(content_length).decode("utf-8")
        return json.loads(raw_body or "{}")

    def send_json(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_error_json(self, status: HTTPStatus, message: str) -> None:
        self.send_json({"error": message}, status)

    def current_user_or_error(self) -> sqlite3.Row | None:
        user = auth_user(self.headers)
        if user is None:
            self.send_error_json(HTTPStatus.UNAUTHORIZED, "Please log in first")
        return user

    def build_session_response(self, connection: sqlite3.Connection, user: sqlite3.Row) -> dict[str, object]:
        token = make_token()
        connection.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user["id"]))
        return {"token": token, "user": user_public(user), "data": read_user_data(connection, user)}

    def handle_register(self) -> None:
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return

        email = str(payload.get("email") or "").strip().lower()
        password = str(payload.get("password") or "")
        name = clamp_text(payload.get("name"), "Budget user")
        household = clamp_text(payload.get("household"), "Personal workspace")

        if "@" not in email or len(password) < 8:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Use a valid email and a password with at least 8 characters")
            return

        salt, password_hash = hash_password(password)
        try:
            with connect() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO users (email, name, household, password_salt, password_hash)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (email, name, household, salt, password_hash),
                )
                user = connection.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
                self.send_json(self.build_session_response(connection, user), HTTPStatus.CREATED)
        except sqlite3.IntegrityError:
            self.send_error_json(HTTPStatus.CONFLICT, "An account with this email already exists")

    def handle_login(self) -> None:
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return

        email = str(payload.get("email") or "").strip().lower()
        password = str(payload.get("password") or "")
        with connect() as connection:
            user = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if user is None or not verify_password(password, user["password_salt"], user["password_hash"]):
                self.send_error_json(HTTPStatus.UNAUTHORIZED, "Invalid email or password")
                return
            self.send_json(self.build_session_response(connection, user))

    def handle_logout(self) -> None:
        auth_header = self.headers.get("Authorization", "")
        token = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""
        if token:
            with connect() as connection:
                connection.execute("DELETE FROM sessions WHERE token = ?", (token,))
        self.send_json({"ok": True})

    def handle_me(self) -> None:
        user = self.current_user_or_error()
        if user is None:
            return
        with connect() as connection:
            self.send_json({"user": user_public(user), "data": read_user_data(connection, user)})

    def handle_save_data(self) -> None:
        user = self.current_user_or_error()
        if user is None:
            return
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return

        data = normalize_data(payload, user)
        with connect() as connection:
            connection.execute(
                """
                UPDATE users SET name = ?, household = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
                """,
                (
                    data["preferences"]["profile"]["name"],
                    data["preferences"]["profile"]["household"],
                    user["id"],
                ),
            )
            connection.execute(
                """
                INSERT INTO user_data (user_id, preferences_json, envelopes_json, transactions_json, monthly_income, filled_amount, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    preferences_json = excluded.preferences_json,
                    envelopes_json = excluded.envelopes_json,
                    transactions_json = excluded.transactions_json,
                    monthly_income = excluded.monthly_income,
                    filled_amount = excluded.filled_amount,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    user["id"],
                    json_dumps(data["preferences"]),
                    json_dumps(data["envelopes"]),
                    json_dumps(data["transactions"]),
                    data["monthlyIncome"],
                    data["filledAmount"],
                ),
            )
        self.send_json({"ok": True})

    def serve_static(self, path: str) -> None:
        requested = "/index.html" if path in ("", "/") else unquote(path)
        file_path = (ROOT_DIR / requested.lstrip("/")).resolve()
        if ROOT_DIR not in file_path.parents and file_path != ROOT_DIR:
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args) -> None:
        print(f"{self.address_string()} - {format % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Envelope Budget Pilot backend")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    args = parser.parse_args()

    init_db()
    server = ThreadingHTTPServer((args.host, args.port), BudgetHandler)
    print(f"Envelope Budget Pilot backend running at http://{args.host}:{args.port}")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
