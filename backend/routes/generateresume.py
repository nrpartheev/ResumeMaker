from flask import Blueprint, request, jsonify
import os

from services.ai_service import generate_typst, change_typst
from services.typst_service import compile_typst

resume_bp = Blueprint("resume", __name__)


MAX_RETRIES = 3


@resume_bp.route("/api/generate", methods=["POST"])
def generate_resume():
    data = request.get_json()

    about_text = data.get("about")
    template_id = data.get("templateId")

    jd = data.get("jd")

    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            typst_output = generate_typst(
                about_text,
                template_id,
                jd,
            )
            break
        except RuntimeError as e:
            # Typst validation/fix loop exhausted. This is a user-facing 422, not a server crash.
            return jsonify({
                "error": "Failed to generate a valid Typst resume.",
                "details": str(e),
            }), 422
        except Exception as e:
            last_exception = e

            # Retry only for 503 errors
            if "503" not in str(e):
                raise

            if attempt == MAX_RETRIES - 1:
                return jsonify({
                    "error": "AI service unavailable after 3 retries"
                }), 503


    return jsonify({
        "typst": typst_output
    })


@resume_bp.route("/api/change", methods=["POST"])
def change_resume():
    data = request.get_json()

    change = data.get("prompt")
    typst = data.get("typst")

    for attempt in range(MAX_RETRIES):
        try:
            typst_output = change_typst(
                change,
                typst,
            )
            break
        except RuntimeError as e:
            return jsonify({
                "error": "Failed to generate a valid Typst resume.",
                "details": str(e),
            }), 422
        except Exception as e:
            last_exception = e

            # Retry only for 503 errors
            if "503" not in str(e):
                raise

            if attempt == MAX_RETRIES - 1:
                return jsonify({
                    "error": "AI service unavailable after 3 retries"
                }), 503


    return jsonify({
        "typst": typst_output
    })
