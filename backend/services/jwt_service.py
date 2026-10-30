from __future__ import annotations

import time
from functools import wraps

import jwt  # PyJWT
from flask import jsonify, request, g

import config


def mint_jwt(user_doc: dict) -> str:
    now = int(time.time())
    payload = {
        "sub": user_doc["google_sub"],
        "email": user_doc.get("email"),
        "name": user_doc.get("name"),
        "picture": user_doc.get("picture"),
        "iat": now,
        "exp": now + config.JWT_TTL_SECONDS,
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401
        token = auth_header.removeprefix("Bearer ").strip()
        try:
            g.user = decode_jwt(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.PyJWTError as e:
            return jsonify({"error": f"Invalid token: {e}"}), 401
        return fn(*args, **kwargs)

    return wrapper
