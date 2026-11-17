import json, os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'transportpro.db'}")
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
TOKEN_HOURS = int(os.getenv("TOKEN_HOURS", "12"))
APP_VERSION = "3.1"   # bump -> phones load the new app.js / app.css

# Web Push keys: environment variables, or vapid.json (created automatically on first start)
VAPID_FILE = BASE_DIR / "vapid.json"


def _load_vapid():
    if os.getenv("VAPID_PUBLIC_KEY") and os.getenv("VAPID_PRIVATE_KEY"):
        return {"public": os.getenv("VAPID_PUBLIC_KEY"), "private": os.getenv("VAPID_PRIVATE_KEY"),
                "email": os.getenv("VAPID_EMAIL", "mailto:owner@example.com")}
    if VAPID_FILE.exists():
        return json.loads(VAPID_FILE.read_text())
    try:  # first run: create keys once
        import base64
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        k = ec.generate_private_key(ec.SECP256R1())
        b64 = lambda b: base64.urlsafe_b64encode(b).decode().rstrip("=")  # noqa: E731
        data = {"private": b64(k.private_numbers().private_value.to_bytes(32, "big")),
                "public": b64(k.public_key().public_bytes(serialization.Encoding.X962,
                                                          serialization.PublicFormat.UncompressedPoint)),
                "email": "mailto:owner@example.com"}
        VAPID_FILE.write_text(json.dumps(data, indent=2))
        return data
    except Exception:
        return {}


_v = _load_vapid()
VAPID_PUBLIC_KEY = _v.get("public", "")
VAPID_PRIVATE_KEY = _v.get("private", "")
VAPID_EMAIL = _v.get("email", "mailto:owner@example.com")
