from __future__ import annotations

import json
from pathlib import Path

from flask import Blueprint, jsonify, send_from_directory, abort

from services.jwt_service import require_auth


bp = Blueprint("templates", __name__, url_prefix="/api")


BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_IMAGES_DIR = BASE_DIR / "static" / "images"

TEMPLATE_JSON = TEMPLATES_DIR / "template.json"


def load_templates():
    if not TEMPLATE_JSON.exists():
        return []

    with open(TEMPLATE_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


@bp.get("/templates")
@require_auth
def list_templates():
    raw_templates = load_templates()

    # Format for frontend
    formatted = []

    for t in raw_templates:
        formatted.append({
            "name": t["name"],
            "image": t['image'],
            "file": t["file"]
        })

    return jsonify(formatted)


@bp.get("/images/<filename>")
def template_image(filename: str):
    file_path = STATIC_IMAGES_DIR / filename
    print(file_path)

    if not file_path.exists():
        abort(404)

    return send_from_directory(
        STATIC_IMAGES_DIR,
        filename
    )