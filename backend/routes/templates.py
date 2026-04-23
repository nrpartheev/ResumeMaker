from flask import Blueprint, jsonify
import json

template_bp = Blueprint("templates", __name__)

@template_bp.route("/api/templates")
def get_templates():

    with open("templates/catalog.json") as f:
        data = json.load(f)

    return jsonify(data)