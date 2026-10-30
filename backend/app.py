"""
Résumé Lab — Flask backend (Google OAuth + JWT + MongoDB).

Auth flow:
  - Frontend links to GET /auth/google
  - Google redirects to GET /auth/google/callback
  - Backend mints JWT and redirects to {FRONTEND_URL}/auth/callback?token=...

Frontend expects (JWT Bearer):
  GET  /profile
  POST /profile
  POST /createprofile
  POST /profile/ai
  GET  /api/templates
  GET  /api/images/<name>
  GET  /history
  GET  /history/<id>
  POST /generate
  POST /change
"""

from __future__ import annotations

from flask import Flask
from flask_cors import CORS

import config
from db import init_indexes
from routes.auth_routes import bp as auth_bp
from routes.compile_routes import bp as compile_bp
from routes.health_routes import bp as health_bp
from routes.resume_routes import bp as resume_bp
from routes.template_routes import bp as template_bp
from routes.user_routes import bp as user_bp


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="/static")
    app.secret_key = config.FLASK_SECRET

    CORS(
        app,
        resources={r"/*": {"origins": config.cors_origins()}},
        supports_credentials=True,
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )

    try:
        init_indexes()
    except Exception as e:  # noqa: BLE001
        app.logger.warning("MongoDB index init failed: %s", e)

    app.register_blueprint(auth_bp)
    app.register_blueprint(compile_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(resume_bp)
    app.register_blueprint(template_bp)
    app.register_blueprint(health_bp)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5900, debug=True)
