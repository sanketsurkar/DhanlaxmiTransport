"""Password hashing + signed tokens using only the Python standard library."""
import base64, hashlib, hmac, json, os, time
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.config import SECRET_KEY, TOKEN_HOURS
from app.database import get_db
from app.models import User, Role

ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, hash_hex = stored.split("$")
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), ITERATIONS)
    return hmac.compare_digest(dk.hex(), hash_hex)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sign(payload: str) -> str:
    return _b64(hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest())


def create_token(user: User) -> str:
    payload = _b64(json.dumps({"uid": user.id, "role": user.role,
                               "exp": int(time.time()) + TOKEN_HOURS * 3600}).encode())
    return f"{payload}.{_sign(payload)}"


def decode_token(token: str) -> dict:
    try:
        payload, sig = token.split(".")
        if not hmac.compare_digest(sig, _sign(payload)):
            raise ValueError
        data = json.loads(_unb64(payload))
        if data["exp"] < time.time():
            raise ValueError
        return data
    except Exception:
        raise HTTPException(401, "Session expired. Please login again.")


def get_current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not logged in")
    data = decode_token(authorization[7:])
    user = db.get(User, data["uid"])
    if not user or not user.is_active:
        raise HTTPException(401, "Account disabled or not found")
    return user


def require_roles(*roles):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "You are not allowed to do this")
        return user
    return checker


staff_only = require_roles(*Role.STAFF)
driver_only = require_roles(Role.DRIVER)
