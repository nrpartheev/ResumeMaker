from __future__ import annotations

from flask import Blueprint, jsonify, request, g

from services.jwt_service import require_auth
from services.auth_service import get_user
from services import profile_service


bp = Blueprint("user", __name__)


# Get User details
@bp.get("/me")
@require_auth
def me():
    doc = get_user(g.user["sub"])
    if not doc:
        return jsonify({"error": "User not found"}), 404
    return jsonify(
        {
            "id": doc["google_sub"],
            "email": doc.get("email"),
            "name": doc.get("name"),
            "picture": doc.get("picture"),
            "has_profile": bool(doc.get("profile")),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        }
    )


# Profile Details
@bp.get("/profile")
@require_auth
def get_profile():
    return jsonify(profile_service.get_profile(g.user["sub"]))


# update with the help of AI
@bp.post("/updateprofile")
@require_auth
def profile_ai():
    user_id = g.user["sub"]
    profile = profile_service.get_profile(user_id)
    data = request.get_json(silent=True) or {}
    changes = str(data.get("instruction") or "")

    updated = profile_service.apply_ai_profile_edit(changes, profile)
    profile_service.save_profile(user_id, updated)

    return jsonify(updated["structured_data"])


# Path to create profile for newly registered users
@bp.post("/createprofile")
@require_auth
def create_profile():
    user_id = g.user["sub"]
    raw_text = None

    if request.content_type and request.content_type.startswith("multipart/form-data"):
        f = request.files.get("resume")
        if not f:
            return jsonify({
                "error": "Missing file field 'resume'"
            }), 400
        try:
            raw_text = profile_service.extract_text_from_file(f)

        except Exception as e:
            return jsonify({
                "error": "Failed to read uploaded file",
                "details": str(e)
            }), 400

    else:

        data = request.get_json(silent=True) or {}
        summary = str(data.get("summary") or "").strip()

        if len(summary) < 5:
            return jsonify({
                "error": "Summary too short"
            }), 400

        raw_text = summary

    # AI structuring the data into proper json
    structured = profile_service.structure_resume_data(raw_text)

    print(structured)
    if structured["is_resume"]:
        # MongoDB updates for profile 
        profile_service.save_profile(user_id, structured["structured_data"])

        return jsonify({
            "success": True,
            "profile": structured["structured_data"]
        })
    
    else:
        
        return jsonify({
            "success":False
        })