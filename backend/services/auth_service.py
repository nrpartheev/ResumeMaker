from __future__ import annotations

from datetime import datetime, timezone

from db import users


def upsert_google_user(profile: dict) -> dict:
    """
    Insert or update a user keyed by Google's stable `sub`. Returns the stored
    document. `created_at` is preserved across updates.
    """
    now = datetime.now(timezone.utc)
    sub = profile["sub"]
    update = {
        "$set": {
            "google_sub": sub,
            "email": profile.get("email"),
            "email_verified": profile.get("email_verified"),
            "name": profile.get("name"),
            "given_name": profile.get("given_name"),
            "family_name": profile.get("family_name"),
            "picture": profile.get("picture"),
            "locale": profile.get("locale"),
            "last_login_at": now,
        },
        "$setOnInsert": {
            "created_at": now,
            "profile": {},
        },
    }
    users().update_one({"google_sub": sub}, update, upsert=True)
    doc = users().find_one({"google_sub": sub})
    if not doc:
        raise RuntimeError("Failed to upsert user")
    return doc


def get_user(sub: str) -> dict | None:
    return users().find_one({"google_sub": sub})
