from flask import Flask
from flask_cors import CORS

from routes.generateresume import resume_bp
from routes.templates import template_bp
from routes.extract import extract_bp

app = Flask(__name__)

# ✅ MUST come AFTER app creation
CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": [
                '*'
            ]
        }
    }
)

# Register blueprints AFTER CORS
app.register_blueprint(resume_bp)
app.register_blueprint(template_bp)
app.register_blueprint(extract_bp)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=9000,
        debug=True
    )