from flask import Blueprint, request, jsonify

from services.text_extraction import (
    extract_text_from_file
)

from services.ai_service import (
    structure_resume_data
)

extract_bp = Blueprint(
    "extract",
    __name__
)


@extract_bp.route(
    "/api/extract-text",
    methods=["POST"]
)
def extract_text_endpoint():

    if "file" not in request.files:

        return jsonify({
            "error": "No file uploaded"
        }), 400


    file = request.files["file"]

    if file.filename == "":

        return jsonify({
            "error": "Empty filename"
        }), 400


    try:

        # Step 1 — Extract raw text
        raw_text = extract_text_from_file(
            file
        )

        if not raw_text.strip():

            return jsonify({
                "is_resume": False,
                "structured_data": {},
                "warnings": [
                    "No readable text found"
                ]
            })


        # Step 2 — Send to AI
        ai_result = structure_resume_data(
            raw_text
        )   

        print(ai_result)


        return jsonify(
            ai_result
        )


    except Exception as e:

        return jsonify({
            "is_resume": False,
            "structured_data": {},
            "warnings": [
                str(e)
            ]
        }), 500