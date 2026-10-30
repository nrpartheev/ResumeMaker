from __future__ import annotations

from flask import Blueprint, jsonify

from db import users


bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    try:
        users().database.command("ping")
        return jsonify({"ok": True, "db": "up"})
    except Exception as e:  # noqa: BLE001
        return jsonify({"ok": False, "db": "down", "error": str(e)}), 500
