from __future__ import annotations

from flask import Blueprint, jsonify, request, g

from services.jwt_service import require_auth
from services import resume_service


bp = Blueprint("resume", __name__)


@bp.get("/history")
@require_auth
def history():
    return jsonify(resume_service.list_history(g.user["sub"]))


@bp.get("/history/<resume_id>")
@require_auth
def history_item(resume_id: str):
    doc = resume_service.get_resume(g.user["sub"], resume_id)
    if not doc:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"latex": doc.get("latex", "")})


@bp.post("/generate")
@require_auth
def generate():
    data = request.get_json(silent=True) or {}
    template = data.get("template")
    jd = data.get("jd")
    return jsonify(resume_service.generate_resume(g.user["sub"], template=template, jd=jd))


@bp.post("/change")
@require_auth
def change():
    data = request.get_json(silent=True) or {}
    instruction = str(data.get("instruction") or "")
    latex = str(data.get("latex") or "")
    resume_id = data.get("resume_id")
    if not latex.strip():
        return jsonify({"error": "Missing latex"}), 400
    return jsonify(resume_service.apply_change(g.user["sub"], resume_id=resume_id, latex=latex, instruction=instruction))


@bp.delete("/history/<resume_id>")
@require_auth
def delete_resume(resume_id: str):
    deleted = resume_service.delete_resume(g.user["sub"], resume_id)
    if not deleted:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"ok": True})
