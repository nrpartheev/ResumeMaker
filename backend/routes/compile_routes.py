from __future__ import annotations

from flask import Blueprint, Response, jsonify, request

from services.jwt_service import require_auth
from services.compile_service import CompileError, compile_latex


bp = Blueprint("compile", __name__)


@bp.post("/compile")
@require_auth
def compile_route() -> Response:
    """Compile a LaTeX document server-side and return the resulting PDF.

    Request body (JSON):
        { "latex": "<full latex source>" }

    Success response:
        200 application/pdf  — raw PDF bytes

    Error responses:
        400  missing / empty latex field
        422  pdflatex returned a non-zero exit code (body includes the log)
        500  unexpected server error
    """
    data = request.get_json(silent=True) or {}
    latex: str = str(data.get("latex") or "").strip()

    if not latex:
        return jsonify({"error": "Missing 'latex' field"}), 400

    try:
        pdf_bytes = compile_latex(latex)
    except CompileError as exc:
        return jsonify({"error": "LaTeX compilation failed", "log": exc.log}), 422
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Server error: {exc}"}), 500

    return Response(
        pdf_bytes,
        status=200,
        mimetype="application/pdf",
        headers={"Content-Disposition": "inline; filename=resume.pdf"},
    )
