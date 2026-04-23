from flask import Blueprint, request, jsonify
import os

from services.ai_service import generate_typst
from services.typst_service import compile_typst

resume_bp = Blueprint("resume", __name__)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


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
            typst_path = generate_typst(
                about_text,
                template_id, 
                jd
            )
            break 

        except Exception as e:
            last_exception = e

            # Retry only for 503 errors
            if "503" not in str(e):
                raise

            if attempt == MAX_RETRIES - 1:
                return jsonify({
                    "error": "AI service unavailable after 3 retries"
                }), 503

    with open(typst_path, "r", encoding="utf-8") as f:
        typst_code = f.read()

    return jsonify({
        "typst": typst_code
    })