"""
MongoDB connection helper.

The connection URI keeps the password as a ${MONGODB_PASSWORD} placeholder so we
never commit secrets. We substitute it at runtime, URL-encoding it so special
characters in the password don't break the URI.
"""
from __future__ import annotations

import os
from urllib.parse import quote_plus

from pymongo import MongoClient, ASCENDING
from pymongo.collection import Collection
from pymongo.database import Database


_DEFAULT_URI = (
    "mongodb+srv://nrpokemon1234:${MONGODB_PASSWORD}"
    "@cluster0.fy4cjcr.mongodb.net/?appName=Cluster0"
)


def _build_uri() -> str:
    uri = os.environ.get("MONGODB_URI", _DEFAULT_URI)
    pwd = os.environ.get("MONGODB_PASSWORD")
    if "${MONGODB_PASSWORD}" in uri:
        if not pwd:
            raise RuntimeError(
                "MONGODB_PASSWORD is not set. Add it to your .env file."
            )
        uri = uri.replace("${MONGODB_PASSWORD}", quote_plus(pwd))
    return uri


_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(_build_uri(), serverSelectionTimeoutMS=10_000)
    return _client


def get_db() -> Database:
    name = os.environ.get("MONGODB_DB", "resume_lab")
    return get_client()[name]


def users() -> Collection:
    return get_db()["users"]

def resumes() -> Collection:
    return get_db()["resumes"]


def init_indexes() -> None:
    """Create indexes once at startup. Safe to call repeatedly."""
    users().create_index([("google_sub", ASCENDING)], unique=True)
    users().create_index([("email", ASCENDING)])
    resumes().create_index([("user_sub", ASCENDING), ("resume_id", ASCENDING)], unique=True)
    resumes().create_index([("user_sub", ASCENDING), ("updated_at", ASCENDING)])
