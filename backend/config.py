from __future__ import annotations

import os
import secrets

from dotenv import load_dotenv

load_dotenv()

# --------------------------------------------------------------------------- #
# OAuth + app URLs
# --------------------------------------------------------------------------- #

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5900")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:8080")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

REDIRECT_URI = f"{BACKEND_URL}/auth/google/callback"

# --------------------------------------------------------------------------- #
# JWT / Flask secrets
# --------------------------------------------------------------------------- #

# NOTE: If these rotate every server restart (random default), previously issued JWTs
# become invalid and the frontend can appear "logged in" but fail every API call.
# Use stable defaults for local dev; set real secrets in prod via env.
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-jwt-secret-change-me")
FLASK_SECRET = os.environ.get("FLASK_SECRET_KEY", "dev-flask-secret-change-me")

JWT_ALGORITHM = "HS256"
JWT_TTL_SECONDS = int(os.environ.get("JWT_TTL_SECONDS", str(60 * 60 * 24 * 7)))  # 7 days default

# --------------------------------------------------------------------------- #
# CORS
# --------------------------------------------------------------------------- #

def cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    origins: list[str] = []
    if raw:
        origins.extend([o.strip() for o in raw.split(",") if o.strip()])
    if FRONTEND_URL not in origins:
        origins.append(FRONTEND_URL)
    # common localhost alias
    if FRONTEND_URL.startswith("http://localhost:"):
        alt = FRONTEND_URL.replace("http://localhost:", "http://127.0.0.1:")
        if alt not in origins:
            origins.append(alt)
    return origins
